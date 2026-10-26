import { randomUUID, randomInt } from "node:crypto";
import { assert } from "./errors.js";
import { amount, text, password, uuid, fields } from "./validation.js";
import { hashPassword } from "./crypto.js";
import { evaluate } from "./core.js";
export const accountColumns =
  "id, number, name, phone, address, type, balance, status, created_at, closed_at";
export const moneyNumber = (value) => Number(value);
export function present(row) {
  return { ...row, balance: moneyNumber(row.balance), currency: "INR" };
}
export async function audit(client, event, actor = null, account = null) {
  await client.query(
    "INSERT INTO audit_events(id,event,actor_id,account_id) VALUES($1,$2,$3,$4)",
    [randomUUID(), event, actor, account],
  );
}
export async function provisionAdmin(db, login, secret) {
  login = text(login, "Login", 32);
  password(secret);
  assert(/^[a-zA-Z0-9-]+$/.test(login), 400, "Invalid admin login");
  const hash = await hashPassword(secret);
  await db.transaction(async (c) => {
    await c.query(
      "INSERT INTO users(id,login,password_hash,role) VALUES($1,$2,$3,'ADMIN')",
      [randomUUID(), login, hash],
    );
  });
}
export function banking(db, config, engine = evaluate) {
  async function accessible(c, id, user, lock = false) {
    uuid(id);
    const { rows } = await c.query(
      `SELECT * FROM accounts WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
      [id],
    );
    const row = rows[0];
    assert(
      row && (user.role === "ADMIN" || row.user_id === user.id),
      404,
      "Account not found",
    );
    assert(
      user.role === "ADMIN" || row.status === "ACTIVE",
      403,
      "Account is closed",
    );
    return row;
  }
  return {
    accessible,
    async create(body, actor) {
      fields(body, ["name", "phone", "address", "password", "initialDeposit"]);
      const name = text(body.name, "Name", 100),
        phone = text(body.phone ?? "", "Phone", 30, false),
        address = text(body.address ?? "", "Address", 300, false);
      const initial = amount(body.initialDeposit),
        hash = await hashPassword(password(body.password));
      const balance = await engine("OPENING", 0, initial, config.minInitial);
      return db.transaction(async (c) => {
        const id = randomUUID(),
          userId = randomUUID(),
          number = `6${randomInt(100000000, 999999999)}${randomInt(100, 999)}`;
        await c.query(
          "INSERT INTO users(id,login,password_hash,role) VALUES($1,$2,$3,'CUSTOMER')",
          [userId, number, hash],
        );
        await c.query(
          "INSERT INTO accounts(id,number,user_id,name,phone,address,balance) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [id, number, userId, name, phone, address, balance],
        );
        await c.query(
          "INSERT INTO transactions(id,account_id,type,amount,balance_after,request_key) VALUES($1,$2,'OPENING',$3,$3,$4)",
          [randomUUID(), id, initial, randomUUID()],
        );
        await audit(c, "ACCOUNT_CREATED", actor.id, id);
        return present(
          (
            await c.query(
              `SELECT ${accountColumns} FROM accounts WHERE id=$1`,
              [id],
            )
          ).rows[0],
        );
      });
    },
    async change(id, user, operation, rawAmount, key) {
      const minor = amount(rawAmount);
      assert(
        typeof key === "string" && /^[A-Za-z0-9_-]{16,100}$/.test(key),
        400,
        "A 16–100 character Idempotency-Key is required",
      );
      return db.transaction(async (c) => {
        const row = await accessible(c, id, user, true);
        assert(user.role === "CUSTOMER", 403, "Customer access required");
        assert(row.status === "ACTIVE", 409, "Account is closed");
        const previous = (
          await c.query(
            "SELECT * FROM transactions WHERE account_id=$1 AND request_key=$2",
            [id, key],
          )
        ).rows[0];
        if (previous) {
          assert(
            previous.type === operation && Number(previous.amount) === minor,
            409,
            "Idempotency key was used for a different request",
          );
          return {
            transactionId: previous.id,
            newBalance: Number(previous.balance_after),
            replayed: true,
          };
        }
        const balance = await engine(
          operation,
          Number(row.balance),
          minor,
          config.minBalance,
        );
        await c.query("UPDATE accounts SET balance=$1 WHERE id=$2", [
          balance,
          id,
        ]);
        const transactionId = randomUUID();
        await c.query(
          "INSERT INTO transactions(id,account_id,type,amount,balance_after,request_key) VALUES($1,$2,$3,$4,$5,$6)",
          [transactionId, id, operation, minor, balance, key],
        );
        // Issue #5: record every committed financial operation in the audit log
        await audit(
          c,
          operation === "DEPOSIT"
            ? "DEPOSIT_COMMITTED"
            : "WITHDRAWAL_COMMITTED",
          user.id,
          id,
        );
        return { transactionId, newBalance: balance, replayed: false };
      });
    },
    async update(id, user, body) {
      fields(body, ["name", "phone", "address"]);
      const name = text(body.name, "Name", 100),
        phone = text(body.phone, "Phone", 30, false),
        address = text(body.address, "Address", 300, false);
      return db.transaction(async (c) => {
        const row = await accessible(c, id, user, true);
        assert(row.status === "ACTIVE", 409, "Account is closed");
        await c.query(
          "UPDATE accounts SET name=$1,phone=$2,address=$3 WHERE id=$4",
          [name, phone, address, id],
        );
        await audit(c, "DETAILS_UPDATED", user.id, id);
        return present(
          (
            await c.query(
              `SELECT ${accountColumns} FROM accounts WHERE id=$1`,
              [id],
            )
          ).rows[0],
        );
      });
    },
    async close(id, actor, body) {
      fields(body, ["confirmAccountNumber"]);
      return db.transaction(async (c) => {
        const row = await accessible(c, id, actor, true);
        assert(row.status === "ACTIVE", 409, "Account is already closed");
        assert(
          body.confirmAccountNumber === row.number,
          400,
          "Confirm the exact account number",
        );
        const balance = Number(row.balance);
        if (balance > 0) {
          await engine("SETTLEMENT", balance, balance, 0);
          await c.query(
            "INSERT INTO transactions(id,account_id,type,amount,balance_after,request_key) VALUES($1,$2,'SETTLEMENT',$3,0,$4)",
            [randomUUID(), id, balance, randomUUID()],
          );
        }
        await c.query(
          "UPDATE accounts SET balance=0,status='CLOSED',closed_at=now() WHERE id=$1",
          [id],
        );
        await c.query("DELETE FROM sessions WHERE user_id=$1", [row.user_id]);
        await audit(c, "ACCOUNT_CLOSED_SETTLED", actor.id, id);
        return { settledAmount: balance, currency: "INR" };
      });
    },
  };
}
