import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("customer generates a statement and validates the selected period", async ({
  page,
}) => {
  const headers = { Origin: "http://127.0.0.1:4173" };
  const login = await page.request.post("/api/login", {
    headers,
    data: { accountNumber: "test-admin", password: "FictionalAdmin!2026" },
  });
  const csrf = (await login.json()).data.csrfToken;
  const created = await page.request.post("/api/admin/accounts", {
    headers: { ...headers, "X-CSRF-Token": csrf },
    data: {
      name: "Statement Browser Customer",
      initialDeposit: "1000",
      password: "StatementCustomer!2026",
    },
  });
  expect(created.status()).toBe(201);
  const account = (await created.json()).data;
  await page.request.post("/api/logout", {
    headers: { ...headers, "X-CSRF-Token": csrf },
    data: {},
  });
  await page.goto("/");
  await page.getByLabel("Account number or admin login").fill(account.number);
  await page
    .getByLabel("Password", { exact: true })
    .fill("StatementCustomer!2026");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await page
    .getByRole("button", { name: "Account statement", exact: true })
    .click();
  await page.getByRole("button", { name: "Generate statement" }).click();
  const statement = page.locator(".account-statement");
  await expect(statement).toContainText(account.number);
  await expect(statement.locator("tbody tr")).toHaveCount(1);
  await expect(statement.locator(".statement-totals")).toContainText(
    "₹1,000.00",
  );
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const csv = await downloaded;
  expect(csv.suggestedFilename()).toContain(`statement-${account.number}-`);
  const contents = await readFile(await csv.path(), "utf8");
  expect(contents).toContain('"Opening balance (INR)","0.00"');
  expect(contents).toContain('"Closing balance (INR)","1000.00"');
  expect(contents).toContain('"OPENING","1000.00","","1000.00"');
  await page.evaluate(() => {
    window.print = () => {
      window.statementPrinted = true;
    };
  });
  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  expect(await page.evaluate(() => window.statementPrinted)).toBe(true);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("aside")).toBeHidden();
  await expect(page.locator(".statement-controls")).toBeHidden();
  await expect(page.locator(".statement-actions")).toBeHidden();
  await expect(statement).toBeVisible();
  await page.screenshot({
    path: "test-results/statement-print.png",
    fullPage: true,
  });
  await page.pdf({
    path: "test-results/statement.pdf",
    preferCSSPageSize: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(statement).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/statement-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Statement start date").fill("2026-02-02");
  await page.getByLabel("Statement end date").fill("2026-02-01");
  await expect(statement).toHaveCount(0);
  await page.getByRole("button", { name: "Generate statement" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Start date must be on or before end date",
  );
  await page.getByLabel("Statement start date").fill("2000-01-01");
  await page.getByLabel("Statement end date").fill("2000-01-31");
  await page.getByRole("button", { name: "Generate statement" }).click();
  await expect(statement).toContainText("No transactions in this period");
});
