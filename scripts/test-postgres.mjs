import { mkdtemp, mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import net from "node:net";
import { spawn } from "node:child_process";
import pg from "pg";
await mkdir("build", { recursive: true });
const directory = await mkdtemp(join(resolve("build"), "postgres-test-"));
const probe = net.createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const password = randomBytes(24).toString("hex");
let postgres;
if (process.env.POSTGRES_BIN) {
  const executable = (name) =>
    join(
      resolve(process.env.POSTGRES_BIN),
      name + (process.platform === "win32" ? ".exe" : ""),
    );
  const run = (executable, args) =>
    new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        windowsHide: true,
        stdio: "ignore",
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("PostgreSQL test command timed out"));
      }, 30000);
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `PostgreSQL test command failed (${code}); inspect ${directory}`,
            ),
          );
      });
    });
  const passwordFile = join(directory, "test-password");
  const connectionString = `postgresql://bank_test:${password}@127.0.0.1:${port}/postgres`;
  postgres = {
    async initialise() {
      await writeFile(passwordFile, password, { mode: 0o600 });
      try {
        await run(
          executable("initdb"),
          [
            "-D",
            join(directory, "cluster"),
            "-U",
            "bank_test",
            `--pwfile=${passwordFile}`,
            "--auth=scram-sha-256",
            "--encoding=UTF8",
            "--locale=C",
          ],
          { windowsHide: true },
        );
      } finally {
        await unlink(passwordFile);
      }
    },
    async start() {
      await run(
        executable("pg_ctl"),
        [
          "-D",
          join(directory, "cluster"),
          "-l",
          join(directory, "postgres.log"),
          "-o",
          `-h 127.0.0.1 -p ${port}`,
          "-w",
          "start",
        ],
        { windowsHide: true },
      );
    },
    async createDatabase() {
      const client = new pg.Client({ connectionString });
      await client.connect();
      try {
        await client.query("CREATE DATABASE bank_test_runtime");
      } finally {
        await client.end();
      }
    },
    async stop() {
      await run(
        executable("pg_ctl"),
        ["-D", join(directory, "cluster"), "-m", "fast", "-w", "stop"],
        { windowsHide: true },
      );
    },
  };
} else {
  if (process.platform === "win32" && process.arch === "arm64")
    throw new Error(
      "On ARM Windows, set POSTGRES_BIN to a portable x64 PostgreSQL bin folder (see docs/testing.md).",
    );
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  postgres = new EmbeddedPostgres({
    databaseDir: directory,
    user: "bank_test",
    password,
    port,
    persistent: true,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: () => {},
  });
}
let started = false;
try {
  await postgres.initialise();
  await postgres.start();
  started = true;
  await postgres.createDatabase("bank_test_runtime");
  const child = spawn(
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      "tests/api.test.js",
      "tests/postgres.test.js",
      "tests/startup.test.js",
    ],
    {
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        TEST_DATABASE_URL: `postgresql://bank_test:${password}@127.0.0.1:${port}/bank_test_runtime`,
      },
    },
  );
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
} finally {
  if (started) await postgres.stop();
}
