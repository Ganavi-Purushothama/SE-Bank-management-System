import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture, adminPassword, customerPassword } from "./fixture.js";

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
});
