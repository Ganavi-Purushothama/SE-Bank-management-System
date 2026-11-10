import { chromium, expect } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdir, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { database, migrate } from "../server/db.js";
import { provisionAdmin, banking } from "../server/banking.js";
import { createApp } from "../server/app.js";

// Real PostgreSQL, new schema per recording; never records real credentials or touches customer accounts.
process.loadEnvFile(".env");
const source = new URL(process.env.DATABASE_URL);
if (!["127.0.0.1", "localhost"].includes(source.hostname))
  throw new Error("Demo recording is restricted to a local database");
const schema = "demo_" + randomUUID().replaceAll("-", "");
const control = database(source.toString());
await control.query(`CREATE SCHEMA ${schema}`);
source.searchParams.set("options", `-c search_path=${schema}`);
const db = database(source.toString());
let browser, server, context;
const output = resolve("docs/evaluation");
await mkdir(output, { recursive: true });
await mkdir("build/demo-raw", { recursive: true });
try {
  await migrate(db);
  const secret = randomBytes(24).toString("base64url");
  await provisionAdmin(db, "sprint-demo-admin", secret);
  const admin = (
    await db.query("SELECT id,role FROM users WHERE login='sprint-demo-admin'")
  ).rows[0];
  const config = {
    origin: "http://127.0.0.1:4174",
    production: false,
    minInitial: 50000,
    minBalance: 0,
    sessionMinutes: 30,
  };
  const account = await banking(db, config).create(
    {
      name: "Fictional Mira",
      phone: "0000000000",
      address: "Demo address — fictional",
      initialDeposit: "1000",
      password: secret,
    },
    admin,
  );
  const app = await createApp(db, config);
  server = app.listen(4174, "127.0.0.1");
  await once(server, "listening");
  browser = await chromium.launch();
  context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: "build/demo-raw", size: { width: 1280, height: 900 } },
  });
  // Authenticate via the real API before recording any sign-in form.
  const result = await context.request.post(config.origin + "/api/login", {
    headers: { Origin: config.origin },
    data: { accountNumber: account.number, password: secret },
  });
  if (result.status() !== 200) throw new Error("Customer demo login failed");
  const page = await context.newPage();
  const video = page.video();
  await page.goto(config.origin);
  await expect(page.locator(".balance .amount")).toHaveText("₹1,000.00");
  const start = Date.now();
  async function caption(title, description) {
    await page.evaluate(
      ({ title, description }) => {
        let el = document.querySelector("#demo-caption");
        if (!el) {
          el = document.createElement("div");
          el.id = "demo-caption";
          el.style.cssText =
            "position:fixed;bottom:0;left:0;right:0;z-index:10000;background:#102f29;color:white;padding:15px 30px;box-shadow:0 -2px 10px #0002;font-family:Segoe UI,Arial;pointer-events:none";
          document.body.append(el);
        }
        el.replaceChildren();
        const heading = document.createElement("strong");
        heading.style.cssText =
          "display:block;font-size:20px;margin-bottom:4px;color:#d7e9b2";
        heading.textContent = title;
        const text = document.createElement("span");
        text.style.fontSize = "16px";
        text.textContent = description;
        el.append(heading, text);
      },
      { title, description },
    );
  }
  async function until(seconds) {
    const delay = start + seconds * 1000 - Date.now();
    if (delay < 0)
      throw new Error("Demo actions exceeded the planned scene duration");
    await page.waitForTimeout(delay);
  }
  await caption(
    "TEAM 6 · SPRINT 1 · BANK MANAGEMENT SYSTEM",
    "HTML/CSS/JavaScript → Express → C++ rules engine → PostgreSQL. Real operations with fictional demo data.",
  );
  await until(7);
  await caption(
    "CUSTOMER DASHBOARD · BMS-F-007 / F-016",
    "Authenticated customer sees only their own account. Opening balance: ₹1,000.00.",
  );
  await page.getByRole("button", { name: "↓ Deposit" }).click();
  await page.getByLabel("Amount (INR)").fill("250.55");
  await until(13);
  await page.getByRole("button", { name: "Review deposit" }).click();
  await until(16);
  await page.getByRole("button", { name: "Confirm deposit" }).click();
  await expect(page.locator(".balance .amount")).toHaveText("₹1,250.55");
  await caption(
    "DEPOSIT COMMITTED · C++ + POSTGRESQL",
    "₹250.55 deposited. Balance and transaction record commit together: ₹1,250.55.",
  );
  await until(22);
  await page.getByRole("button", { name: "↑ Withdraw" }).click();
  await page.getByLabel("Amount (INR)").fill("50.55");
  await page.getByRole("button", { name: "Review withdraw" }).click();
  await until(26);
  await page.getByRole("button", { name: "Confirm withdraw" }).click();
  await expect(page.locator(".balance .amount")).toHaveText("₹1,200.00");
  await caption(
    "WITHDRAWAL COMMITTED · BMS-F-013",
    "₹50.55 withdrawn. The C++ engine approves the rules; PostgreSQL locks and updates the balance.",
  );
  await until(32);
  await page.getByRole("button", { name: "↑ Withdraw" }).click();
  await page.getByLabel("Amount (INR)").fill("1200.01");
  await page.getByRole("button", { name: "Review withdraw" }).click();
  await page.getByRole("button", { name: "Confirm withdraw" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Insufficient available funds",
  );
  await caption(
    "INVALID WITHDRAWAL REJECTED · BMS-F-014",
    "₹1,200.01 exceeds the available balance. Clear error; no balance change or success ledger entry.",
  );
  await until(39);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "View all transactions" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await caption(
    "PERSISTED MINI-STATEMENT · INTEGRATION EVIDENCE",
    "Opening, deposit and withdrawal match the real database. History is a Sprint 2 backlog item already integrated.",
  );
  await until(46);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  const adminLogin = await context.request.post(config.origin + "/api/login", {
    headers: { Origin: config.origin },
    data: { accountNumber: "sprint-demo-admin", password: secret },
  });
  if (adminLogin.status() !== 200) throw new Error("Admin demo login failed");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Account directory", exact: true }),
  ).toBeVisible();
  await caption(
    "ADMINISTRATOR WORKSPACE · BMS-F-001 / F-004",
    "Role-protected account search, details, creation, unlock and closure. Customer and admin access differ.",
  );
  await until(53);
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await expect(page.locator("#inspection")).toContainText("₹1,200.00");
  await caption(
    "SPRINT 1 · TRACEABLE TO SRS / SAD / TEST PLAN",
    "PR #13 merged · Actions passed · 19 unit/API, 18 PostgreSQL, 3 browser tests. Evaluation guide links the evidence.",
  );
  await until(62);
  await context.close();
  context = null;
  const raw = await video.path();
  const candidates = [
    process.env.FFMPEG_PATH,
    join(
      process.env.LOCALAPPDATA || "",
      "ms-playwright/ffmpeg-1013/ffmpeg-win64.exe",
    ),
  ].filter(Boolean);
  let ffmpeg;
  for (const path of candidates) {
    try {
      await access(path);
      ffmpeg = path;
      break;
    } catch {}
  }
  if (!ffmpeg)
    throw new Error(
      "Set FFMPEG_PATH to an ffmpeg executable with VP9 encoding support",
    );
  const target = join(output, "sprint1-demo.webm");
  const encoder = spawn(
    ffmpeg,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      raw,
      "-t",
      "60",
      "-an",
      "-c:v",
      "libvpx-vp9",
      "-crf",
      "35",
      "-b:v",
      "0",
      target,
    ],
    { windowsHide: true, stdio: "inherit" },
  );
  const [code] = await once(encoder, "exit");
  if (code !== 0) throw new Error("Demo video encoding failed");
  console.log(
    "Recorded and verified real banking workflow. Output: docs/evaluation/sprint1-demo.webm (60 seconds, captioned, no audio).",
  );
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await db.close();
  await control.query(`DROP SCHEMA ${schema} CASCADE`);
  await control.close();
}
