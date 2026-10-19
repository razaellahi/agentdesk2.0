import { expect, test } from "@playwright/test";
import { expectShell, login } from "./helpers";

test("agents page: supervisors change state only where legacy allowed it", async ({ page }) => {
  await login(page, "supervisor");
  await expectShell(page);
  await page.goto("./supervise/agents");
  const row = (name: string) => page.getByRole("row").filter({ hasText: name });
  await expect(row("Hamza Ali")).toBeVisible();
  // Not ready: may be made ready or logged out.
  await expect(row("Hamza Ali").getByRole("button", { name: "Ready" })).toBeVisible();
  await expect(row("Hamza Ali").getByRole("button", { name: "Logout" })).toBeVisible();
  // Ready: only logout; ready with a reserved channel: nothing (unified-agent isReservedMrdExists).
  await expect(row("Sana Iqbal").getByRole("button", { name: "Ready" })).toHaveCount(0);
  await expect(row("Sana Iqbal").getByRole("button", { name: "Logout" })).toBeVisible();
  await expect(row("Zara Noor").getByRole("button")).toHaveCount(0);
});

test("agents page: an agent sees their own team without state actions", async ({ page }) => {
  const row = (name: string) => page.getByRole("row").filter({ hasText: name });
  await login(page, "agent");
  await expectShell(page);
  await page.goto("./supervise/agents");
  await expect(row("Hamza Ali")).toBeVisible();
  await expect(page.locator("main").getByRole("button", { name: /^(Ready|Logout)$/ })).toHaveCount(0);
});

test("blocked modules explain whether it is permission or deployment", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await page.goto("./supervise/active");
  await expect(page.getByText("You don't have access to this page")).toBeVisible();

  await page.evaluate(() => sessionStorage.clear());
  await login(page, "supervisor");
  await expectShell(page);
  // Recording Rules are switched off on the EFCX profile (VRS develop), not withheld from the supervisor.
  await page.goto("./recordings/rules");
  await expect(page.getByText("Not available here")).toBeVisible();
});

test("subscribed lists: inbox of waiting pull-mode requests with join and manage-only end", async ({
  page,
}) => {
  await login(page, "supervisor");
  await expectShell(page);
  await page.goto("./subscribed-lists");
  // Let the session finish loading the list catalogue, so it does not replace the seeded one.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = "features/workspace/store/pullModeStore.ts";
        const { usePullModeStore } = await import(`/agent-desk/src/${path}`);
        return usePullModeStore.getState().lists.length;
      }),
    )
    .toBeGreaterThan(0);
  await page.evaluate(async () => {
    const path = "features/workspace/store/pullModeStore.ts";
    const { usePullModeStore } = await import(`/agent-desk/src/${path}`);
    const session = (id: string, name: string) => ({
      id: `s-${id}`,
      conversationId: `conv-${id}`,
      channel: { channelType: { name: "WHATSAPP" } },
      channelData: { channelCustomerIdentifier: "+923001112233" },
      customer: { _id: `c-${id}`, firstName: name },
    });
    const store = usePullModeStore.getState();
    store.setLists([
      { id: "list-1", name: "Billing" },
      { id: "list-2", name: "Sales" },
    ]);
    store.setSubscribed([{ id: "list-1", name: "Billing" }]);
    store.setRequests([
      {
        id: "r1",
        listId: "list-1",
        status: "CREATED",
        time: Date.now() - 120_000,
        channelSession: session("1", "Amina"),
      },
      {
        id: "r2",
        listId: "list-1",
        status: "ACTIVE",
        time: Date.now() - 60_000,
        channelSession: session("2", "Bilal"),
      },
      {
        id: "r3",
        listId: "list-1",
        status: "WRAP_UP",
        time: Date.now(),
        channelSession: session("3", "Hidden"),
      },
    ]);
  });
  const rows = page.locator("main tbody tr");
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Amina" }).getByRole("button", { name: "Join" })).toBeVisible();
  await expect(rows.filter({ hasText: "Amina" }).getByRole("button", { name: "End" })).toBeVisible();
  // Unread filter (status CREATED) narrows to Amina.
  await page.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option", { name: "Unread" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Amina");
  // Manage subscriptions lists the catalogue with the subscribed list checked.
  await page.getByRole("button", { name: "Manage Subscriptions" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("checkbox", { name: "Billing" })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "Sales" })).not.toBeChecked();
});

test("PII follows unified-agent: supervisors with view_pii see names in their chats", async ({ page }) => {
  await login(page, "supervisor");
  await expectShell(page);
  const rail = page.getByRole("complementary", { name: "Conversations" });
  await expect(rail).toBeVisible();
  await page.evaluate(async () => {
    const m = (p: string) => import(`/agent-desk/src/${p}`);
    const [{ conversationFixture }, { useConversationStore }] = await Promise.all([
      m("test/conversations.ts"),
      m("features/workspace/store/conversationStore.ts"),
    ]);
    const a = conversationFixture("a", "Amina");
    useConversationStore.setState({ byId: { a }, order: ["a"], activeId: "a" });
  });
  await expect(rail.getByRole("button", { name: "Amina", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Amina", exact: true })).toBeVisible();
  await expect(page.getByText("••••")).toHaveCount(0);
});

test("PII follows unified-agent: the phonebook shows full values with customer:manage", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await page.goto("./customers");
  await expect(page.getByRole("cell", { name: "Amina", exact: true })).toBeVisible();
});
