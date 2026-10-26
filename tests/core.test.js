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
