import { assert } from "./errors.js";
import { statementPeriod } from "./validation.js";

export const MAX_STATEMENT_TRANSACTIONS = 10000;

export async function accountStatement(db, bank, id, user, query) {
  const period = statementPeriod(query.from, query.to);
  return db.transaction(async (c) => {
    // All metadata, totals and rows must describe the same committed snapshot.
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const account = await bank.accessible(c, id, user);
    const values = [id, period.from, period.to];
    const bounds =
      "account_id=$1 AND created_at >= ($2::date::timestamp AT TIME ZONE 'UTC') AND created_at < (($3::date + 1)::timestamp AT TIME ZONE 'UTC')";
    const summary = (
      await c.query(
        `
      SELECT
        COALESCE(sum(CASE WHEN type IN ('OPENING','DEPOSIT') THEN amount ELSE -amount END)
          FILTER (WHERE created_at < ($2::date::timestamp AT TIME ZONE 'UTC')),0) AS opening,
        COALESCE(sum(amount) FILTER (WHERE type IN ('OPENING','DEPOSIT') AND created_at >= ($2::date::timestamp AT TIME ZONE 'UTC')),0) AS credits,
        COALESCE(sum(amount) FILTER (WHERE type IN ('WITHDRAW','SETTLEMENT') AND created_at >= ($2::date::timestamp AT TIME ZONE 'UTC')),0) AS debits,
        count(*) FILTER (WHERE created_at >= ($2::date::timestamp AT TIME ZONE 'UTC')) AS count
      FROM transactions WHERE account_id=$1 AND created_at < (($3::date + 1)::timestamp AT TIME ZONE 'UTC')`,
        values,
      )
    ).rows[0];
    const transactionCount = Number(summary.count);
    assert(
      transactionCount <= MAX_STATEMENT_TRANSACTIONS,
      422,
      "Statement exceeds 10,000 transactions. Choose a shorter period",
    );
    const openingBalance = Number(summary.opening),
      totalCredits = Number(summary.credits),
      totalDebits = Number(summary.debits);
    assert(
      [openingBalance, totalCredits, totalDebits].every(Number.isSafeInteger),
      422,
      "Statement totals exceed the supported range. Choose a shorter period",
    );
    const closingBalance = Number(
      BigInt(summary.opening) +
        BigInt(summary.credits) -
        BigInt(summary.debits),
    );
    assert(
      Number.isSafeInteger(closingBalance),
      422,
      "Statement balance exceeds the supported range",
    );
    const { rows } = await c.query(
      `SELECT id,type,amount,balance_after,created_at FROM transactions
      WHERE ${bounds} ORDER BY created_at ASC,id ASC`,
      values,
    );
    return {
      account: {
        id: account.id,
        number: account.number,
        name: account.name,
        type: account.type,
      },
      period,
      currency: "INR",
      generatedAt: new Date().toISOString(),
      openingBalance,
      closingBalance,
      totalCredits,
      totalDebits,
      transactionCount,
      items: rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
        balance_after: Number(r.balance_after),
        status: "COMMITTED",
      })),
    };
  });
}
