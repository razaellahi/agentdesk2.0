import { expect, test } from "@playwright/test";
import { expectShell, login } from "./helpers";

test("realtime dashboard: a new user starts empty, adds widgets, and no-data answers are not errors", async ({
  page,
}) => {
  await login(page, "agent");
  await expectShell(page);
  // cim-customer answers 404 when the user has never saved a layout: the page must still open.
  await page.goto("./insights/realtime");
  await expect(page.getByText("Create your first widget")).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);

  const addWidget = async (title: string, category: string, metric: string) => {
    await page.getByRole("button", { name: "Add widget" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add widget" });
    await dialog.getByLabel("Title", { exact: true }).fill(title);
    await dialog
      .locator("label", { hasText: /^Category/ })
      .locator("select")
      .selectOption(category);
    await dialog
      .locator("label", { hasText: /^Metric/ })
      .locator("select")
      .selectOption({ label: metric });
    await dialog.getByRole("button", { name: "Save widget" }).click();
    await expect(dialog).toHaveCount(0);
  };
  await addWidget("My performance", "AGENTS", "Agent Performance Statistics");
  await expect(page.getByText("My performance")).toBeVisible();
  await expect(page.getByText("14").first()).toBeVisible();

  // realtime-reports answers "no data yet" with 404 and an empty body.
  await addWidget("Abandoned", "QUEUES", "Abandoned Ratio");
  await expect(page.getByText("Abandoned", { exact: true })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);

  await page.getByRole("button", { name: "Save dashboard" }).click();
  await expect(page.getByText("Dashboard saved")).toBeVisible();
  await page.reload();
  await expect(page.getByText("My performance")).toBeVisible();
});
