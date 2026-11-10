import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture, adminPassword, customerPassword } from "./fixture.js";

async function setup(t) {
  const f = await fixture();
  t.after(() => f.close());
  const admin = f.client(),
    customer = f.client();
  assert.equal(
    (
      await admin.request("/login", "POST", {
        accountNumber: "test-admin",
        password: adminPassword,
      })
    ).status,
    200,
  );
  const result = await admin.request("/admin/accounts", "POST", {
    name: "Integrity Fixture",
    initialDeposit: "1000",
    password: customerPassword,
  });
  assert.equal(result.status, 201);
  const account = result.body.data;
  assert.equal(
    (
      await customer.request("/login", "POST", {
        accountNumber: account.number,
        password: customerPassword,
      })
    ).status,
    200,
  );
  return { ...f, customer, account };
}

async function snapshot(f) {
  const account = (
    await f.db.query("SELECT balance FROM accounts WHERE id=$1", [f.account.id])
  ).rows[0];
  const ledger = (
    await f.db.query(
      "SELECT id,type,amount,balance_after,request_key FROM transactions WHERE account_id=$1 ORDER BY created_at,id",
      [f.account.id],
    )
  ).rows;
  const audit = (
    await f.db.query(
      "SELECT id,event FROM audit_events WHERE account_id=$1 ORDER BY created_at,id",
      [f.account.id],
    )
  ).rows;
  const net = ledger.reduce(
    (sum, row) =>
      sum +
      (["WITHDRAW", "SETTLEMENT"].includes(row.type) ? -1 : 1) *
        Number(row.amount),
    0,
  );
  assert.equal(
    Number(account.balance),
    net,
    "stored balance must equal ledger net",
  );
  return { balance: Number(account.balance), ledger, audit };
}

test("SCRUM-38: invalid transactions preserve balance, ledger and audit records", async (t) => {
  const f = await setup(t);
  const before = await snapshot(f);
  for (const operation of ["deposit", "withdraw"]) {
    for (const amount of ["0", "-1", "1.001", "NaN", "90000000000.01"]) {
      assert.equal(
        (
          await f.customer.request(
            `/accounts/${f.account.id}/${operation}`,
            "POST",
            { amount },
            { "Idempotency-Key": randomUUID() },
          )
        ).status,
        400,
      );
      assert.deepEqual(await snapshot(f), before);
    }
  }
  assert.equal(
    (
      await f.customer.request(
        `/accounts/${f.account.id}/withdraw`,
        "POST",
        { amount: "1000.01" },
        { "Idempotency-Key": randomUUID() },
      )
    ).status,
    422,
  );
  assert.deepEqual(await snapshot(f), before);
  const key = randomUUID();
  const change = (operation, amount) =>
    f.customer.request(
      `/accounts/${f.account.id}/${operation}`,
      "POST",
      { amount },
      { "Idempotency-Key": key },
    );
  assert.equal((await change("deposit", "0.01")).status, 200);
  const committed = await snapshot(f);
  assert.equal(committed.balance, 100001);
  assert.equal((await change("deposit", "0.01")).status, 200);
  assert.deepEqual(await snapshot(f), committed);
  assert.equal((await change("withdraw", "0.01")).status, 409);
  assert.equal((await change("deposit", "0.02")).status, 409);
  assert.deepEqual(await snapshot(f), committed);
});

test("SCRUM-38: audit failure rolls back balance and ledger and permits a safe retry", async (t) => {
  const f = await setup(t);
  const before = await snapshot(f);
  await f.db.query(
    "CREATE FUNCTION reject_money_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event='DEPOSIT_COMMITTED' THEN RAISE EXCEPTION 'injected audit failure'; END IF; RETURN NEW; END $$",
  );
  await f.db.query(
    "CREATE TRIGGER injected_audit_failure BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_money_audit()",
  );
  const key = randomUUID();
  const deposit = () =>
    f.customer.request(
      `/accounts/${f.account.id}/deposit`,
      "POST",
      { amount: "10.01" },
      { "Idempotency-Key": key },
    );
  const failed = await deposit();
  assert.equal(failed.status, 500);
  assert.equal(failed.body.reason, "Service temporarily unavailable");
  assert.ok(!JSON.stringify(failed.body).includes("injected audit failure"));
  assert.deepEqual(await snapshot(f), before);
  await f.db.query("DROP TRIGGER injected_audit_failure ON audit_events");
  assert.equal((await deposit()).status, 200);
  const committed = await snapshot(f);
  assert.equal(committed.balance, 101001);
  assert.equal(committed.ledger.length, before.ledger.length + 1);
  assert.equal(committed.audit.length, before.audit.length + 1);
  assert.equal((await deposit()).status, 200);
  assert.deepEqual(await snapshot(f), committed);
});
