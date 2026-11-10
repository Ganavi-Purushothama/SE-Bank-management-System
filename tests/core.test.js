import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { evaluate } from "../server/core.js";
import {
  amount,
  password,
  text,
  uuid,
  fields,
  page,
  phone,
} from "../server/validation.js";
import { hashPassword, verifyPassword } from "../server/crypto.js";
import { configuration } from "../server/config.js";
test("money parser accepts exact minor units and rejects financial edge cases", () => {
  assert.equal(amount("12.01"), 1201);
  assert.equal(amount("0.01"), 1);
  assert.equal(amount("90000000000"), 9000000000000);
  for (const value of [
    "0",
    "-1",
    "1.001",
    "1e3",
    "NaN",
    "Infinity",
    "01",
    "90000000000.01",
    "9999999999999999999999",
    null,
    1,
    {},
    " 1",
    "+1",
    "1.",
  ])
    assert.throws(() => amount(value));
});
test("field, identifier, password, pagination and configuration validation", () => {
  for (const action of [
    () => password("short"),
    () => password("a".repeat(129)),
    () => text("\0", "Name", 100),
    () => uuid("' OR 1=1"),
    () => fields({ role: "ADMIN" }, ["name"]),
    () => page("0"),
    () => page(["1"]),
    () =>
      configuration({
        NODE_ENV: "production",
        APP_ORIGIN: "http://localhost:3000",
      }),
    () =>
      configuration({ MIN_BALANCE_MINOR: "60000", MIN_INITIAL_MINOR: "50000" }),
  ])
    assert.throws(action);
  assert.equal(configuration({}).minInitial, 50000);
});
test("C++ real executable enforces deposit, withdrawal, minimum, opening, settlement and overflow", async () => {
  assert.equal(await evaluate("DEPOSIT", 100, 25, 0), 125);
  assert.equal(await evaluate("WITHDRAW", 125, 25, 100), 100);
  assert.equal(await evaluate("SETTLEMENT", 100, 100, 0), 0);
  assert.equal(await evaluate("OPENING", 0, 50000, 50000), 50000);
  for (const args of [
    ["WITHDRAW", 125, 26, 100],
    ["DEPOSIT", 100, 0, 0],
    ["DEPOSIT", 9000000000000, 1, 0],
    ["OPENING", 0, 1, 50000],
    ["TRANSFER", 100, 1, 0],
  ])
    await assert.rejects(evaluate(...args));
});
test("C++ rejects malformed, oversized, out-of-range IPC input", () => {
  const executable =
    process.platform === "win32" ? "build/bank-core.exe" : "build/bank-core";
  for (const input of [
    "{}",
    "x".repeat(600),
    '{"operation":"DEPOSIT","currentBalance":0,"amount":999999999999999999999999999,"minBalance":0}',
    '{"operation":"DEPOSIT","currentBalance":0,"amount":-1,"minBalance":0}',
  ]) {
    const result = spawnSync(executable, [], {
      input: input + "\n",
      encoding: "utf8",
    });
    assert.equal(JSON.parse(result.stdout).status, "REJECTED");
  }
});
test("password hashing uses per-password salts and verifies credentials", async () => {
  const a = await hashPassword("A fiction password 2026"),
    b = await hashPassword("A fiction password 2026");
  assert.notEqual(a, b);
  assert.ok(!a.includes("fiction"));
  assert.equal(await verifyPassword("A fiction password 2026", a), true);
  assert.equal(await verifyPassword("incorrect", a), false);
});
test("issue #8: phone validator accepts valid formats and rejects invalid numbers", () => {
  assert.equal(phone("+91 98765-43210"), "+91 98765-43210");
  assert.equal(phone("9876543210"), "9876543210");
  assert.equal(phone("(080) 1234-5678"), "(080) 1234-5678");
  assert.equal(phone(""), "");
  for (const value of [
    "abc",
    "12",
    "1234",
    "98765-43210; DROP TABLE users",
    "++9198765",
  ])
    assert.throws(() => phone(value));
});
test("issue #5: C++ rule engine enforces boundary conditions and available funds", async () => {
  // Withdraw exactly to zero when minBalance=0 — should succeed
  assert.equal(await evaluate("WITHDRAW", 500, 500, 0), 0);
  // Withdraw exactly to the minimum — should succeed
  assert.equal(await evaluate("WITHDRAW", 1000, 500, 500), 500);
  // Withdraw one paise above available-above-minimum — should reject
  await assert.rejects(evaluate("WITHDRAW", 1000, 501, 500), (err) =>
    err.message.includes("Insufficient available funds"),
  );
  // Withdraw more than balance — should reject
  await assert.rejects(evaluate("WITHDRAW", 100, 200, 0), (err) =>
    err.message.includes("Insufficient available funds"),
  );
  // Settlement with zero balance: SETTLEMENT amount must be >0, so this is rejected by bounds
  await assert.rejects(evaluate("SETTLEMENT", 0, 1, 0));
  // Full settlement of nonzero balance must leave exactly 0
  assert.equal(await evaluate("SETTLEMENT", 75000, 75000, 0), 0);
});

test("SCRUM-36: opening and deposit accept exact limits and reject one paise beyond", async () => {
  const maximum = 9000000000000;
  assert.equal(await evaluate("OPENING", 0, 50000, 50000), 50000);
  await assert.rejects(evaluate("OPENING", 0, 49999, 50000), { status: 422 });
  assert.equal(await evaluate("OPENING", 0, maximum, maximum), maximum);
  assert.equal(await evaluate("DEPOSIT", maximum - 1, 1, 0), maximum);
  await assert.rejects(evaluate("DEPOSIT", maximum, 1, 0), { status: 422 });
});

test("SCRUM-36: financial rules reject invalid balances, amounts and minimums", async () => {
  for (const operation of ["OPENING", "DEPOSIT", "WITHDRAW", "SETTLEMENT"]) {
    for (const [balance, amount, minimum] of [
      [-1, 1, 0],
      [9000000000001, 1, 0],
      [100, 0, 0],
      [100, -1, 0],
      [100, 9000000000001, 0],
      [100, 1, -1],
      [100, 1, 9000000000001],
    ]) {
      await assert.rejects(evaluate(operation, balance, amount, minimum), {
        status: 422,
      });
    }
  }
});

test("SCRUM-36: withdrawals preserve exact paise across a deposit and full settlement", async () => {
  const opening = await evaluate("OPENING", 0, 100000, 50000);
  const deposited = await evaluate("DEPOSIT", opening, 25055, 0);
  assert.equal(deposited, 125055);
  const withdrawn = await evaluate("WITHDRAW", deposited, 5055, 0);
  assert.equal(withdrawn, 120000);
  await assert.rejects(evaluate("WITHDRAW", withdrawn, 120001, 0), {
    status: 422,
  });
  assert.equal(await evaluate("SETTLEMENT", withdrawn, withdrawn, 0), 0);
});
