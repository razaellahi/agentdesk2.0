import { expect, test } from "@playwright/test";
import { expectShell, login } from "./helpers";

test.describe("teams and QM models", () => {
  test("admin can create a team and a scoring model", async ({ page }) => {
    await login(page, "admin");
    await expectShell(page);

    await page.goto("./admin/teams");
    await expect(page.getByRole("cell", { name: "Support", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "New team" }).click();
    await page.getByLabel("Name").fill("Night Desk");
    await page.getByLabel("Description").fill("After-hours support");
    await page.getByLabel("Supervisor").selectOption({ label: "supervisor (Omar Khan)" });
    await page.getByRole("checkbox", { name: /hassan/ }).check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Team created")).toBeVisible();
    const row = page.getByRole("row", { name: /Night Desk/ });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "1" }).click();
    await expect(page.getByRole("dialog")).toContainText("hassan");

    await page.goto("./admin/qm-models");
    await expect(page.getByRole("cell", { name: "Greeting quality" })).toBeVisible();
    await page.getByRole("button", { name: "New model" }).click();
    await page.getByLabel("Title").fill("Courtesy check");
    await page.getByLabel("Section").fill("Courtesy");
    await page.getByLabel("Question").fill("Used the customer name");
    const options = page.getByLabel("Option");
    await options.nth(0).fill("Yes");
    await options.nth(1).fill("No");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Model created")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Courtesy check" })).toBeVisible();
  });

  test("a supervisor manages only their teams and can view QM models", async ({ page }) => {
    await login(page, "supervisor");
    await expectShell(page);
    await page.goto("./admin/teams");
    await expect(page.getByRole("cell", { name: "Support", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "New team" }).click();
    await expect(page.getByLabel("Supervisor")).toBeDisabled();
    await expect(page.getByLabel("Supervisor")).toHaveValue("u-sup-1");

    await page.goto("./admin/qm-models");
    await expect(page.getByRole("cell", { name: "Greeting quality" })).toBeVisible();
    await expect(page.getByText("You can view these settings but not change them.")).toBeVisible();
    await expect(page.getByRole("button", { name: "New model" })).toHaveCount(0);
  });
});
