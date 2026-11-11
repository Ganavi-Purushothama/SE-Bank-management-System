import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture, adminPassword, customerPassword } from "./fixture.js";
import { banking } from "../server/banking.js";
import { accountStatement } from "../server/statements.js";

test("statements include the full period with reconciled balances and ownership checks", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const admin = f.client(),
    customer = f.client();
  await admin.request("/login", "POST", {
    accountNumber: "test-admin",
    password: adminPassword,
  });
  const create = () =>
    admin.request("/admin/accounts", "POST", {
      name: "Fictional Statement Customer",
      initialDeposit: "1000",
      password: customerPassword,
    });
  const account = (await create()).body.data;
  const other = (await create()).body.data;
  await f.db.query(
    "UPDATE transactions SET created_at='2026-01-01T00:00:00Z' WHERE account_id=$1",
    [account.id],
  );
  for (const [type, amount, balance, at] of [
    ["DEPOSIT", 25055, 125055, "2026-02-01T00:00:00Z"],
    ["WITHDRAW", 5055, 120000, "2026-02-28T23:59:59.999999Z"],
    ["DEPOSIT", 100, 120100, "2026-03-01T00:00:00Z"],
  ])
    await f.db.query(
      "INSERT INTO transactions(id,account_id,type,amount,balance_after,request_key,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [randomUUID(), account.id, type, amount, balance, randomUUID(), at],
    );
  await customer.request("/login", "POST", {
    accountNumber: account.number,
    password: customerPassword,
  });
  const path = `/accounts/${account.id}/statement`;
  assert.equal(
    (await f.client().request(path + "?from=2026-02-01&to=2026-02-28")).status,
    401,
  );
  assert.equal(
    (
      await customer.request(
        `/accounts/${other.id}/statement?from=2026-02-01&to=2026-02-28`,
      )
    ).status,
    404,
  );
  for (const query of [
    "",
    "?from=2026-02-01",
    "?from=2026-02-30&to=2026-03-01",
    "?from=2026-03-01&to=2026-02-01",
    "?from=2026-02-01&to=2026-02-28&type=DEPOSIT",
    "?from=2026-02-01&from=2026-02-02&to=2026-02-28",
  ]) {
    assert.equal((await customer.request(path + query)).status, 400, query);
  }
  const result = await customer.request(
    path + "?from=2026-02-01&to=2026-02-28",
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  const s = result.body.data;
  assert.equal(s.openingBalance, 100000);
  assert.equal(s.totalCredits, 25055);
  assert.equal(s.totalDebits, 5055);
  assert.equal(s.closingBalance, 120000);
  assert.equal(s.transactionCount, 2);
  assert.deepEqual(
    s.items.map((r) => r.type),
    ["DEPOSIT", "WITHDRAW"],
  );
  assert.equal(s.items.at(-1).balance_after, s.closingBalance);
  assert.equal(s.account.number, account.number);
  assert.equal(s.period.timezone, "UTC");
  assert.ok(!JSON.stringify(s).includes("user_id"));
  const empty = (
    await customer.request(path + "?from=2026-02-02&to=2026-02-02")
  ).body.data;
  assert.equal(empty.items.length, 0);
  assert.equal(empty.openingBalance, 125055);
  assert.equal(empty.closingBalance, empty.openingBalance);
  const before = (
    await customer.request(path + "?from=2025-01-01&to=2025-01-31")
  ).body.data;
  assert.equal(before.openingBalance, 0);
  assert.equal(before.closingBalance, 0);
  assert.equal(
    (await admin.request(path + "?from=2026-02-01&to=2026-02-28")).status,
    200,
  );
  const single = (
    await customer.request(path + "?from=2026-02-01&to=2026-02-01")
  ).body.data;
  assert.equal(single.transactionCount, 1);
  assert.equal(single.totalCredits, 25055);
  assert.equal(single.totalDebits, 0);
  await f.db.query(
    `INSERT INTO transactions(id,account_id,type,amount,balance_after,request_key,created_at)
    SELECT gen_random_uuid(),$1,'DEPOSIT',100,120100+i*100,gen_random_uuid()::text,
      '2026-04-01T00:00:00Z'::timestamptz + i*interval '1 second' FROM generate_series(1,25) AS i`,
    [account.id],
  );
  const full = (await customer.request(path + "?from=2026-01-01&to=2026-04-30"))
    .body.data;
  assert.equal(full.transactionCount, 29);
  assert.equal(
    full.items.length,
    29,
    "statement must include more than a 20-row history page",
  );
  assert.equal(full.totalCredits, 127655);
  assert.equal(full.totalDebits, 5055);
  assert.equal(full.closingBalance, 122600);
  await f.db.query("UPDATE accounts SET balance=$1 WHERE id=$2", [
    full.closingBalance,
    account.id,
  ]);
  const closed = await admin.request(
    `/admin/accounts/${account.id}/close`,
    "POST",
    { confirmAccountNumber: account.number },
  );
  assert.equal(closed.status, 200);
  // Closure is dated by the database clock; include its UTC date without assuming today's date.
  const settlementDate = (
    await f.db.query(
      "SELECT created_at FROM transactions WHERE account_id=$1 AND type='SETTLEMENT'",
      [account.id],
    )
  ).rows[0].created_at;
  const end = new Date(settlementDate).toISOString().slice(0, 10);
  const settled = (
    await admin.request(
      path + `?from=0001-01-01&to=${end > "2026-04-30" ? end : "2026-04-30"}`,
    )
  ).body.data;
  assert.equal(settled.closingBalance, 0);
  assert.equal(settled.totalCredits, settled.totalDebits);
  assert.ok(settled.items.some((r) => r.type === "SETTLEMENT"));
  assert.equal(
    (await customer.request(path + "?from=2026-01-01&to=2026-04-30")).status,
    401,
  );
});

test("statement limits reject truncation and unsafe monetary totals", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const bank = banking(f.db, { minInitial: 50000 });
  const user = (
    await f.db.query("SELECT id,role FROM users WHERE login='test-admin'")
  ).rows[0];
  const account = await bank.create(
    {
      name: "Statement Limits",
      initialDeposit: "1000",
      password: customerPassword,
    },
    user,
  );
  await f.db.query(
    "UPDATE transactions SET created_at='2026-01-01T00:00:00Z' WHERE account_id=$1",
    [account.id],
  );
  await f.db.query(
    `INSERT INTO transactions(id,account_id,type,amount,balance_after,request_key,created_at)
    SELECT gen_random_uuid(),$1,'DEPOSIT',1,100000+i,gen_random_uuid()::text,
      '2026-02-01T00:00:00Z'::timestamptz FROM generate_series(1,10001) AS i`,
    [account.id],
  );
  const period = { from: "2026-02-01", to: "2026-02-28" };
  await assert.rejects(accountStatement(f.db, bank, account.id, user, period), {
    status: 422,
    message: "Statement exceeds 10,000 transactions. Choose a shorter period",
  });
  await f.db.query(
    "DELETE FROM transactions WHERE id=(SELECT id FROM transactions WHERE account_id=$1 AND type='DEPOSIT' LIMIT 1)",
    [account.id],
  );
  const max = await accountStatement(f.db, bank, account.id, user, period);
  assert.equal(max.items.length, 10000);
  assert.equal(max.closingBalance, 110000);
  // Gross turnover may exceed Number.MAX_SAFE_INTEGER even if individual rows are valid.
  await f.db.query(
    "UPDATE transactions SET amount=9000000000000 WHERE account_id=$1 AND type='DEPOSIT'",
    [account.id],
  );
  await assert.rejects(accountStatement(f.db, bank, account.id, user, period), {
    status: 422,
    message:
      "Statement totals exceed the supported range. Choose a shorter period",
  });
});

test(
  "real PostgreSQL statement snapshot stays consistent across a concurrent deposit",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const f = await fixture();
    t.after(() => f.close());
    const bank = banking(f.db, { minInitial: 50000, minBalance: 0 });
    const admin = (
      await f.db.query("SELECT id,role FROM users WHERE login='test-admin'")
    ).rows[0];
    const account = await bank.create(
      {
        name: "Snapshot Customer",
        initialDeposit: "1000",
        password: customerPassword,
      },
      admin,
    );
    const owner = (
      await f.db.query("SELECT id,role FROM users WHERE login=$1", [
        account.number,
      ])
    ).rows[0];
    const writer = f.db.newConnection();
    t.after(() => writer.close());
    const concurrentBank = banking(writer, { minBalance: 0 });
    const duringRead = {
      accessible: async (...args) => {
        const row = await bank.accessible(...args);
        await concurrentBank.change(
          account.id,
          owner,
          "DEPOSIT",
          "25.55",
          randomUUID(),
        );
        return row;
      },
    };
    const period = { from: "0001-01-01", to: "9999-12-31" };
    const snapshot = await accountStatement(
      f.db,
      duringRead,
      account.id,
      owner,
      period,
    );
    assert.equal(snapshot.items.length, 1);
    assert.equal(snapshot.totalCredits, 100000);
    assert.equal(snapshot.closingBalance, 100000);
    const next = await accountStatement(f.db, bank, account.id, owner, period);
    assert.equal(next.items.length, 2);
    assert.equal(next.totalCredits, 102555);
    assert.equal(next.closingBalance, 102555);
  },
);
