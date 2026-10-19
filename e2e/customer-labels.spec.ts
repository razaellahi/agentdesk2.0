import { expect, test } from "@playwright/test";
import { login, expectShell } from "./helpers";

test("labels added to a customer are saved, shown as a colour dot in the phonebook and in the form again", async ({
  page,
}) => {
  await login(page, "agent");
  await expectShell(page);
  await page.goto("./customers");
  const rowOf = () => page.getByRole("row").filter({ hasText: "Ami" });

  await rowOf().hover();
  await rowOf().getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("button", { expanded: false, name: /Search|labels/i })
    .first()
    .click();
  await page.getByRole("option", { name: /VIP/ }).click();
  // Escape closes the picker, not the whole form.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Edit Customer" })).toBeVisible();
  await page.getByRole("button", { name: /^save$/i }).click();

  // The API stores ids; the row shows the label as a colour dot named by its tooltip, as unified-agent does.
  await expect(rowOf().getByTitle("VIP")).toBeVisible();

  await rowOf().hover();
  await rowOf().getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("VIP")).toBeVisible();
});
