import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { auth } from "./auth.js";
import { banking, accountColumns, present, audit } from "./banking.js";
import { assert } from "./errors.js";
import { uuid, fields, page, text } from "./validation.js";
export async function createApp(db, config, engine) {
  const app = express();
  const authentication = await auth(db, config);
  const bank = banking(db, config, engine);
  app.disable("x-powered-by");
  app.use(
    helmet({
      strictTransportSecurity: config.production ? undefined : false,
      contentSecurityPolicy: {
        directives: {
          "upgrade-insecure-requests": config.production ? [] : null,
        },
      },
    }),
  );
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set("X-Request-Id", req.requestId);
    next();
  });
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(req.method)) {
      assert(
        req.get("Origin") === config.origin,
        403,
        "Request origin is not permitted",
      );
      assert(
        req.is("application/json"),
        415,
        "Content-Type must be application/json",
      );
    }
    next();
  });
  app.use(express.json({ limit: "8kb", strict: true }));
  app.use(cookieParser());
  app.get("/api/health", async (req, res) => {
    await db.query("SELECT 1");
    res.json({ status: "OK" });
  });
  app.get("/api/config", (req, res) =>
    res.json({
      status: "OK",
      data: {
        minInitial: config.minInitial,
        minBalance: config.minBalance,
        currency: "INR",
      },
    }),
  );
  app.post(
    "/api/login",
    rateLimit({
      windowMs: 15 * 60000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (req, res) =>
        res.status(429).json({
          status: "REJECTED",
          reason: "Too many login attempts. Try later",
        }),
    }),
    authentication.login,
  );
  app.use("/api", authentication.required);
  app.post("/api/logout", authentication.logout);
  app.get("/api/me", async (req, res) => {
    const accounts = (
      await db.query(
        `SELECT ${accountColumns} FROM accounts WHERE user_id=$1`,
        [req.user.id],
      )
    ).rows.map(present);
    res.json({
      status: "OK",
      data: { role: req.user.role, csrfToken: req.user.csrf_token, accounts },
    });
  });
  app.get("/api/accounts/:id", async (req, res) => {
    const row = await bank.accessible(db, req.params.id, req.user);
    const { user_id: _userId, ...safe } = row;
    res.json({ status: "OK", data: present(safe) });
  });
  app.patch("/api/accounts/:id", async (req, res) =>
    res.json({
      status: "OK",
      data: await bank.update(req.params.id, req.user, req.body),
    }),
  );
  for (const [path, operation] of [
    ["deposit", "DEPOSIT"],
    ["withdraw", "WITHDRAW"],
  ]) {
    app.post(`/api/accounts/:id/${path}`, async (req, res) => {
      fields(req.body, ["amount"]);
      const data = await bank.change(
        req.params.id,
        req.user,
        operation,
        req.body.amount,
        req.get("Idempotency-Key"),
      );
      res.json({ status: "APPROVED", data });
    });
  }
  app.get("/api/accounts/:id/transactions", async (req, res) => {
    await bank.accessible(db, req.params.id, req.user);
    const currentPage = page(req.query.page),
      values = [req.params.id],
      bounds = {};
    // Issue #9: oldest-first ordering is available for statements; newest-first stays the default.
    const order = req.query.order ?? "desc";
    assert(["asc", "desc"].includes(order), 400, "Invalid sort order");
    let where = "account_id=$1";
    if (req.query.type) {
      assert(
        ["DEPOSIT", "WITHDRAW", "OPENING", "SETTLEMENT"].includes(
          req.query.type,
        ),
        400,
        "Invalid transaction type",
      );
      values.push(req.query.type);
      where += ` AND type=$${values.length}`;
    }
    for (const [key, comparison] of [
      ["from", ">="],
      ["to", "<"],
    ]) {
      if (req.query[key]) {
        const value = req.query[key];
        assert(
          typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(value)) &&
            new Date(value).toISOString().slice(0, 10) === value,
          400,
          "Invalid date",
        );
        values.push(
          key === "to"
            ? new Date(Date.parse(value) + 86400000).toISOString()
            : value,
        );
        bounds[key] = values[values.length - 1];
        where += ` AND created_at${comparison}$${values.length}::timestamptz`;
      }
    }
    if (req.query.from && req.query.to)
      assert(
        req.query.from <= req.query.to,
        400,
        "Start date must precede end date",
      );
    const totals = (
      await db.query(
        `SELECT count(*) AS count,
          COALESCE(SUM(amount) FILTER (WHERE type IN ('DEPOSIT','OPENING')),0) AS credits,
          COALESCE(SUM(amount) FILTER (WHERE type IN ('WITHDRAW','SETTLEMENT')),0) AS debits
         FROM transactions WHERE ${where}`,
        values,
      )
    ).rows[0];
    const total = Number(totals.count);
    // Statement balances ignore the type filter: they describe the account over the selected dates.
    const balanceBefore = async (limit) =>
      Number(
        (
          await db.query(
            "SELECT balance_after FROM transactions WHERE account_id=$1 AND created_at < COALESCE($2::timestamptz,'infinity') ORDER BY created_at DESC,id DESC LIMIT 1",
            [req.params.id, limit ?? null],
          )
        ).rows[0]?.balance_after ?? 0,
      );
    const summary = {
      count: total,
      totalCredits: Number(totals.credits),
      totalDebits: Number(totals.debits),
      openingBalance: bounds.from ? await balanceBefore(bounds.from) : 0,
      closingBalance: await balanceBefore(bounds.to),
    };
    values.push(20, (currentPage - 1) * 20);
    const rows = (
      await db.query(
        `SELECT id,type,amount,balance_after,created_at FROM transactions WHERE ${where} ORDER BY created_at ${order},id ${order} LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      )
    ).rows;
    res.json({
      status: "OK",
      data: {
        items: rows.map((r) => ({
          ...r,
          amount: Number(r.amount),
          balance_after: Number(r.balance_after),
          status: "COMMITTED",
        })),
        page: currentPage,
        total,
        pageSize: 20,
        order,
        summary,
      },
    });
  });
  app.use("/api/admin", authentication.admin);
  app.get("/api/admin/accounts", async (req, res) => {
    const search = text(req.query.search ?? "", "Search", 100, false),
      currentPage = page(req.query.page);
    const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const where =
      "FROM accounts a JOIN users u ON u.id=a.user_id WHERE a.number ILIKE $1 OR a.name ILIKE $1";
    const total = Number(
      (await db.query(`SELECT count(*) AS count ${where}`, [pattern])).rows[0]
        .count,
    );
    const rows = (
      await db.query(
        `SELECT a.*,u.locked ${where} ORDER BY a.created_at DESC,a.id LIMIT 20 OFFSET $2`,
        [pattern, (currentPage - 1) * 20],
      )
    ).rows;
    res.json({
      status: "OK",
      data: {
        items: rows.map(({ user_id: _userId, ...r }) => present(r)),
        page: currentPage,
        total,
        pageSize: 20,
      },
    });
  });
  app.post("/api/admin/accounts", async (req, res) =>
    res
      .status(201)
      .json({ status: "OK", data: await bank.create(req.body, req.user) }),
  );
  app.post("/api/admin/accounts/:id/close", async (req, res) =>
    res.json({
      status: "OK",
      data: await bank.close(req.params.id, req.user, req.body),
    }),
  );
  app.post("/api/admin/accounts/:id/unlock", async (req, res) => {
    fields(req.body, []);
    uuid(req.params.id);
    await db.transaction(async (c) => {
      const row = await bank.accessible(c, req.params.id, req.user, true);
      assert(row.status === "ACTIVE", 409, "Account is closed");
      await c.query(
        "UPDATE users SET locked=false,failed_attempts=0 WHERE id=$1",
        [row.user_id],
      );
      await audit(c, "ACCOUNT_UNLOCKED", req.user.id, row.id);
    });
    res.json({ status: "OK" });
  });
  app.get("/api/admin/audit", async (req, res) => {
    const currentPage = page(req.query.page);
    const items = (
      await db.query(
        "SELECT id,event,actor_id,account_id,created_at FROM audit_events ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $1",
        [(currentPage - 1) * 20],
      )
    ).rows;
    const total = Number(
      (await db.query("SELECT count(*) AS count FROM audit_events")).rows[0]
        .count,
    );
    res.json({
      status: "OK",
      data: { items, page: currentPage, total, pageSize: 20 },
    });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ status: "REJECTED", reason: "Endpoint not found" }),
  );
  app.use(
    express.static(fileURLToPath(new URL("../public", import.meta.url)), {
      index: "index.html",
    }),
  );
  app.use((error, req, res, _next) => {
    const status = error.status || (error.code === "23505" ? 409 : 500);
    if (status >= 500)
      console.error(
        JSON.stringify({
          event: "request_failed",
          requestId: req.requestId,
          code: error.code || "INTERNAL",
        }),
      );
    const reason =
      status >= 500
        ? "Service temporarily unavailable"
        : error.type === "entity.parse.failed"
          ? "Invalid JSON request"
          : error.code === "23505"
            ? "A unique identifier already exists; retry the request"
            : error.message;
    res
      .status(status)
      .json({ status: "REJECTED", reason, requestId: req.requestId });
  });
  return app;
}
