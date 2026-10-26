import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { testDatabase, adminPassword, customerPassword } from "./fixture.js";
test(
  "documented migration/admin/start entrypoints and restart preserve data and sessions",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const db = await testDatabase();
    let running;
    t.after(async () => {
      if (running) {
        const exit = once(running, "exit");
        running.kill();
        await exit;
      }
      await db.close();
    });
    const probe = net.createServer();
    await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
    const port = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    const env = {
      ...process.env,
      DATABASE_URL: db.connectionString,
      APP_ORIGIN: origin,
      HOST: "127.0.0.1",
      PORT: String(port),
      ADMIN_LOGIN: "startup-admin",
      ADMIN_PASSWORD: adminPassword,
      NODE_ENV: "development",
    };
    async function command(script) {
      const child = spawn(process.execPath, [script], {
        env,
        stdio: "ignore",
        windowsHide: true,
      });
      const [code] = await once(child, "exit");
      assert.equal(code, 0, `${script} must exit successfully`);
    }
    await command("scripts/migrate.mjs");
    await command("scripts/migrate.mjs");
    await command("scripts/admin.mjs");
    async function start() {
      running = spawn(process.execPath, ["server/index.js"], {
        env,
        stdio: "ignore",
        windowsHide: true,
      });
      for (let i = 0; i < 100; i++) {
        try {
          const response = await fetch(origin + "/api/health");
          if (response.ok) return;
        } catch {}
        if (running.exitCode !== null)
          throw new Error("Application entrypoint exited during startup");
        await delay(50);
      }
      throw new Error("Application did not become ready");
    }
    await start();
    const login = await fetch(origin + "/api/login", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        accountNumber: "startup-admin",
        password: adminPassword,
      }),
    });
    assert.equal(login.status, 200);
    const csrf = (await login.json()).data.csrfToken;
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const response = await fetch(origin + "/api/admin/accounts", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-CSRF-Token": csrf,
      },
      body: JSON.stringify({
        name: "Fictional Restart Customer",
        initialDeposit: "500",
        password: customerPassword,
      }),
    });
    assert.equal(response.status, 201);
    const account = (await response.json()).data;
    const stopped = once(running, "exit");
    running.kill();
    await stopped;
    running = null;
    await start();
    const persisted = await fetch(origin + `/api/accounts/${account.id}`, {
      headers: { Cookie: cookie },
    });
    assert.equal(persisted.status, 200);
    assert.equal((await persisted.json()).data.balance, 50000);
    const history = await fetch(
      origin + `/api/accounts/${account.id}/transactions`,
      { headers: { Cookie: cookie } },
    );
    assert.equal((await history.json()).data.total, 1);
  },
);
