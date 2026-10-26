export function configuration(env = process.env) {
  const integer = (key, fallback, minimum, maximum) => {
    const value = Number(env[key] ?? fallback);
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
      throw new Error(`Invalid ${key}`);
    return value;
  };
  const origin = env.APP_ORIGIN || "http://localhost:3000";
  const parsed = new URL(origin);
  if (parsed.origin !== origin)
    throw new Error("APP_ORIGIN must be an origin without trailing slash");
  const production = env.NODE_ENV === "production";
  if (production && parsed.protocol !== "https:")
    throw new Error("Production requires HTTPS APP_ORIGIN");
  const minInitial = integer("MIN_INITIAL_MINOR", 50000, 1, 9000000000000);
  const minBalance = integer("MIN_BALANCE_MINOR", 0, 0, 9000000000000);
  if (minBalance > minInitial)
    throw new Error("Minimum balance cannot exceed minimum initial deposit");
  return {
    origin,
    production,
    minInitial,
    minBalance,
    sessionMinutes: integer("SESSION_MINUTES", 30, 1, 1440),
  };
}
