import { expect, test } from "@playwright/test";
import { login, expectShell } from "./helpers";

test("rich email formatting and inline images survive channel changes and share with the pop-out", async ({
  page,
}) => {
  await login(page, "agent");
  await expectShell(page);
  await page.getByRole("complementary", { name: "Conversations" }).waitFor();
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const [{ conversationFixture }, { useConversationStore }, { useBoardStore }, { getSession }] =
      await Promise.all([
        module("test/conversations.ts"),
        module("features/workspace/store/conversationStore.ts"),
        module("features/workspace/store/boardStore.ts"),
        module("core/auth/index.ts"),
      ]);
    const c = conversationFixture("mail", "Amina"),
      session = c.activeChannelSessions[0];
    c.topicParticipant.participant.keycloakUser = getSession().user;
    session.channel.channelType.name = "EMAIL";
    session.channel.serviceIdentifier = "support@example.com";
    session.channelData.serviceIdentifier = "support@example.com";
    session.channelData.channelCustomerIdentifier = "amina@example.com";
    c.activeChannelSessions.push({
      ...structuredClone(session),
      id: "mail-sms",
      isChecked: false,
      channel: { channelType: { name: "SMS" } },
    });
    useConversationStore.setState({ byId: { mail: c }, order: ["mail"], activeId: "mail" });
    useBoardStore.getState().reset();
    useBoardStore.getState().open("mail");
  });
  const pane = page.getByRole("region", { name: "Amina", exact: true });
  const editor = pane.getByRole("textbox", { name: "Email message", exact: true });
  await editor.fill("Please review your account.");
  await editor.press("ControlOrMeta+a");
  await pane.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(editor.locator("b, strong")).toContainText("Please review your account.");
  await editor.press("ArrowRight");
  await pane.getByRole("button", { name: "Insert table", exact: true }).click();
  await page.getByRole("button", { name: "Insert table", exact: true }).last().click();
  await expect(editor.locator("table tr")).toHaveCount(2);
  await pane.getByLabel("Inline email images", { exact: true }).setInputFiles({
    name: "account.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1kAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(editor.locator("img[data-inline-id]")).toHaveCount(1);
  await pane.getByRole("radio", { name: "SMS", exact: true }).click();
  await expect(pane.getByRole("textbox", { name: "Message", exact: true })).toHaveValue("");
  await pane.getByRole("radio", { name: "EMAIL", exact: true }).click();
  await expect(editor.locator("b, strong")).toContainText("Please review your account.");
  await expect(editor.locator("img[data-inline-id]")).toHaveCount(1);
  await pane.getByRole("button", { name: "View More", exact: true }).click();
  const popupEvent = page.waitForEvent("popup");
  await page.getByRole("menuitem", { name: "Pop out", exact: true }).click();
  const popup = await popupEvent;
  const popEditor = popup.getByRole("textbox", { name: "Email message", exact: true });
  await expect(popEditor.locator("table tr")).toHaveCount(2);
  await expect(popEditor.locator("img[data-inline-id]")).toHaveCount(1);
  await popEditor.fill("Updated from the pop-out");
  await expect(editor).toHaveText("Updated from the pop-out");
  await popup.close();
});
