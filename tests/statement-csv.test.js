import test from "node:test";
import assert from "node:assert/strict";
import { statementCsv } from "../public/statement-csv.js";

test("CSV exports metadata, exact paise, quoting and formula-safe customer text", () => {
  const s = {
    account: {
      name: '=HYPERLINK("unsafe"), customer',
      number: "6000000000001",
      type: "SAVINGS",
    },
    period: { from: "2026-02-01", to: "2026-02-28" },
    generatedAt: "2026-03-01T00:00:00.000Z",
    openingBalance: 100000,
    totalCredits: 25055,
    totalDebits: 5055,
    closingBalance: 120000,
    transactionCount: 2,
    items: [
      {
        id: "credit-reference",
        type: "DEPOSIT",
        amount: 25055,
        balance_after: 125055,
        created_at: "2026-02-01T00:00:00Z",
      },
      {
        id: "debit-reference",
        type: "WITHDRAW",
        amount: 5055,
        balance_after: 120000,
        created_at: "2026-02-28T23:59:59Z",
      },
    ],
  };
  const csv = statementCsv(s);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(
    csv.includes('"Account holder","\'=HYPERLINK(""unsafe""), customer"\r\n'),
  );
  assert.ok(csv.includes('"Opening balance (INR)","1000.00"'));
  assert.ok(csv.includes('"Closing balance (INR)","1200.00"'));
  assert.ok(csv.includes('"credit-reference","DEPOSIT","250.55","","1250.55"'));
  assert.ok(csv.includes('"debit-reference","WITHDRAW","","50.55","1200.00"'));
  for (const name of [
    "+formula",
    "-formula",
    "@formula",
    "  =formula",
    "\tformula",
    "\nformula",
  ]) {
    assert.ok(
      statementCsv({ ...s, account: { ...s.account, name } }).includes(
        `"Account holder","'${name}"`,
      ),
    );
  }
  const empty = statementCsv({ ...s, items: [], transactionCount: 0 });
  assert.ok(empty.includes('"Transaction count","0"'));
  assert.ok(!empty.includes("credit-reference"));
});
