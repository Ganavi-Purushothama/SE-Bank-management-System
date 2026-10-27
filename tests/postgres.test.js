import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  testDatabase,
  fixture,
  adminPassword,
  customerPassword,
} from "./fixture.js";
import { migrate } from "../server/db.js";
import { token, digest, hashPassword } from "../server/crypto.js";
import http from "node:http";

test(
  "real PostgreSQL migrations are repeatable",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const db = await testDatabase();
    t.after(() => db.close());
    await migrate(db);
    await migrate(db);
    assert.equal(
      (await db.query("SELECT count(*) AS count FROM schema_migrations"))
        .rows[0].count,
      "1",
    );
    assert.ok(
      (
        await db.query("SELECT version() AS version")
      ).rows[0].version.startsWith("PostgreSQL"),
    );
  },
);

test(
  "real PostgreSQL serves 500 fictional customer sessions",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const f = await fixture();
    t.after(() => f.close());
    const hash = await hashPassword(customerPassword);
    await f.db.transaction(async (c) => {
      await c.query(
        "INSERT INTO users(id,login,password_hash,role) SELECT gen_random_uuid(),'load-'||i,$1,'CUSTOMER' FROM generate_series(1,500) AS i",
        [hash],
      );
      await c.query(
        "INSERT INTO accounts(id,number,user_id,name,balance) SELECT gen_random_uuid(),'7'||lpad(substring(login from 6),12,'0'),id,'Fictional Load Customer',50000 FROM users WHERE login LIKE 'load-%'",
      );
      await c.query(
        "INSERT INTO transactions(id,account_id,type,amount,balance_after,request_key) SELECT gen_random_uuid(),id,'OPENING',50000,50000,gen_random_uuid()::text FROM accounts",
      );
    });
    const users = (
      await f.db.query("SELECT id FROM users WHERE login LIKE 'load-%'")
    ).rows;
    const sessions = users.map((user) => ({ user, secret: token() }));
    await f.db.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) SELECT hash,user_id,repeat('a',64),now()+interval '1 hour' FROM unnest($1::text[],$2::uuid[]) AS x(hash,user_id)",
      [sessions.map((s) => digest(s.secret)), sessions.map((s) => s.user.id)],
    );
    const agent = new http.Agent({ keepAlive: true, maxSockets: 100 });
    t.after(() => agent.destroy());
    const readSession = (secret) =>
      new Promise((resolve, reject) => {
        const request = http.get(
          f.base + "/api/me",
          { agent, headers: { Cookie: `bank_session=${secret}` } },
          (response) => {
            let body = "";
            response.on("data", (chunk) => (body += chunk));
            response.on("end", () => {
              try {
                resolve({
                  status: response.statusCode,
                  body: JSON.parse(body),
                });
              } catch (error) {
                reject(error);
              }
            });
          },
        );
        request.on("error", reject);
      });
    const started = performance.now();
    const durations = await Promise.all(
      sessions.map(async (session) => {
        const start = performance.now();
        const response = await readSession(session.secret);
        assert.equal(response.status, 200);
        const result = response.body;
        assert.equal(result.data.accounts.length, 1);
        assert.equal(result.data.accounts[0].balance, 50000);
        return performance.now() - start;
      }),
    );
    durations.sort((a, b) => a - b);
    t.diagnostic(
      `500 concurrent balance/session reads (100 pooled HTTP sockets): total ${Math.round(performance.now() - started)}ms; p95 ${Math.round(durations[474])}ms`,
    );
    assert.ok(
      durations[474] < 2000,
      "95% of local balance/session reads should complete within 2 seconds",
    );
  },
);

test(
  "real PostgreSQL concurrent idempotency and minimum balance use row locks",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const f = await fixture({ config: { minBalance: 10000 } });
    t.after(() => f.close());
    const admin = f.client(),
      customer = f.client();
    await admin.request("/login", "POST", {
      accountNumber: "test-admin",
      password: adminPassword,
    });
    const account = (
      await admin.request("/admin/accounts", "POST", {
        name: "Concurrent Fictional",
        initialDeposit: "1000",
        password: customerPassword,
      })
    ).body.data;
    await customer.request("/login", "POST", {
      accountNumber: account.number,
      password: customerPassword,
    });
    const key = randomUUID();
    const repeated = await Promise.all(
      Array.from({ length: 10 }, () =>
        customer.request(
          `/accounts/${account.id}/deposit`,
          "POST",
          { amount: "1" },
          { "Idempotency-Key": key },
        ),
      ),
    );
    assert.ok(repeated.every((result) => result.status === 200));
    assert.equal(
      new Set(repeated.map((result) => result.body.data.transactionId)).size,
      1,
    );
    const withdrawals = await Promise.all(
      Array.from({ length: 10 }, () =>
        customer.request(
          `/accounts/${account.id}/withdraw`,
          "POST",
          { amount: "200" },
          { "Idempotency-Key": randomUUID() },
        ),
      ),
    );
    assert.equal(
      withdrawals.filter((result) => result.status === 200).length,
      4,
    );
    assert.equal(
      withdrawals.filter((result) => result.status === 422).length,
      6,
    );
    assert.equal(
      (await customer.request(`/accounts/${account.id}`)).body.data.balance,
      20100,
    );
    assert.equal(
      (await customer.request(`/accounts/${account.id}/transactions`)).body.data
        .total,
      6,
    );
    const secondConnection = f.db.newConnection();
    try {
      assert.equal(
        Number(
          (
            await secondConnection.query(
              "SELECT balance FROM accounts WHERE id=$1",
              [account.id],
            )
          ).rows[0].balance,
        ),
        20100,
      );
    } finally {
      await secondConnection.close();
    }
  },
);

test(
  "Transaction failure triggers balance rollback and creates no success ledger entry",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const f = await fixture();
    t.after(() => f.close());
    const admin = f.client(),
      customer = f.client();
      
    await admin.request("/login", "POST", {
      accountNumber: "test-admin",
      password: adminPassword,
    });
    const account = (
      await admin.request("/admin/accounts", "POST", {
        name: "Rollback Test Customer",
        initialDeposit: "5000",
        password: customerPassword,
      })
    ).body.data;
    
    await customer.request("/login", "POST", {
      accountNumber: account.number,
      password: customerPassword,
    });

    const initialBalanceResponse = await customer.request(`/accounts/${account.id}`);
    const initialBalance = initialBalanceResponse.body.data.balance;

    try {
      await customer.request(`/accounts/${account.id}/withdraw`, "POST", {
        amount: "-999999", // Invalid/induced failure amount
      });
    } catch {
      // Expected failure handled
    }

    const finalBalanceResponse = await customer.request(`/accounts/${account.id}`);
    const finalBalance = finalBalanceResponse.body.data.balance;
    assert.equal(finalBalance, initialBalance);

    const txResponse = await customer.request(`/accounts/${account.id}/transactions`);
    const successfulTx = txResponse.body.data.items.find(
      (tx) => tx.type === 'WITHDRAWAL' && tx.amount === 999999
    );
    assert.equal(successfulTx, undefined);
  },
);