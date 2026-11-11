import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { createApp } from "../server/app.js";
import { provisionAdmin } from "../server/banking.js";
import { database, migrate } from "../server/db.js";
import { randomUUID } from "node:crypto";
export const adminPassword = "FictionalAdmin!2026";
export const customerPassword = "FictionalCustomer!2026";
export async function testDatabase() {
  if (process.env.TEST_DATABASE_URL) {
    const url = new URL(process.env.TEST_DATABASE_URL);
    if (!url.pathname.startsWith("/bank_test_"))
      throw new Error(
        "TEST_DATABASE_URL must point to a disposable bank_test_ database",
      );
    const schema = "test_" + randomUUID().replaceAll("-", "");
    const control = database(url.toString());
    await control.query(`CREATE SCHEMA ${schema}`);
    url.searchParams.set("options", `-c search_path=${schema}`);
    const scoped = database(url.toString());
    await migrate(scoped);
    return {
      ...scoped,
      connectionString: url.toString(),
      newConnection: () => database(url.toString()),
      async close() {
        await scoped.close();
        await control.query(`DROP SCHEMA ${schema} CASCADE`);
        await control.close();
      },
    };
  }
  const pg = new PGlite();
  await pg.exec(
    await readFile(
      new URL("../migrations/001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  // PGlite has one connection. Queue entire transactions, including reads, to prevent interleaving.
  let queue = Promise.resolve();
  const serialized = (fn) => {
    const next = queue.then(fn);
    queue = next.catch(() => {});
    return next;
  };
  const db = {
    query: (sql, params) => serialized(() => pg.query(sql, params)),
    transaction: (fn) =>
      serialized(() =>
        pg.transaction((tx) =>
          fn({ query: (sql, params) => tx.query(sql, params) }),
        ),
      ),
    async ping() {
      const start = Date.now();
      await serialized(() => pg.query("SELECT 1"));
      return { connected: true, latencyMs: Date.now() - start };
    },
    close: () => pg.close(),
  };
  return db;
}
export async function fixture(options = {}) {
  const db = options.db || (await testDatabase());
  await provisionAdmin(db, "test-admin", adminPassword);
  const config = {
    origin: "http://localhost:3000",
    production: false,
    minInitial: 50000,
    minBalance: 0,
    sessionMinutes: 30,
    ...options.config,
  };
  const app = await createApp(db, config, options.engine);
  const server = app.listen({ port: 0, host: "127.0.0.1", backlog: 2048 });
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  function client() {
    let cookie = "",
      csrf = "";
    return {
      async request(path, method = "GET", body, headers = {}) {
        const response = await fetch(base + "/api" + path, {
          method,
          headers: {
            Origin: config.origin,
            "Content-Type": "application/json",
            Cookie: cookie,
            "X-CSRF-Token": csrf,
            ...headers,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) cookie = setCookie.split(";")[0];
        const json = await response.json();
        if (json.data?.csrfToken) csrf = json.data.csrfToken;
        return {
          status: response.status,
          body: json,
          headers: response.headers,
        };
      },
    };
  }
  return {
    db,
    base,
    client,
    server,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await db.close();
    },
  };
}
