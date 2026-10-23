import { expect, test, type Page } from "@playwright/test";
import { expectShell, login } from "./helpers";

async function seedBoard(page: Page) {
  await expect(page.getByRole("complementary", { name: "Conversations" })).toBeVisible();
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const [{ conversationFixture }, { useConversationStore }, { useBoardStore }] = await Promise.all([
      module("test/conversations.ts"),
      module("features/workspace/store/conversationStore.ts"),
      module("features/workspace/store/boardStore.ts"),
    ]);
    const a = conversationFixture("a", "Amina");
    const b = conversationFixture("b", "Bilal");
    a.activeChannelSessions.push({
      ...structuredClone(a.activeChannelSessions[0]),
      id: "a-sms",
      channel: { channelType: { name: "SMS" } },
      isChecked: false,
    });
    useConversationStore.setState({ byId: { a, b }, order: ["a", "b"], activeId: "a" });
    useBoardStore.getState().reset();
    useBoardStore.getState().open("a");
    useBoardStore.getState().openBeside("b");
  });
  await expect(page.getByRole("region", { name: "Amina", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Bilal", exact: true })).toBeVisible();
}
test("split panes keep conversation and channel drafts separate through resizing", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedBoard(page);
  const a = page.getByRole("region", { name: "Amina", exact: true });
  const b = page.getByRole("region", { name: "Bilal", exact: true });
  await a.getByRole("textbox").fill("Draft for Amina");
  await b.getByRole("textbox").fill("Draft for Bilal");
  await a.getByRole("radio", { name: "SMS", exact: true }).click();
  await expect(a.getByRole("textbox")).toHaveValue("");
  await a.getByRole("textbox").fill("SMS draft");
  await a.getByRole("radio", { name: "WEB", exact: true }).click();
  await expect(a.getByRole("textbox")).toHaveValue("Draft for Amina");
  await expect(b.getByRole("textbox")).toHaveValue("Draft for Bilal");
  const rail = page.getByRole("complementary", { name: "Conversations" });
  await rail.getByRole("button", { name: "Remove Bilal from side by side" }).click();
  await expect(b).toHaveCount(0);
  await rail.getByRole("button", { name: "Show Bilal side by side" }).click();
  await expect(a.getByRole("textbox")).toHaveValue("Draft for Amina");
  await expect(b.getByRole("textbox")).toHaveValue("Draft for Bilal");
});

test("conversations are chosen for side by side from the list, and a full board can undo a replacement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1680, height: 1000 });
  await login(page, "agent");
  await expectShell(page);
  const rail = page.getByRole("complementary", { name: "Conversations" });
  await expect(rail).toBeVisible();
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const [{ conversationFixture }, { useConversationStore }] = await Promise.all([
      module("test/conversations.ts"),
      module("features/workspace/store/conversationStore.ts"),
    ]);
    const names = ["Amina", "Bilal", "Chen", "Dania"];
    const byId = Object.fromEntries(
      names.map((n) => [n.toLowerCase(), conversationFixture(n.toLowerCase(), n)]),
    );
    useConversationStore.setState({ byId, order: Object.keys(byId), activeId: null });
  });
  const region = (name: string) => page.getByRole("region", { name, exact: true });
  const row = (name: string) => rail.getByRole("button", { name, exact: true });

  // A plain click shows one conversation; another plain click replaces it.
  await row("Amina").click();
  await expect(region("Amina")).toBeVisible();
  await row("Bilal").click();
  await expect(region("Bilal")).toBeVisible();
  await expect(region("Amina")).toHaveCount(0);

  // The list's side-by-side button and Ctrl/⌘-click add panes beside it.
  await rail.getByRole("button", { name: "Show Amina side by side" }).click();
  await row("Chen").click({ modifiers: ["ControlOrMeta"] });
  for (const name of ["Bilal", "Amina", "Chen"]) await expect(region(name)).toBeVisible();
  await expect(rail.getByRole("button", { name: "Remove Chen from side by side" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Full board: the least recently used pane gives way, with Undo.
  await rail.getByRole("button", { name: "Show Dania side by side" }).click();
  await expect(region("Dania")).toBeVisible();
  await expect(region("Bilal")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(region("Dania")).toHaveCount(0);
  for (const name of ["Bilal", "Amina", "Chen"]) await expect(region(name)).toBeVisible();
});
test("pop-out floats the conversation in this tab, sharing its draft", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedBoard(page);
  const a = page.getByRole("region", { name: "Amina", exact: true });
  await a.getByRole("textbox").fill("Shared draft");
  const popOut = a.getByRole("button", { name: "Pop out", exact: true });
  if (await popOut.count()) await popOut.click();
  else {
    await a.getByRole("button", { name: "View More" }).click();
    await page.getByRole("menuitem", { name: "Pop out" }).click();
  }
  // A floating window inside the same tab (never a second browser tab), labelled by the customer.
  const floating = page.getByRole("dialog", { name: "Amina", exact: true });
  await expect(floating).toBeVisible();
  await expect(floating.getByRole("textbox")).toHaveValue("Shared draft");
  await floating.getByRole("textbox").fill("Changed in pop-out");
  await floating.getByRole("button", { name: "Emoji", exact: true }).click();
  await expect(page.getByRole("button", { name: "😀", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await floating.getByRole("button", { name: "Merge back into main view", exact: true }).click();
  await expect(floating).toHaveCount(0);
  await expect(a.getByRole("textbox")).toHaveValue("Changed in pop-out");
});
test("mobile workspace shows one conversation without overflowing the page", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedBoard(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("region", { name: "Amina", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Bilal", exact: true })).toHaveCount(0);
  expect(await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")).toBe(true);
});

test("attachments stay in their draft until send and can be removed", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedBoard(page);
  const a = page.getByRole("region", { name: "Amina", exact: true });
  const b = page.getByRole("region", { name: "Bilal", exact: true });
  await a.locator('input[type="file"]').setInputFiles({
    name: "account.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Review this attachment"),
  });
  await expect(a.getByRole("list", { name: "Pending attachments" })).toContainText("account.txt");
  await expect(b.getByRole("list", { name: "Pending attachments" })).toHaveCount(0);
  await a.getByRole("radio", { name: "SMS", exact: true }).click();
  await expect(a.getByRole("list", { name: "Pending attachments" })).toHaveCount(0);
  await a.getByRole("radio", { name: "WEB", exact: true }).click();
  await a.getByRole("button", { name: "Remove account.txt", exact: true }).click();
  await expect(a.getByRole("list", { name: "Pending attachments" })).toHaveCount(0);
});

test("email reply-all and forward preserve recipients, subject and attachment context", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await expect(page.getByRole("complementary", { name: "Conversations" })).toBeVisible();
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const [{ conversationFixture }, { useConversationStore }, { useBoardStore }] = await Promise.all([
      module("test/conversations.ts"),
      module("features/workspace/store/conversationStore.ts"),
      module("features/workspace/store/boardStore.ts"),
    ]);
    const a = conversationFixture("mail", "Amina");
    const session = a.activeChannelSessions[0];
    session.channel.channelType.name = "EMAIL";
    session.channel.serviceIdentifier = "support@example.com";
    session.channelData.serviceIdentifier = "support@example.com";
    a.messages = [
      {
        id: "mail-1",
        header: {
          sender: { type: "CUSTOMER" },
          timestamp: Date.now(),
          channelSession: session,
          channelData: session.channelData,
        },
        body: {
          type: "EMAIL",
          subject: "Account question",
          markdownText: "Can you check my account?",
          htmlBody: "<p>Can you check my account?</p>",
          replyTo: ["amina@example.com"],
          from: "amina@example.com",
          recipientsTo: ["support@example.com", "colleague@example.com"],
          recipientsCc: ["manager@example.com"],
          attachments: [{ mediaName: "account.pdf", mediaLabel: "Account document" }],
          emailThreads: [],
        },
      },
    ];
    useConversationStore.setState({ byId: { mail: a }, order: ["mail"], activeId: "mail" });
    useBoardStore.getState().reset();
    useBoardStore.getState().open("mail");
  });
  const pane = page.getByRole("region", { name: "Amina", exact: true });
  await expect(pane.getByLabel("To", { exact: true })).toHaveValue("amina@example.com");
  await expect(pane.getByRole("textbox", { name: "Email subject" })).toHaveValue("Re: Account question");
  await pane.getByRole("button", { name: "Reply all", exact: true }).click();
  await expect(pane.getByLabel("To", { exact: true })).toHaveValue(
    "amina@example.com, colleague@example.com",
  );
  await expect(pane.getByLabel("Cc", { exact: true })).toHaveValue("manager@example.com");
  await pane.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(pane.getByLabel("To", { exact: true })).toHaveValue("");
  await expect(pane.getByRole("textbox", { name: "Email subject" })).toHaveValue("Fwd: Account question");
  await expect(pane.getByRole("list", { name: "Forwarded attachments" })).toContainText("Account document");
  await pane.getByRole("button", { name: "Expand email", exact: true }).click();
  await expect(pane.locator("iframe")).toHaveAttribute("sandbox", "");
});

test("customer history loads older activities and stays read-only", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedBoard(page);
  const a = page.getByRole("region", { name: "Amina", exact: true });
  await a.getByRole("button", { name: "Customer Info", exact: true }).first().click();
  await page.getByRole("tab", { name: "Customer Info", exact: true }).click();
  await page.getByRole("button", { name: "View customer history", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Conversation history", exact: true });
  // The history opens at the newest message (the demo conversations); scroll up to the oldest.
  const seeAtTop = (locator: ReturnType<typeof dialog.getByText>) =>
    expect(async () => {
      await dialog
        .locator('[data-virtuoso-scroller="true"]')
        .first()
        .evaluate((element) => void (element.scrollTop = 0));
      await expect(locator).toBeVisible({ timeout: 1000 });
    }).toPass();
  await seeAtTop(dialog.getByText("Earlier account question", { exact: true }));
  await seeAtTop(dialog.getByRole("region", { name: "Voice activity" }));
  await expect(dialog.getByRole("textbox")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Reply", exact: true })).toHaveCount(0);
  const requestPromise = page.waitForRequest(
    (request) => request.url().includes("/customer-topics/customer/") && request.url().includes("offset=1"),
  );
  await seeAtTop(dialog.getByRole("button", { name: "Load older activities", exact: true }));
  await dialog.getByRole("button", { name: "Load older activities", exact: true }).click();
  const request = await requestPromise;
  expect(request.url()).toContain("limit=50");
  await expect(dialog.getByText(/^\d+ messages$/)).toBeVisible();
});

test("social connector capabilities and private reply context remain explicit", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await expect(page.getByRole("complementary", { name: "Conversations" })).toBeVisible();
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const [{ conversationFixture }, { useConversationStore }] = await Promise.all([
      module("test/conversations.ts"),
      module("features/workspace/store/conversationStore.ts"),
    ]);
    const a = conversationFixture("social", "Amina"),
      session = a.activeChannelSessions[0];
    session.channel.channelType.name = "FACEBOOK";
    session.channel.serviceIdentifier = "support";
    session.channel.channelConnector = {
      channelProviderConfigs: [{ key: "LIKE_SUPPORT_SM", type: "Boolean", value: false }],
    };
    a.messages = [
      {
        id: "comment",
        header: {
          sender: { type: "CUSTOMER" },
          providerMessageId: "provider-comment",
          channelSession: session,
          timestamp: Date.now(),
        },
        body: { type: "COMMENT", itemType: "TEXT", markdownText: "I have a question", postId: "post-1" },
      },
    ];
    useConversationStore.setState({ byId: { social: a }, order: ["social"], activeId: "social" });
  });
  const pane = page.getByRole("region", { name: "Amina", exact: true });
  await expect(pane.getByRole("button", { name: "Comment like", exact: true })).toHaveCount(0);
  // Message actions appear on hover of that message's bubble (or keyboard focus), as in Google Chat.
  const comment = pane.locator('[data-message-id="comment"] [class*="group/bubble"]').first();
  await comment.hover();
  await pane.getByRole("button", { name: "Private reply", exact: true }).click();
  await expect(pane.getByText("Private reply to this comment", { exact: true })).toBeVisible();
  await expect(pane.getByRole("button", { name: "Attach a file", exact: true })).toBeDisabled();
  await comment.hover();
  await pane.getByRole("button", { name: "View full post", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Full social post", exact: true });
  await expect(dialog.getByText("Account support update", { exact: true })).toBeVisible();
  await expect(dialog.getByText("We are here to help", { exact: true })).toBeVisible();
});

test("carousel and list transcripts preserve choices without exposing send actions", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await expect(page.getByRole("complementary", { name: "Conversations" })).toBeVisible();
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const [{ conversationFixture }, { useConversationStore }] = await Promise.all([
      module("test/conversations.ts"),
      module("features/workspace/store/conversationStore.ts"),
    ]);
    const c = conversationFixture("rich", "Amina");
    c.messages = [
      {
        id: "carousel",
        header: { sender: { type: "CUSTOMER" }, timestamp: Date.now() },
        body: {
          type: "CAROUSEL",
          elements: [
            {
              additionalCarouselElementDetails: { title: "Current account" },
              text: "Everyday banking",
              buttons: [{ title: "Selected account", isSelected: true }],
            },
            {
              additionalCarouselElementDetails: { title: "Savings account" },
              text: "Save for later",
              buttons: [{ title: "Unsafe link", type: "linkButton", payload: "javascript:alert(1)" }],
            },
          ],
        },
      },
      {
        id: "list",
        header: { sender: { type: "CUSTOMER" }, timestamp: Date.now() },
        body: {
          type: "LIST",
          additionalDetails: {
            interactive: {
              header: { text: "Help topics" },
              body: { text: "Choose a topic" },
              action: {
                sections: [
                  {
                    title: "Account support",
                    rows: [
                      { id: "balance", title: "Balance inquiry", description: "View your account balance" },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    ];
    useConversationStore.setState({ byId: { rich: c }, order: ["rich"], activeId: "rich" });
  });
  const pane = page.getByRole("region", { name: "Amina", exact: true });
  await expect(pane.getByText("Current account", { exact: true })).toBeVisible();
  await expect(pane.getByText("Balance inquiry", { exact: true })).toBeVisible();
  await expect(pane.getByRole("button", { name: "Selected account", exact: true })).toHaveCount(0);
  await pane.getByRole("button", { name: "Next carousel card", exact: true }).click();
  await expect(pane.getByText("Savings account", { exact: true })).toBeVisible();
  await expect(pane.getByRole("link", { name: "Unsafe link", exact: true })).toHaveCount(0);
});

test("older history preserves the message being read in a long transcript", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedBoard(page);
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const { useConversationStore } = await module("features/workspace/store/conversationStore.ts");
    const c = useConversationStore.getState().byId.a;
    useConversationStore.setState({
      byId: {
        ...useConversationStore.getState().byId,
        a: { ...c, customer: { ...c.customer, _id: "history-long" } },
      },
    });
  });
  await page
    .getByRole("region", { name: "Amina", exact: true })
    .getByRole("button", { name: "Customer Info", exact: true })
    .first()
    .click();
  await page.getByRole("tab", { name: "Customer Info", exact: true }).click();
  await page.getByRole("button", { name: "View customer history", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Conversation history", exact: true });
  await expect(dialog.getByText("50 messages", { exact: true })).toBeVisible();
  await expect(dialog.locator('[data-message-id="long-message-99"]')).toBeVisible();
  const scroller = dialog.locator('[data-virtuoso-scroller="true"]');
  await expect
    .poll(() => scroller.evaluate((node) => (node as unknown as { scrollHeight: number }).scrollHeight))
    .toBeGreaterThan(2000);
  await scroller.hover();
  await page.mouse.wheel(0, -2200);
  await expect(dialog.getByRole("button", { name: "Jump to latest", exact: true })).toBeVisible();
  const findAnchor = () =>
    dialog.locator("[data-message-id]").evaluateAll((nodes) =>
      nodes
        .map((node) => {
          type Rect = { top: number; bottom: number };
          const element = node as unknown as {
            getAttribute(name: string): string;
            getBoundingClientRect(): Rect;
            closest(selector: string): { getBoundingClientRect(): Rect };
          };
          const box = element.getBoundingClientRect(),
            viewport = element.closest("[data-virtuoso-scroller]").getBoundingClientRect();
          return {
            id: element.getAttribute("data-message-id"),
            top: box.top,
            visible: box.top > viewport.top + 30 && box.bottom < viewport.bottom - 30,
          };
        })
        .find((item) => item.visible),
    );
  await expect.poll(findAnchor).toBeTruthy();
  const anchor = (await findAnchor())!;
  await dialog.getByRole("button", { name: "Load older activities", exact: true }).click();
  await expect(dialog.getByText("100 messages", { exact: true })).toBeVisible();
  const anchored = dialog.locator(`[data-message-id="${anchor.id}"]`);
  await expect(anchored).toBeVisible();
  await expect.poll(async () => Math.abs((await anchored.boundingBox())!.y - anchor.top)).toBeLessThan(8);
});

test("dictionary spell check underlines mistakes and replaces them from suggestions", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedBoard(page);
  const a = page.getByRole("region", { name: "Amina", exact: true });
  const box = a.getByRole("textbox");
  await box.fill("Thanks for waiting wrold today");
  // The bundled English dictionary takes over from the browser checker.
  await expect(box).toHaveAttribute("spellcheck", "false");
  await expect(a.locator("span.decoration-wavy", { hasText: "wrold" })).toBeVisible();
  await box.press("Home");
  for (let i = 0; i < 21; i++) await box.press("ArrowRight");
  const bar = a.getByRole("toolbar", { name: /Spelling suggestions for “wrold”/ });
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "world", exact: true }).click();
  await expect(box).toHaveValue("Thanks for waiting world today");
  await expect(a.locator("span.decoration-wavy")).toHaveCount(0);
});

test("voicemail badge shows unread count and drops when a voicemail is played", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  const badge = page.getByRole("link", { name: "2 unread voicemails" });
  await expect(badge).toBeVisible();
  await badge.click();
  await expect(page).toHaveURL(/\/voicemail$/);
  await page.getByRole("button", { name: /Unread/ }).click();
  await page.getByRole("button", { name: "Play" }).first().click();
  const player = page.locator("audio").first();
  await expect(player).toBeVisible();
  await player.dispatchEvent("play");
  await expect(page.getByRole("link", { name: "1 unread voicemail" })).toBeVisible();
});

test("board signals unread background panes and supports Alt shortcuts", async ({ page }) => {
  // Focus-is-width needs room beyond the 320px pane minimum (wide desktop).
  await page.setViewportSize({ width: 1680, height: 1000 });
  await login(page, "agent");
  await expectShell(page);
  await seedBoard(page);
  const a = page.getByRole("region", { name: "Amina", exact: true });
  const b = page.getByRole("region", { name: "Bilal", exact: true });
  const widthGap = async () => (await a.boundingBox())!.width - (await b.boundingBox())!.width;
  const setUnread = (id: string, unread: number) =>
    page.evaluate(
      async ([conversationId, count]) => {
        const path = "features/workspace/store/conversationStore.ts";
        const { useConversationStore } = await import(`/agent-desk/src/${path}`);
        useConversationStore.setState((s: { byId: Record<string, { unread: number }> }) => {
          s.byId[conversationId as string]!.unread = count as number;
        });
      },
      [id, unread] as const,
    );
  await a.getByRole("textbox").click();
  await setUnread("b", 2);
  // Background pane: amber signal with a count; the focused pane is wider.
  await expect(page.getByRole("status").filter({ hasText: "2 new" })).toBeVisible();
  await expect.poll(widthGap).toBeGreaterThan(150);
  // Alt+2 focuses pane 2: it widens and its unread signal clears.
  await page.keyboard.press("Alt+Digit2");
  await expect(page.getByRole("status").filter({ hasText: "2 new" })).toHaveCount(0);
  await expect.poll(widthGap).toBeLessThan(-150);
  // Alt+N jumps to the next conversation with unread messages.
  await setUnread("a", 1);
  await page.keyboard.press("Alt+KeyN");
  await expect.poll(widthGap).toBeGreaterThan(150);
});

test("opening a customer from the phonebook shows their past activities, page by page", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await page.goto("./customers");
  const row = page.getByRole("row").filter({ hasText: "Ami" });
  await row.getByRole("button", { name: "View profile and conversation history" }).click();
  await expect(page).toHaveURL(/\/conversations$/);
  // The phonebook customer has a last name, which the pane is named by.
  const pane = page.getByRole("region", { name: "Amina Raza", exact: true });
  // The transcript opens at its newest message (the demo conversations); the oldest are above it.
  const toTop = () =>
    pane
      .locator('[data-virtuoso-scroller="true"]')
      .first()
      .evaluate((element) => void (element.scrollTop = 0));
  // Scrolling up retries: the list may still be settling at the bottom when it first loads.
  const seeAtTop = (locator: ReturnType<typeof pane.getByText>) =>
    expect(async () => {
      await toTop();
      await expect(locator).toBeVisible({ timeout: 1000 });
    }).toPass();
  // The first page loads on open, as in unified-agent's phonebook conversation view.
  await seeAtTop(pane.getByText("Earlier account question", { exact: true }));
  await seeAtTop(pane.getByRole("region", { name: "Voice activity" }));
  await pane.getByRole("button", { name: "Load previous activities" }).click();
  await seeAtTop(pane.getByText("Oldest account message", { exact: true }));
  await pane.getByRole("button", { name: "Load previous activities" }).click();
  // Nothing left to load: the button goes away, and no "start of conversation" marker is shown.
  await expect(pane.getByRole("button", { name: "Load previous activities" })).toHaveCount(0);
});

test("a live conversation loads the customer's earlier activities on request", async ({ page }) => {
  await login(page, "agent");
  await expectShell(page);
  await seedBoard(page);
  const pane = page.getByRole("region", { name: "Amina", exact: true });
  await expect(pane.getByText("Earlier account question", { exact: true })).toHaveCount(0);
  await pane.getByRole("button", { name: "Load previous activities" }).click();
  // The transcript keeps the reader's place, so the oldest messages are above it: scroll up until seen.
  await expect(async () => {
    await pane
      .locator('[data-virtuoso-scroller="true"]')
      .first()
      .evaluate((element) => void (element.scrollTop = 0));
    await expect(pane.getByText("Earlier account question", { exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass();
});
