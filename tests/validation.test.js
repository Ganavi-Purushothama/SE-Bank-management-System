import test from "node:test";
import assert from "node:assert/strict";
import { amount, password, text, phone, page } from "../server/validation.js";

test("SCRUM-36: amount parsing preserves paise at fractional and maximum boundaries", () => {
  for (const [input, expected] of [
    ["0.01", 1],
    ["0.1", 10],
    ["1.10", 110],
    ["89999999999.99", 8999999999999],
    ["90000000000.00", 9000000000000],
  ]) {
    assert.equal(amount(input), expected);
  }
  for (const input of ["0.00", "0.001", "90000000000.01", "1,000", "1\n"]) {
    assert.throws(() => amount(input), { status: 400 });
  }
});

test("SCRUM-36: passwords enforce minimum length and UTF-8 byte limits", () => {
  for (const input of ["a".repeat(12), "a".repeat(128), "é".repeat(64)]) {
    assert.equal(password(input), input);
  }
  for (const input of ["a".repeat(11), "a".repeat(129), "é".repeat(65), null]) {
    assert.throws(() => password(input), { status: 400 });
  }
});

test("SCRUM-36: customer text handles optional values, limits and control characters", () => {
  assert.equal(text("  Mira  ", "Name", 4), "Mira");
  assert.equal(text("   ", "Address", 100, false), "");
  for (const input of ["", "   ", "Miraa", "Mi\0ra", "Mi\x7fra", null]) {
    assert.throws(() => text(input, "Name", 4), { status: 400 });
  }
});

test("SCRUM-36: phone numbers enforce seven to fifteen digits", () => {
  assert.equal(phone("1234567"), "1234567");
  assert.equal(phone("+123456789012345"), "+123456789012345");
  assert.equal(phone(undefined), "");
  for (const input of ["123456", "1234567890123456", "1234567x", "12+34567"]) {
    assert.throws(() => phone(input), { status: 400 });
  }
});

test("SCRUM-36: pagination accepts endpoints and rejects ambiguous input", () => {
  assert.equal(page(), 1);
  assert.equal(page("999999"), 999999);
  for (const input of ["0", "1000000", "01", "1.5", "-1", "1e2", 1, null]) {
    assert.throws(() => page(input), { status: 400 });
  }
});
