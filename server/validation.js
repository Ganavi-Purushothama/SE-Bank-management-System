import { assert } from "./errors.js";
export const MAX_MINOR = 9000000000000;
export function amount(value) {
  assert(
    typeof value === "string" && /^(0|[1-9]\d{0,10})(\.\d{1,2})?$/.test(value),
    400,
    "Enter a decimal amount with at most two decimal places",
  );
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  assert(
    Number.isSafeInteger(minor) && minor > 0 && minor <= MAX_MINOR,
    400,
    "Amount is outside the permitted range",
  );
  return minor;
}
export function text(value, label, max, required = true) {
  assert(typeof value === "string", 400, `${label} must be text`);
  const result = value.trim();
  assert(
    (!required || result.length > 0) &&
      result.length <= max &&
      ![...result].some(
        (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      ),
    400,
    `${label} is invalid`,
  );
  return result;
}
export function password(value) {
  assert(
    typeof value === "string" &&
      value.length >= 12 &&
      Buffer.byteLength(value) <= 128,
    400,
    "Use a password of 12–128 bytes",
  );
  return value;
}
export function uuid(value) {
  assert(
    typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      ),
    400,
    "Invalid account identifier",
  );
  return value;
}
export function fields(body, allowed) {
  assert(
    body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      Object.keys(body).every((k) => allowed.includes(k)),
    400,
    "Unexpected request fields",
  );
}
export function page(value = "1") {
  assert(
    typeof value === "string" && /^[1-9]\d{0,5}$/.test(value),
    400,
    "Invalid page",
  );
  return Number(value);
}
