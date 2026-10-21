import { expect, test, type Page } from "@playwright/test";
import { expectShell, login } from "./helpers";

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

test("typing / lists the quick replies, narrows by tag and message, and Enter inserts the one on", async ({
  page,
}) => {
  await login(page, "agent");
  await expectShell(page);
  await seedConversation(page);
  const box = page.getByPlaceholder("Type a message to the customer...");
  const list = page.getByRole("listbox", { name: "Saved replies" });

  await box.click();
  await box.pressSequentially("/");
  await expect(list.getByRole("option").first()).toBeVisible();
  const all = await list.getByRole("option").count();
  expect(all).toBeGreaterThan(3);

  // A tag chip narrows the list and leaves the cursor in the message box.
  await page.getByRole("button", { name: "delivery", exact: true }).click();
  await expect(list.getByRole("option")).toHaveCount(1);
  await expect(box).toBeFocused();
  await page.getByRole("button", { name: "delivery", exact: true }).click();
  await expect(list.getByRole("option")).toHaveCount(all);

  // Typing after the / searches tags first, then messages; the arrows and Enter pick one.
  await box.pressSequentially("ref");
  await expect(list.getByRole("option").first()).toContainText("30 days");
  await page.keyboard.press("Enter");
  await expect(box).toHaveValue(/^You can return most items within 30 days/);
  await expect(list).toHaveCount(0);

  // Escape closes the list for that text without touching it.
  await box.fill("");
  await box.pressSequentially("/hel");
  await expect(list).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  await expect(box).toHaveValue("/hel");
});

test("the lightning button opens the same list with its own search", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedConversation(page);
  const box = page.getByPlaceholder("Type a message to the customer...");

  await box.fill("Hello Amina,");
  await page.getByRole("button", { name: "Quick Replies" }).click();
  const search = page.getByRole("textbox", { name: "Search by tag or message" });
  await expect(search).toBeFocused();
  await search.fill("warranty");
  await page.keyboard.press("Enter");
  // The reply follows what was already written.
  await expect(box).toHaveValue(/^Hello Amina, All blenders come with a 2 year warranty/);
  await expect(search).toHaveCount(0);
});
