import pg from "pg";
import { readFile } from "node:fs/promises";
export function database(connectionString) {
  if (!connectionString)
    throw new Error("DATABASE_URL is required; see .env.example");
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
  });
  pool.on("error", () =>
    console.error(JSON.stringify({ event: "database_connection_error" })),
  );
  return {
    query: (sql, values) => pool.query(sql, values),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
export async function migrate(db) {
  await db.transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(642006)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const exists = await client.query(
      "SELECT version FROM schema_migrations WHERE version=1",
    );
    if (exists.rows.length) return;
    await client.query(
      await readFile(
        new URL("../migrations/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
  });
}
