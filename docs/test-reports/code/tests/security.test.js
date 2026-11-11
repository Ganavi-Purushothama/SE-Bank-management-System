import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture, adminPassword, customerPassword } from "./fixture.js";

test("SCRUM-38: anonymous, forged and customer sessions cannot reach administrator actions", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const admin = f.client();
  assert.equal(
    (
      await admin.request("/login", "POST", {
        accountNumber: "test-admin",
        password: adminPassword,
      })
    ).status,
    200,
  );
  const created = await admin.request("/admin/accounts", "POST", {
    name: "Security Fixture",
    initialDeposit: "1000",
    password: customerPassword,
  });
  assert.equal(created.status, 201);
  const account = created.body.data;
  const customer = f.client();
  assert.equal(
    (
      await customer.request("/login", "POST", {
        accountNumber: account.number,
        password: customerPassword,
      })
    ).status,
    200,
  );
  const routes = [
    ["/admin/accounts", "GET", undefined],
    ["/admin/accounts", "POST", {}],
    [
      `/admin/accounts/${account.id}/close`,
      "POST",
      { confirmAccountNumber: account.number },
    ],
    [`/admin/accounts/${account.id}/unlock`, "POST", {}],
    ["/admin/audit", "GET", undefined],
  ];
  for (const [path, method, body] of routes) {
    assert.equal((await f.client().request(path, method, body)).status, 401);
    assert.equal(
      (
        await f.client().request(path, method, body, {
          Cookie: `bank_session=${"a".repeat(64)}`,
        })
      ).status,
      401,
    );
    assert.equal((await customer.request(path, method, body)).status, 403);
  }
  const stranger = randomUUID();
  for (const operation of ["deposit", "withdraw"]) {
    assert.equal(
      (
        await customer.request(
          `/accounts/${stranger}/${operation}`,
          "POST",
          { amount: "1" },
          { "Idempotency-Key": randomUUID() },
        )
      ).status,
      404,
    );
  }
  const row = (
    await f.db.query("SELECT balance,status FROM accounts WHERE id=$1", [
      account.id,
    ])
  ).rows[0];
  assert.equal(Number(row.balance), 100000);
  assert.equal(row.status, "ACTIVE");
  assert.equal(
    Number((await f.db.query("SELECT count(*) AS n FROM accounts")).rows[0].n),
    1,
  );
});

test("SCRUM-38: reauthentication rotates the cookie and rejects replay of the old session", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const client = f.client();
  const credentials = { accountNumber: "test-admin", password: adminPassword };
  const first = await client.request("/login", "POST", credentials);
  assert.equal(first.status, 200);
  const oldCookie = first.headers.get("set-cookie").split(";")[0];
  const second = await client.request("/login", "POST", credentials);
  assert.equal(second.status, 200);
  assert.notEqual(second.headers.get("set-cookie").split(";")[0], oldCookie);
  assert.equal((await client.request("/me")).status, 200);
  assert.equal(
    (await f.client().request("/me", "GET", undefined, { Cookie: oldCookie }))
      .status,
    401,
  );
  assert.equal((await client.request("/logout", "POST", {})).status, 200);
  assert.equal((await client.request("/me")).status, 401);
  assert.equal(
    Number((await f.db.query("SELECT count(*) AS n FROM sessions")).rows[0].n),
    0,
  );
});

test("change password verifies current password, rotates sessions and audits", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const admin = f.client();
  await admin.request("/login", "POST", {
    accountNumber: "test-admin",
    password: adminPassword,
  });
  const created = await admin.request("/admin/accounts", "POST", {
    name: "Password Fixture",
    initialDeposit: "1000",
    password: customerPassword,
  });
  const number = created.body.data.number;
  const newPassword = "BrandNewPassword!2027";
  const phone = f.client();
  const laptop = f.client();
  for (const c of [phone, laptop])
    assert.equal(
      (
        await c.request("/login", "POST", {
          accountNumber: number,
          password: customerPassword,
        })
      ).status,
      200,
    );
  // wrong current password is rejected and audited
  assert.equal(
    (
      await laptop.request("/password", "POST", {
        currentPassword: "WrongPassword!2026",
        newPassword,
      })
    ).status,
    403,
  );
  // weak or unchanged passwords are rejected
  for (const bad of ["short", customerPassword])
    assert.equal(
      (
        await laptop.request("/password", "POST", {
          currentPassword: customerPassword,
          newPassword: bad,
        })
      ).status,
      400,
    );
  // unexpected fields are rejected
  assert.equal(
    (
      await laptop.request("/password", "POST", {
        currentPassword: customerPassword,
        newPassword,
        role: "ADMIN",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await laptop.request("/password", "POST", {
        currentPassword: customerPassword,
        newPassword,
      })
    ).status,
    200,
  );
  // this device stays signed in, other sessions are revoked
  assert.equal((await laptop.request("/me")).status, 200);
  assert.equal((await phone.request("/me")).status, 401);
  // old password no longer works, new one does
  assert.equal(
    (
      await f.client().request("/login", "POST", {
        accountNumber: number,
        password: customerPassword,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await f.client().request("/login", "POST", {
        accountNumber: number,
        password: newPassword,
      })
    ).status,
    200,
  );
  // anonymous callers cannot reach the endpoint
  assert.equal(
    (
      await f.client().request("/password", "POST", {
        currentPassword: customerPassword,
        newPassword,
      })
    ).status,
    401,
  );
  const events = (await f.db.query("SELECT event FROM audit_events")).rows.map(
    (r) => r.event,
  );
  assert.ok(events.includes("PASSWORD_CHANGED"));
  assert.ok(events.includes("PASSWORD_CHANGE_FAILED"));
});
