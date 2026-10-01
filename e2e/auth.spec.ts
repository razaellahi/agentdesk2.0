import { expect, test } from "@playwright/test";
import { expectShell, login } from "./helpers";

test.describe("authentication", () => {
  test("rejects bad credentials with the server message", async ({ page }) => {
    await login(page, "agent", "wrong");
    await expect(page.getByRole("alert")).toContainText("Invalid user credentials");
  });

  test("agent lands on the workspace and sees only permitted modules", async ({ page }) => {
    await login(page, "agent");
    await expectShell(page);
    await expect(page).toHaveURL(/\/conversations$/);
    const nav = page.getByRole("navigation", { name: "Main navigation" }).first();
    await expect(nav.getByRole("link", { name: "Customers", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Agent Desk Settings" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Audit Logs" })).toHaveCount(0);
  });

  test("admin without agent role gets settings + recordings admin, no workspace", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);
    const nav = page.getByRole("navigation", { name: "Main navigation" }).first();
    await expect(nav.getByRole("link", { name: "Agent Desk Settings" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Customer Interactions" })).toHaveCount(0);
  });

  test("forbidden module shows 403 instead of a blank page", async ({ page }) => {
    await login(page, "agent");
    await expectShell(page);
    await page.goto("./admin/settings");
    await expect(page.getByText("You don't have access to this page")).toBeVisible();
  });

  test("session survives a reload via the refresh token", async ({ page }) => {
    await login(page, "supervisor");
    await expectShell(page);
    await page.goto("./supervise/queues");
    await page.reload();
    await expectShell(page);
    await expect(page).toHaveURL(/\/supervise\/queues$/);
  });

  test("two-factor (authenticator app) accepts the right code", async ({ page }) => {
    await login(page, "otp");
    await expect(page.getByText("Two-factor authentication")).toBeVisible();
    await page.getByLabel("Enter the OTP sent to your Authenticator App to login.").fill("000000");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Incorrect code")).toBeVisible();
    await page.getByLabel("Enter the OTP sent to your Authenticator App to login.").fill("123456");
    await page.getByRole("button", { name: "Submit" }).click();
    await expectShell(page);
  });

  test("forced password change opens the policy dialog", async ({ page }) => {
    await login(page, "agent", "expired");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Must be at least 8 characters long")).toBeVisible();
  });

  test("logout returns to login", async ({ page }) => {
    await login(page, "agent");
    await expectShell(page);
    await page.getByRole("button", { name: "Preferences" }).click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
  });

  test("legacy hash links are honoured after login", async ({ page }) => {
    await page.goto("./#/supervisor/queue-chats");
    await page.getByLabel("Username").fill("supervisor");
    await page.getByLabel("Password", { exact: true }).fill("secret");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/supervise\/queues/);
  });
});

test.describe("language, direction and theme", () => {
  test("switching to Arabic flips the document to RTL", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Choose Language" }).click();
    await page.getByRole("menuitem", { name: "العربية" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("dark theme applies data-theme and persists", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("button", { name: "Theme" }).click();
    await page.getByRole("menuitem", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
