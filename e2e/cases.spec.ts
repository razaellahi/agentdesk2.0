import { expect, test, type Page } from "@playwright/test";
import { expectShell, login } from "./helpers";

/** One active conversation with Amina (customer-a), as the socket would deliver it. */
async function seedConversation(page: Page) {
  await expect(page.getByRole("complementary", { name: "Conversations" })).toBeVisible();
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const [{ conversationFixture }, { useConversationStore }, { useBoardStore }] = await Promise.all([
      module("test/conversations.ts"),
      module("features/workspace/store/conversationStore.ts"),
      module("features/workspace/store/boardStore.ts"),
    ]);
    const a = conversationFixture("a", "Amina");
    useConversationStore.setState({ byId: { a }, order: ["a"], activeId: "a" });
    useBoardStore.getState().reset();
    useBoardStore.getState().open("a");
  });
  await expect(page.getByRole("region", { name: "Amina", exact: true })).toBeVisible();
}

test("supervisor works the case Workbench from the Cases menu", async ({ page }) => {
  await login(page, "supervisor");
  await expectShell(page);
  const nav = page.getByRole("navigation", { name: "Main navigation" }).first();
  await nav.getByRole("button", { name: "Case management" }).click();
  await page.getByRole("link", { name: "Cases", exact: true }).click();
  await expect(page).toHaveURL(/\/cases$/);
  await expect(page.getByText("Router keeps dropping")).toBeVisible();
  await page.getByText("Router keeps dropping").click();
  const pane = page.getByRole("complementary", { name: "Case details" });
  await expect(pane.getByText("CASE-20261019-00003")).toBeVisible();
  await expect(
    pane.getByText("Customer reports intermittent drops every evening since the upgrade."),
  ).toBeVisible();
  await pane.getByRole("button", { name: "Assign", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: /Team member/ }).click();
  await dialog.getByRole("combobox", { name: "Team", exact: true }).click();
  await page.getByRole("option", { name: "Technical", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Team member" }).click();
  await page.getByRole("option", { name: /Bilal Hassan/ }).click();
  await dialog.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(pane.getByText("Bilal Hassan")).toBeVisible();
});

test("agent sees, links and creates cases from the conversation Cases tab", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedConversation(page);
  await page.getByRole("tab", { name: "Cases", exact: true }).first().click();
  await expect(page.getByText("Card payment declined twice")).toBeVisible();
  await expect(page.getByText("Refund not received")).toBeVisible();

  const card = page.locator("article").filter({ hasText: "Card payment declined twice" });
  await card.getByRole("button", { name: "Link conversation" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Link conversation" }).click();
  await expect(page.getByText("Conversation linked to CASE-20261019-00001.")).toBeVisible();
  await expect(page.getByTestId("linked-conversation-banner")).toBeVisible();

  // The linked case opens straight from the banner, with the comment thread.
  await page.getByTestId("linked-conversation-banner").getByRole("button", { name: "Open case" }).click();
  await expect(page.getByText("Please check with the gateway, @Sana Iqbal.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Conversation linked" })).toBeDisabled();
});
