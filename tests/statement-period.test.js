import test from "node:test";
import assert from "node:assert/strict";
import { statementPeriod } from "../server/validation.js";

test("statement period requires real, ordered calendar dates", () => {
  assert.deepEqual(statementPeriod("2024-02-29", "2024-02-29"), {
    from: "2024-02-29",
    to: "2024-02-29",
    timezone: "UTC",
  });
  for (const value of [
    undefined,
    "",
    "2025-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-1-01",
    "2026-01-01T00:00:00Z",
    "0000-01-01",
    ["2026-01-01"],
    {},
  ]) {
    assert.throws(() => statementPeriod(value, "2026-12-31"), { status: 400 });
    assert.throws(() => statementPeriod("2026-01-01", value), { status: 400 });
  }
  assert.throws(() => statementPeriod("2026-02-02", "2026-02-01"), {
    status: 400,
  });
});
