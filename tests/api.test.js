import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture, adminPassword, customerPassword } from "./fixture.js";
import { evaluate } from "../server/core.js";
test("HTTP parser, request limits and brute-force throttling reject unsafe requests", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const headers = {
    Origin: "http://localhost:3000",
    "Content-Type": "application/json",
  };
  const malformed = await fetch(f.base + "/api/login", {
    method: "POST",
    headers,
    body: '{"bad":',
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).reason, "Invalid JSON request");
  const oversized = await fetch(f.base + "/api/login", {
    method: "POST",
    headers,
    body: JSON.stringify({ accountNumber: "x", password: "a".repeat(9000) }),
  });
  assert.equal(oversized.status, 413);
  const wrongType = await fetch(f.base + "/api/login", {
    method: "POST",
    headers: { Origin: "http://localhost:3000", "Content-Type": "text/plain" },
    body: "{}",
  });
  assert.equal(wrongType.status, 415);
  const client = f.client();
  for (let i = 0; i < 30; i++)
    assert.equal(
      (
        await client.request("/login", "POST", {
          accountNumber: "unknown-user",
          password: "incorrect",
        })
      ).status,
      401,
    );
  assert.equal(
    (
      await client.request("/login", "POST", {
        accountNumber: "unknown-user",
        password: "incorrect",
      })
    ).status,
    429,
  );
});
test("complete account lifecycle, security boundaries and financial consistency", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const admin = f.client(),
    customer = f.client(),
    other = f.client();
  let account, second;
  await t.test(
    "unauthenticated access, origin protection, malformed login and secure headers",
    async () => {
      assert.equal((await customer.request("/me")).status, 401);
      assert.equal(
        (
          await customer.request(
            "/login",
            "POST",
            { accountNumber: "test-admin", password: adminPassword },
            { Origin: "https://evil.example" },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await customer.request("/login", "POST", {
            accountNumber: "' OR 1=1 --",
            password: "bad",
          })
        ).status,
        401,
      );
      const result = await admin.request("/login", "POST", {
        accountNumber: "test-admin",
        password: adminPassword,
      });
      assert.equal(result.status, 200);
      assert.ok(result.headers.get("set-cookie").includes("HttpOnly"));
      assert.ok(result.headers.get("set-cookie").includes("SameSite=Strict"));
      assert.ok(result.headers.get("content-security-policy"));
    },
  );
  await t.test(
    "admin creation, unique identifiers, initial validation and password hashing",
    async () => {
      const create = (initialDeposit) =>
        admin.request("/admin/accounts", "POST", {
          name: "Fictional Mira",
          phone: "1234567890",
          address: "Example Street",
          initialDeposit,
          password: customerPassword,
        });
      assert.equal((await create("499.99")).status, 422);
      const result = await create("1000.00");
      assert.equal(result.status, 201);
      account = result.body.data;
      assert.equal(account.balance, 100000);
      second = (await create("500")).body.data;
      assert.notEqual(account.number, second.number);
      const row = (
        await f.db.query("SELECT password_hash FROM users WHERE login=$1", [
          account.number,
        ])
      ).rows[0];
      assert.ok(row.password_hash.startsWith("scrypt$"));
      assert.ok(!JSON.stringify(account).includes("password"));
      assert.equal(
        (
          await customer.request("/login", "POST", {
            accountNumber: account.number,
            password: customerPassword,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await other.request("/login", "POST", {
            accountNumber: second.number,
            password: customerPassword,
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "ownership, RBAC, CSRF and mass assignment enforced",
    async () => {
      assert.equal(
        (await customer.request(`/accounts/${second.id}`)).status,
        404,
      );
      assert.equal(
        (await customer.request(`/accounts/${second.id}/transactions`)).status,
        404,
      );
      assert.equal(
        (
          await customer.request(
            `/accounts/${second.id}/deposit`,
            "POST",
            { amount: "1" },
            { "Idempotency-Key": randomUUID() },
          )
        ).status,
        404,
      );
      assert.equal((await customer.request("/admin/accounts")).status, 403);
      assert.equal(
        (await customer.request("/admin/accounts", "POST", {})).status,
        403,
      );
      assert.equal(
        (
          await customer.request(`/accounts/${account.id}`, "PATCH", {
            name: "Changed",
            phone: "",
            address: "",
            balance: 9999,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await customer.request(
            `/accounts/${account.id}/deposit`,
            "POST",
            { amount: "10" },
            { "X-CSRF-Token": "incorrect", "Idempotency-Key": randomUUID() },
          )
        ).status,
        403,
      );
    },
  );
  await t.test(
    "real deposit, idempotent retries, collision detection, withdrawal, balance and ledger",
    async () => {
      const key = randomUUID(),
        headers = { "Idempotency-Key": key };
      const deposited = await customer.request(
        `/accounts/${account.id}/deposit`,
        "POST",
        { amount: "250.55" },
        headers,
      );
      assert.equal(deposited.status, 200);
      assert.equal(deposited.body.data.newBalance, 125055);
      const repeated = await customer.request(
        `/accounts/${account.id}/deposit`,
        "POST",
        { amount: "250.55" },
        headers,
      );
      assert.equal(repeated.body.data.replayed, true);
      assert.equal(
        repeated.body.data.transactionId,
        deposited.body.data.transactionId,
      );
      assert.equal(
        (
          await customer.request(
            `/accounts/${account.id}/deposit`,
            "POST",
            { amount: "1" },
            headers,
          )
        ).status,
        409,
      );
      const withdrawn = await customer.request(
        `/accounts/${account.id}/withdraw`,
        "POST",
        { amount: "50.55" },
        { "Idempotency-Key": randomUUID() },
      );
      assert.equal(withdrawn.body.data.newBalance, 120000);
      assert.equal(
        (await customer.request(`/accounts/${account.id}`)).body.data.balance,
        120000,
      );
      const history = (
        await customer.request(`/accounts/${account.id}/transactions`)
      ).body.data;
      assert.equal(history.total, 3);
      assert.ok(history.items.every((item) => item.status === "COMMITTED"));
      assert.equal(
        (
          await customer.request(
            `/accounts/${account.id}/transactions?type=DEPOSIT`,
          )
        ).body.data.total,
        1,
      );
      assert.equal(
        (await customer.request(`/accounts/${account.id}/transactions?page=0`))
          .status,
        400,
      );
      assert.equal(
        (
          await customer.request(
            `/accounts/${account.id}/transactions?from=2026-02-30`,
          )
        ).status,
        400,
      );
    },
  );
  await t.test(
    "bad amounts and overdrafts leave balances unchanged",
    async () => {
      for (const value of [
        "0",
        "-1",
        "1.001",
        "90000000000.01",
        null,
        {},
        "1e5",
      ])
        assert.equal(
          (
            await customer.request(
              `/accounts/${account.id}/withdraw`,
              "POST",
              { amount: value },
              { "Idempotency-Key": randomUUID() },
            )
          ).status,
          400,
        );
      assert.equal(
        (
          await customer.request(
            `/accounts/${account.id}/withdraw`,
            "POST",
            { amount: "1200.01" },
            { "Idempotency-Key": randomUUID() },
          )
        ).status,
        422,
      );
      assert.equal(
        (
          await customer.request(`/accounts/${account.id}/deposit`, "POST", {
            amount: "1",
          })
        ).status,
        400,
      );
      assert.equal(
        (await customer.request(`/accounts/${account.id}`)).body.data.balance,
        120000,
      );
    },
  );
  await t.test(
    "concurrent withdrawal requests serialize without overdraft",
    async () => {
      const results = await Promise.all(
        [1, 2].map(() =>
          customer.request(
            `/accounts/${account.id}/withdraw`,
            "POST",
            { amount: "800" },
            { "Idempotency-Key": randomUUID() },
          ),
        ),
      );
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 422]);
      assert.equal(
        (await customer.request(`/accounts/${account.id}`)).body.data.balance,
        40000,
      );
    },
  );
  await t.test("contact update, safe search and missing records", async () => {
    const result = await customer.request(`/accounts/${account.id}`, "PATCH", {
      name: "Fictional Mira Updated",
      phone: "9876543210",
      address: "New Example Address",
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.name, "Fictional Mira Updated");
    assert.equal(
      (
        await admin.request(
          `/admin/accounts?search=${encodeURIComponent("Mira Updated")}`,
        )
      ).body.data.total,
      1,
    );
    assert.equal(
      (
        await admin.request(
          `/admin/accounts?search=${encodeURIComponent("' OR 1=1 --")}`,
        )
      ).body.data.total,
      0,
    );
    assert.equal(
      (await customer.request(`/accounts/${randomUUID()}`)).status,
      404,
    );
  });
  await t.test(
    "three failures persist lockout, invalidate sessions and require admin unlock",
    async () => {
      const attacker = f.client();
      for (let i = 0; i < 3; i++)
        assert.equal(
          (
            await attacker.request("/login", "POST", {
              accountNumber: account.number,
              password: "wrong",
            })
          ).status,
          401,
        );
      assert.equal((await customer.request("/me")).status, 401);
      assert.equal(
        (
          await attacker.request("/login", "POST", {
            accountNumber: account.number,
            password: customerPassword,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await admin.request(
            `/admin/accounts/${account.id}/unlock`,
            "POST",
            {},
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await customer.request("/login", "POST", {
            accountNumber: account.number,
            password: customerPassword,
          })
        ).status,
        200,
      );
    },
  );
  await t.test(
    "session expiry and logout revoke protected access",
    async () => {
      await f.db.query(
        "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=(SELECT id FROM users WHERE login=$1)",
        [second.number],
      );
      assert.equal((await other.request("/me")).status, 401);
      assert.equal((await customer.request("/logout", "POST", {})).status, 200);
      assert.equal((await customer.request("/me")).status, 401);
      await customer.request("/login", "POST", {
        accountNumber: account.number,
        password: customerPassword,
      });
    },
  );
  await t.test(
    "admin closure atomically settles funds, preserves ledger and denies future access",
    async () => {
      assert.equal(
        (
          await admin.request(`/admin/accounts/${account.id}/close`, "POST", {
            confirmAccountNumber: "wrong",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await customer.request(
            `/admin/accounts/${account.id}/close`,
            "POST",
            { confirmAccountNumber: account.number },
          )
        ).status,
        403,
      );
      const result = await admin.request(
        `/admin/accounts/${account.id}/close`,
        "POST",
        { confirmAccountNumber: account.number },
      );
      assert.equal(result.status, 200);
      assert.equal(result.body.data.settledAmount, 40000);
      assert.equal((await customer.request("/me")).status, 401);
      assert.equal(
        (
          await customer.request("/login", "POST", {
            accountNumber: account.number,
            password: customerPassword,
          })
        ).status,
        401,
      );
      const closed = (await admin.request(`/accounts/${account.id}`)).body.data;
      assert.equal(closed.status, "CLOSED");
      assert.equal(closed.balance, 0);
      const ledger = (
        await admin.request(
          `/accounts/${account.id}/transactions?type=SETTLEMENT`,
        )
      ).body.data;
      assert.equal(ledger.total, 1);
      assert.equal(ledger.items[0].amount, 40000);
      assert.equal(
        (
          await admin.request(`/admin/accounts/${account.id}/close`, "POST", {
            confirmAccountNumber: account.number,
          })
        ).status,
        409,
      );
      const events = (await admin.request("/admin/audit")).body.data.items.map(
        (item) => item.event,
      );
      assert.ok(events.includes("ACCOUNT_CLOSED_SETTLED"));
      assert.ok(events.includes("LOGIN_LOCKED"));
    },
  );
});
test("database failure after balance update rolls back the entire financial operation", async (t) => {
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
      name: "Rollback Customer",
      initialDeposit: "1000",
      password: customerPassword,
    })
  ).body.data;
  await customer.request("/login", "POST", {
    accountNumber: account.number,
    password: customerPassword,
  });
  await f.db.query(
    "CREATE FUNCTION reject_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test fault'; END $$",
  );
  await f.db.query(
    "CREATE TRIGGER injected_failure BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION reject_ledger()",
  );
  const result = await customer.request(
    `/accounts/${account.id}/deposit`,
    "POST",
    { amount: "10" },
    { "Idempotency-Key": randomUUID() },
  );
  assert.equal(result.status, 500);
  assert.equal(result.body.reason, "Service temporarily unavailable");
  assert.equal(
    (await customer.request(`/accounts/${account.id}`)).body.data.balance,
    100000,
  );
  assert.equal(
    (await customer.request(`/accounts/${account.id}/transactions`)).body.data
      .total,
    1,
  );
});
test("engine unavailability preserves account state", async (t) => {
  let fail = false;
  const f = await fixture({
    engine: async (...args) => {
      if (fail) throw new Error("engine offline");
      return evaluate(...args);
    },
  });
  t.after(() => f.close());
  const admin = f.client(),
    customer = f.client();
  await admin.request("/login", "POST", {
    accountNumber: "test-admin",
    password: adminPassword,
  });
  const account = (
    await admin.request("/admin/accounts", "POST", {
      name: "Engine Customer",
      initialDeposit: "500",
      password: customerPassword,
    })
  ).body.data;
  await customer.request("/login", "POST", {
    accountNumber: account.number,
    password: customerPassword,
  });
  fail = true;
  assert.equal(
    (
      await customer.request(
        `/accounts/${account.id}/withdraw`,
        "POST",
        { amount: "1" },
        { "Idempotency-Key": randomUUID() },
      )
    ).status,
    500,
  );
  assert.equal(
    (await customer.request(`/accounts/${account.id}`)).body.data.balance,
    50000,
  );
});
