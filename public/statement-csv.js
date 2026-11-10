// Quote every field and neutralize spreadsheet formulas in customer-supplied text.
function cell(value) {
  let text = String(value ?? "");
  if (/^\s*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
function decimal(minor) {
  const n = BigInt(minor),
    absolute = n < 0n ? -n : n;
  return `${n < 0n ? "-" : ""}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}
export function statementCsv(s) {
  const rows = [
    ["Bank Six account statement", "INR"],
    ["Account holder", s.account.name],
    ["Account number", s.account.number],
    ["Account type", s.account.type],
    ["From (inclusive, UTC)", s.period.from],
    ["To (inclusive, UTC)", s.period.to],
    ["Generated at (UTC)", s.generatedAt],
    ["Opening balance (INR)", decimal(s.openingBalance)],
    ["Total credits (INR)", decimal(s.totalCredits)],
    ["Total debits (INR)", decimal(s.totalDebits)],
    ["Closing balance (INR)", decimal(s.closingBalance)],
    ["Transaction count", s.transactionCount],
    [],
    [
      "Date and time (UTC)",
      "Reference",
      "Type",
      "Credit (INR)",
      "Debit (INR)",
      "Balance after (INR)",
    ],
    ...s.items.map((item) => {
      const credit = ["OPENING", "DEPOSIT"].includes(item.type);
      return [
        new Date(item.created_at).toISOString(),
        item.id,
        item.type,
        credit ? decimal(item.amount) : "",
        credit ? "" : decimal(item.amount),
        decimal(item.balance_after),
      ];
    }),
  ];
  return (
    "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n"
  );
}
