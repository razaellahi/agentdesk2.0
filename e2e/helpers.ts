import { expect, type Page } from "@playwright/test";

export async function login(page: Page, username: string, password = "secret") {
  await page.goto("./");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
}

export async function expectShell(page: Page) {
  await expect(page.getByRole("navigation", { name: "Main navigation" }).first()).toBeVisible();
}
