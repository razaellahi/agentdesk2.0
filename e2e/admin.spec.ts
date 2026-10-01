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
    await page.getByRole("link", { name: "Languages" }).click();
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

test.describe("admin: languages", () => {
  test("removing the default language moves the default and saves", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);
    await page.goto("./admin/languages");
    const english = page.getByRole("checkbox", { name: /English/ });
    await expect(english).toHaveAttribute("aria-checked", "true");
    await english.click();
    await expect(english).toHaveAttribute("aria-checked", "false");
    // The next selected language (French) becomes the default.
    await expect(page.getByRole("radio", { name: "Make French the default language" })).toBeChecked();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Language settings saved")).toBeVisible();
  });
});

test.describe("admin: translations", () => {
  test("edit, count changes and save", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);
    await page.goto("./admin/translations");
    const first = page.getByRole("textbox", { name: "English: login.login" });
    await first.fill("Sign in");
    await expect(page.getByText("1 unsaved change")).toBeVisible();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("English translations saved successfully")).toBeVisible();
  });

  test("compare mode shows two languages side by side", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);
    await page.goto("./admin/translations");
    await page.getByRole("button", { name: "Compare" }).click();
    await expect(page.getByRole("textbox", { name: "French: login.login" })).toHaveValue("Connexion");
    await expect(page.getByRole("textbox", { name: "English: login.login" })).toHaveValue("Login");
  });

  test("importing a file with missing keys is rejected with details", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);
    await page.goto("./admin/translations");
    await page.getByRole("button", { name: "More" }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: "Import" }).click();
    await (
      await chooser
    ).setFiles({
      name: "fr.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ login: { login: "x" } })),
    });
    await expect(page.getByText("Translation file validation failed")).toBeVisible();
    await page.getByRole("button", { name: "Details" }).click();
    await expect(page.getByRole("dialog")).toContainText("login.username");
  });
});
