import { test, expect } from "@playwright/test";
const adminPassword = "FictionalAdmin!2026",
  customerPassword = "FictionalCustomer!2026";
async function login(page, login, password) {
  await page.goto("/");
  await page.getByLabel("Account number or admin login").fill(login);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in securely" }).click();
}
test("customer banking and administrator lifecycle through the real UI", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "6000000000001", customerPassword);
  await expect(
    page.getByRole("heading", { name: "Hello, Fictional." }),
  ).toBeVisible();
  await expect(page.locator(".balance .amount")).toHaveText("₹1,000.00");
  await page.getByRole("button", { name: "↓ Deposit" }).click();
  await page.getByLabel("Amount (INR)").fill("250.55");
  await page.getByRole("button", { name: "Review deposit" }).click();
  await page.getByRole("button", { name: "Confirm deposit" }).click();
  await expect(page.locator(".balance .amount")).toHaveText("₹1,250.55");
  await page.getByRole("button", { name: "↑ Withdraw" }).click();
  await page.getByLabel("Amount (INR)").fill("50.55");
  await page.getByRole("button", { name: "Review withdraw" }).click();
  await page.getByRole("button", { name: "Confirm withdraw" }).click();
  await expect(page.locator(".balance .amount")).toHaveText("₹1,200.00");
  await page.screenshot({
    path: "test-results/customer-dashboard.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "Account directory", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "↑ Withdraw" }).click();
  await page.getByLabel("Amount (INR)").fill("1200.01");
  await page.getByRole("button", { name: "Review withdraw" }).click();
  await page.getByRole("button", { name: "Confirm withdraw" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Insufficient available funds",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "View all transactions" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByLabel("Transaction type").selectOption("DEPOSIT");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Personal details", exact: true })
    .click();
  await page.getByLabel("Full name").fill("Fictional Mira Updated");
  await page
    .getByRole("textbox", { name: "Address", exact: true })
    .fill('<img src=x onerror="window.xss=true">');
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue(
    "Fictional Mira Updated",
  );
  // A second browser session exercises admin-only creation, viewing, search, audit and closure.
  const adminContext = await browser.newContext(),
    adminPage = await adminContext.newPage();
  await login(adminPage, "test-admin", adminPassword);
  await expect(
    adminPage.getByRole("heading", { name: "Account directory" }),
  ).toBeVisible();
  await adminPage
    .getByRole("button", { name: "Open an account", exact: true })
    .click();
  await adminPage.getByLabel("Full name").fill("Fictional Second");
  await adminPage.getByLabel("Opening deposit (INR)").fill("500");
  await adminPage
    .getByLabel("Customer password (12–128 bytes)")
    .fill(customerPassword);
  await adminPage
    .getByRole("button", { name: "Create savings account" })
    .click();
  await expect(adminPage.locator("tbody tr")).toHaveCount(1);
  const secondNumber = await adminPage
    .locator("tbody tr td")
    .nth(1)
    .textContent();
  await adminPage.getByRole("button", { name: "Details", exact: true }).click();
  await expect(adminPage.locator("#inspection")).toContainText(
    "Fictional Second",
  );
  // Owner isolation checked using the customer's real browser session and cookie.
  const secondId = await adminPage
    .locator("[data-view]")
    .getAttribute("data-view");
  const forbidden = await page.request.get(`/api/accounts/${secondId}`);
  expect(forbidden.status()).toBe(404);
  await adminPage
    .getByLabel("Search by name or account number")
    .fill("6000000000001");
  await adminPage
    .getByRole("button", { name: "Search accounts", exact: true })
    .click();
  await expect(adminPage.locator("tbody tr")).toHaveCount(1);
  await adminPage.getByRole("button", { name: "Details", exact: true }).click();
  await expect(adminPage.locator("#inspection")).toContainText(
    '<img src=x onerror="window.xss=true">',
  );
  await expect(adminPage.locator("#inspection img")).toHaveCount(0);
  expect(await adminPage.evaluate(() => window.xss)).toBeUndefined();
  await adminPage.getByRole("button", { name: "Close", exact: true }).click();
  await adminPage
    .getByLabel("Type the account number to confirm")
    .fill("6000000000001");
  await adminPage.getByRole("button", { name: "Close & settle" }).click();
  await expect(
    adminPage.getByRole("row").filter({ hasText: "Fictional Mira Updated" }),
  ).toContainText("CLOSED");
  await page
    .getByRole("button", { name: "Account overview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign in securely" }),
  ).toBeVisible();
  await adminPage
    .getByRole("button", { name: "Security activity", exact: true })
    .click();
  await expect(adminPage.locator("tbody")).toContainText(
    "ACCOUNT_CLOSED_SETTLED",
  );
  await adminPage
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(
    adminPage.getByRole("button", { name: "Sign in securely" }),
  ).toBeVisible();
  expect((await adminPage.request.get("/api/me")).status()).toBe(401);
  expect(secondNumber).toMatch(/^6\d+$/);
  expect(errors).toEqual([]);
  await adminContext.close();
});
test("authentication errors, masked password and browser form validation", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page.getByLabel("Password", { exact: true }).getAttribute("type"),
  ).toBe("password");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page.getByLabel("Account number or admin login")).toBeFocused();
  await page.getByLabel("Account number or admin login").fill("nonexistent");
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Invalid credentials or account unavailable",
  );
});
test("loading and API failure states are actionable and mobile layout does not overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "test-admin", adminPassword);
  await expect(
    page.getByRole("heading", { name: "Account directory" }),
  ).toBeVisible();
  await page.route("**/api/admin/audit*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        status: "REJECTED",
        reason: "Service temporarily unavailable",
      }),
    });
  });
  await page
    .getByRole("button", { name: "Security activity", exact: true })
    .click();
  await expect(page.getByText("Loading your banking workspace…")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "We couldn't load this view." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/admin/audit*");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Security activity" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-admin.png",
    fullPage: true,
  });
});
