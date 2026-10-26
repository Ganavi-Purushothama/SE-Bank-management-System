// Local development only: persistent project-owned PostgreSQL, no system service.
import {
  readFile,
  writeFile,
  mkdir,
  access,
  readdir,
  copyFile,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import net from "node:net";
import pg from "pg";
import { database, migrate } from "../server/db.js";
import { provisionAdmin } from "../server/banking.js";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const home = join(root, "data", "local-postgres");
await mkdir(home, { recursive: true });
const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};
const suffix = process.platform === "win32" ? ".exe" : "";
const candidates = [
  process.env.POSTGRES_BIN,
  join(root, "build/postgres-portable/package/native/bin"),
].filter(Boolean);
if (process.platform === "win32") {
  const installed = join(
    process.env.ProgramFiles || "C:/Program Files",
    "PostgreSQL",
  );
  if (await exists(installed))
    for (const version of (await readdir(installed)).sort().reverse())
      candidates.push(join(installed, version, "bin"));
}
let bin;
for (const candidate of candidates)
  if (await exists(join(candidate, "initdb" + suffix))) {
    bin = resolve(candidate);
    break;
  }
if (!bin)
  throw new Error(
    "PostgreSQL binaries not found. Set POSTGRES_BIN to a PostgreSQL bin folder; see docs/testing.md for the portable Windows download.",
  );
async function command(name, args, allowFailure = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(join(bin, name + suffix), args, {
      windowsHide: true,
      stdio: "ignore",
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `${name} timed out; inspect data/local-postgres/postgres.log`,
        ),
      );
    }, 60000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      if (code === 0 || allowFailure) resolve(code);
      else
        reject(
          new Error(
            `${name} failed (${code}); inspect data/local-postgres/postgres.log`,
          ),
        );
    });
  });
}
const stateFile = join(home, "credentials.json");
let state;
if (await exists(stateFile))
  state = JSON.parse(await readFile(stateFile, "utf8"));
else {
  if (await exists(join(home, "cluster")))
    throw new Error(
      "A local cluster exists without its credentials. Restore its credentials file; no existing data was changed.",
    );
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(55432, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => probe.close(resolve));
  const configured = process.env.ADMIN_PASSWORD || "";
  state = {
    port: 55432,
    ownerPassword: randomBytes(32).toString("hex"),
    appPassword: randomBytes(32).toString("hex"),
    adminLogin: /^[A-Za-z0-9-]{1,32}$/.test(process.env.ADMIN_LOGIN || "")
      ? process.env.ADMIN_LOGIN
      : "bank-admin",
    adminPassword:
      configured.length >= 12 &&
      Buffer.byteLength(configured) <= 128 &&
      !configured.includes("REPLACE_")
        ? configured
        : randomBytes(18).toString("base64url"),
  };
  await writeFile(stateFile, JSON.stringify(state), {
    mode: 0o600,
    flag: "wx",
  });
}
const cluster = join(home, "cluster");
if (!(await exists(join(cluster, "PG_VERSION")))) {
  const passwordFile = join(home, "init-password");
  await writeFile(passwordFile, state.ownerPassword, { mode: 0o600 });
  const { unlink } = await import("node:fs/promises");
  try {
    await command("initdb", [
      "-D",
      cluster,
      "-U",
      "bank_local",
      `--pwfile=${passwordFile}`,
      "--auth=scram-sha-256",
      "--encoding=UTF8",
      "--locale=C",
    ]);
  } finally {
    await unlink(passwordFile);
  }
}
let startedHere = false,
  child,
  cleaning;
async function cleanup() {
  if (cleaning) return cleaning;
  cleaning = (async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => {
        child.once("exit", resolve);
        child.kill();
      });
    }
    if (startedHere) {
      await command("pg_ctl", ["-D", cluster, "-m", "fast", "-w", "stop"]);
      startedHere = false;
    }
  })();
  return cleaning;
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    cleanup()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
try {
  if ((await command("pg_ctl", ["-D", cluster, "status"], true)) !== 0) {
    await command("pg_ctl", [
      "-D",
      cluster,
      "-l",
      join(home, "postgres.log"),
      "-o",
      `-h 127.0.0.1 -p ${state.port}`,
      "-w",
      "start",
    ]);
    startedHere = true;
  }
  const owner = new pg.Client({
    host: "127.0.0.1",
    port: state.port,
    user: "bank_local",
    password: state.ownerPassword,
    database: "postgres",
    connectionTimeoutMillis: 5000,
  });
  await owner.connect();
  try {
    if (
      !(await owner.query("SELECT 1 FROM pg_roles WHERE rolname='bank_app'"))
        .rowCount
    ) {
      const sql = (
        await owner.query(
          "SELECT format('CREATE ROLE bank_app LOGIN PASSWORD %L', $1::text) AS sql",
          [state.appPassword],
        )
      ).rows[0].sql;
      await owner.query(sql);
    }
    if (
      !(
        await owner.query(
          "SELECT 1 FROM pg_database WHERE datname='team6_bank'",
        )
      ).rowCount
    )
      await owner.query("CREATE DATABASE team6_bank OWNER bank_app");
  } finally {
    await owner.end();
  }
  const url = `postgresql://bank_app:${encodeURIComponent(state.appPassword)}@127.0.0.1:${state.port}/team6_bank`;
  const db = database(url);
  try {
    await migrate(db);
    const existing = (
      await db.query("SELECT role FROM users WHERE login=$1", [
        state.adminLogin,
      ])
    ).rows[0];
    if (!existing)
      await provisionAdmin(db, state.adminLogin, state.adminPassword);
    else if (existing.role !== "ADMIN")
      throw new Error(
        "Configured local admin login belongs to a customer; no credentials were overwritten.",
      );
  } finally {
    await db.close();
  }
  const envPath = join(root, ".env");
  const original = (await exists(envPath))
    ? await readFile(envPath, "utf8")
    : await readFile(join(root, ".env.example"), "utf8");
  if (
    (await exists(envPath)) &&
    !(await exists(join(root, ".env.before-local")))
  )
    await copyFile(envPath, join(root, ".env.before-local"));
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error(
      "PORT must be between 1024 and 65535 for local development",
    );
  const origin = `http://localhost:${port}`;
  const settings = {
    DATABASE_URL: url,
    ADMIN_LOGIN: state.adminLogin,
    PORT: String(port),
    HOST: "127.0.0.1",
    APP_ORIGIN: origin,
    NODE_ENV: "development",
  };
  let contents = original.replace(/^ADMIN_PASSWORD=.*(?:\r?\n|$)/gm, "");
  for (const [key, value] of Object.entries(settings)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    contents = pattern.test(contents)
      ? contents.replace(pattern, () => line)
      : contents.trimEnd() + "\n" + line + "\n";
  }
  await writeFile(envPath, contents, { mode: 0o600 });
  await writeFile(
    join(root, "data/local-login.txt"),
    `LOCAL DEVELOPMENT ONLY\nLogin: ${state.adminLogin}\nPassword: ${state.adminPassword}\nURL: ${origin}\n\nKeep this file private. PostgreSQL data persists in data/local-postgres.\n`,
    { mode: 0o600 },
  );
  console.log("Project database ready on loopback port " + state.port + ".");
  console.log(
    "Your sign-in details are saved privately in data/local-login.txt.",
  );
  console.log("Building the banking engine…");
  const build = spawn(process.execPath, ["scripts/build.mjs"], {
    windowsHide: true,
    stdio: "inherit",
  });
  const buildCode = await new Promise((resolve, reject) => {
    build.once("error", reject);
    build.once("exit", resolve);
  });
  if (buildCode !== 0) throw new Error("Banking engine build failed");
  const env = { ...process.env, ...settings };
  delete env.ADMIN_PASSWORD;
  child = spawn(process.execPath, ["server/index.js"], {
    windowsHide: true,
    stdio: "inherit",
    env,
  });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  process.exitCode = code ?? 0;
} finally {
  await cleanup();
}
