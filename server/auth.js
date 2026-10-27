import { assert } from "./errors.js";
import { digest, token, hashPassword, verifyPassword } from "./crypto.js";
import { fields } from "./validation.js";
import { audit } from "./banking.js";
export async function auth(db, config) {
  const dummy = await hashPassword(token());
  const cookieName = config.production ? "__Host-bank_session" : "bank_session";
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    secure: config.production,
    path: "/",
  };
  async function login(req, res) {
    fields(req.body, ["accountNumber", "password"]);
    const { accountNumber, password } = req.body;
    assert(
      typeof accountNumber === "string" &&
        /^[A-Za-z0-9-]{1,32}$/.test(accountNumber) &&
        typeof password === "string" &&
        Buffer.byteLength(password) <= 128,
      401,
      "Invalid credentials or account unavailable",
    );
    const result = await db.transaction(async (c) => {
      const user = (
        await c.query("SELECT * FROM users WHERE login=$1 FOR UPDATE", [
          accountNumber,
        ])
      ).rows[0];
      const valid = await verifyPassword(
        password,
        user?.password_hash ?? dummy,
      );
      const account = user
        ? (
            await c.query("SELECT status FROM accounts WHERE user_id=$1", [
              user.id,
            ])
          ).rows[0]
        : null;
      if (!user || !valid || user.locked || account?.status === "CLOSED") {
        if (user && !user.locked && account?.status !== "CLOSED") {
          await c.query(
            "UPDATE users SET failed_attempts=LEAST(failed_attempts+1,3),locked=(failed_attempts+1>=3) WHERE id=$1",
            [user.id],
          );
          await audit(
            c,
            user.failed_attempts >= 2 ? "LOGIN_LOCKED" : "LOGIN_FAILED",
            user.id,
          );
          if (user.failed_attempts >= 2)
            await c.query("DELETE FROM sessions WHERE user_id=$1", [user.id]);
        } else await audit(c, "LOGIN_REJECTED", user?.id ?? null);
        return null;
      }
      await c.query("UPDATE users SET failed_attempts=0 WHERE id=$1", [
        user.id,
      ]);
      if (req.cookies[cookieName])
        await c.query("DELETE FROM sessions WHERE token_hash=$1", [
          digest(req.cookies[cookieName]),
        ]);
      await c.query("DELETE FROM sessions WHERE expires_at <= now()");
      const sessionToken = token(),
        csrfToken = token();
      await c.query(
        "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES($1,$2,$3,$4)",
        [
          digest(sessionToken),
          user.id,
          csrfToken,
          new Date(Date.now() + config.sessionMinutes * 60000),
        ],
      );
      await audit(c, "LOGIN_SUCCESS", user.id);
      return { sessionToken, csrfToken, role: user.role };
    });
    assert(result, 401, "Invalid credentials or account unavailable");
    res.cookie(cookieName, result.sessionToken, {
      ...cookieOptions,
      maxAge: config.sessionMinutes * 60000,
    });
    res.json({
      status: "OK",
      data: { role: result.role, csrfToken: result.csrfToken },
    });
  }
  async function required(req, res, next) {
    const sessionToken = req.cookies[cookieName];
    assert(
      typeof sessionToken === "string" && /^[a-f0-9]{64}$/.test(sessionToken),
      401,
      "Please sign in",
    );
    const session = (
      await db.query(
        "SELECT u.id,u.role,u.locked,s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
        [digest(sessionToken)],
      )
    ).rows[0];
    assert(session && !session.locked, 401, "Session expired. Please sign in");
    req.user = session;
    if (!["GET", "HEAD"].includes(req.method))
      assert(
        req.get("X-CSRF-Token") === session.csrf_token,
        403,
        "Invalid request token",
      );
    next();
  }
  function admin(req, res, next) {
    assert(req.user.role === "ADMIN", 403, "Administrator access required");
    next();
  }
  async function logout(req, res) {
    await db.transaction(async (c) => {
      await c.query("DELETE FROM sessions WHERE token_hash=$1", [
        digest(req.cookies[cookieName]),
      ]);
      await audit(c, "LOGOUT", req.user.id);
    });
    res.clearCookie(cookieName, cookieOptions);
    res.json({ status: "OK" });
  }
  return { login, required, admin, logout };
}
