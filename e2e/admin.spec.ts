import { expect, test } from "@playwright/test";
import { expectShell, login } from "./helpers";

test.describe("admin: Agent Desk settings", () => {
  test("Cisco and CX Voice are mutually exclusive and saving works", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);
    await page.goto("./admin/settings");
    const cisco = page.getByRole("switch", { name: "Cisco", exact: true });
    const cx = page.getByRole("switch", { name: "CX Voice", exact: true });
    await expect(cx).toBeChecked();
    await expect(cisco).toBeDisabled();
    await cx.click();
    await expect(cisco).toBeEnabled();
    await cisco.click();
    await expect(cx).toBeDisabled();
    await expect(page.getByLabel("Finesse Deployment Type")).toBeVisible();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Settings saved/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  });

  test("invalid wrap-up time blocks saving", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);
    await page.goto("./admin/settings");
    await page.getByLabel("Wrap-Up Time").fill("5");
    await expect(page.getByText("Must be between 15 and 1800")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("leaving with unsaved changes asks for confirmation", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);
    await page.goto("./admin/settings");
    await page.getByRole("switch", { name: "Emojis" }).click();
    await page.getByRole("link", { name: "Media Recordings" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("Unsaved changes");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/admin\/settings$/);
  });

  test("view-only users see a read-only form", async ({ page }) => {
    await login(page, "viewer");
    await expectShell(page);
    await page.goto("./admin/settings");
    await expect(page.getByText("You can view these settings but not change them.")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Emojis" })).toBeDisabled();
  });
});

test.describe("admin scope", () => {
  test("Teams and QM models are available; Languages and Translations stay hidden", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);
    await expect(page.getByRole("link", { name: "Teams", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "QM Models", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Languages", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Translations", exact: true })).toHaveCount(0);
    for (const path of ["./admin/languages", "./admin/translations"]) {
      await page.goto(path);
      await expect(page.getByText("Page not found", { exact: true })).toBeVisible();
    }
  });
});
