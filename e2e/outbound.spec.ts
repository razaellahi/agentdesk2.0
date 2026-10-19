import { expect, test } from "@playwright/test";
import { login, expectShell } from "./helpers";

test("outbound SMS preserves failed drafts and sends through the source receive contract", async ({
  page,
}) => {
  await login(page, "agent");
  await expectShell(page);
  await page.getByRole("button", { name: "Outbound", exact: true }).waitFor();
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const { useSchemaStore } = await module("features/workspace/store/schemaStore.ts");
    useSchemaStore.getState().setChannelTypes([
      { id: "sms-type", name: "SMS" },
      { id: "voice-type", name: "CX_VOICE" },
    ]);
  });
  await page.getByRole("button", { name: "Outbound", exact: true }).click();
  const number = page.getByLabel("Phone number or customer search", { exact: true });
  await number.fill("5551234567");
  await expect(page.getByRole("button", { name: /Amina/ })).toBeVisible();
  await expect(page.getByText("+925551234567", { exact: true }).last()).toBeVisible();
  // SMS is a channel row like the others: the message form opens only once Text is chosen.
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  const message = page.getByRole("textbox", { name: "Message", exact: true });
  await message.fill("Trigger failure");
  await page.getByRole("button", { name: "Send SMS", exact: true }).click();
  await expect(page.getByText(/Outbound service unavailable/).last()).toBeVisible();
  await expect(message).toHaveValue("Trigger failure");
  await expect(number).toHaveValue("5551234567");
  await message.fill("Your account is updated.");
  const sent = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/message/receive"),
  );
  await page.getByRole("button", { name: "Send SMS", exact: true }).click();
  expect((await sent).postDataJSON()).toMatchObject({
    header: {
      intent: "AGENT_OUTBOUND",
      sender: { id: "u-agent-1" },
      customer: { _id: "outbound-customer" },
      channelData: { serviceIdentifier: "support-sms", channelCustomerIdentifier: "+925551234567" },
    },
    body: { type: "PLAIN", markdownText: "Your account is updated." },
  });
  await expect(page).toHaveURL(/\/customers$/);
});

test("send-and-close keeps the agent on the current screen and clears the successful draft", async ({
  page,
}) => {
  await login(page, "agent");
  await expectShell(page);
  await page.getByRole("button", { name: "Outbound", exact: true }).waitFor();
  await page.evaluate(async () => {
    const module = (path: string) => import(`/agent-desk/src/${path}`);
    const [{ useSchemaStore }, { useDeskSettingsStore }] = await Promise.all([
      module("features/workspace/store/schemaStore.ts"),
      module("core/agent-settings/deskSettings.ts"),
    ]);
    useSchemaStore.getState().setChannelTypes([{ id: "sms-type", name: "SMS" }]);
    const raw = structuredClone(useDeskSettingsStore.getState().raw);
    raw.conversationHandling.isOutboundSmsSendandClose = true;
    useDeskSettingsStore.getState().set(raw);
  });
  const current = page.url();
  await page.getByRole("button", { name: "Outbound", exact: true }).click();
  await page.getByLabel("Phone number or customer search", { exact: true }).fill("+923001234567");
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Hello from support");
  const send = page.getByRole("button", { name: "Send SMS and close", exact: true });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(send).toHaveCount(0);
  await expect(page).toHaveURL(current);
  await page.getByRole("button", { name: "Outbound", exact: true }).click();
  await expect(page.getByLabel("Phone number or customer search", { exact: true })).toHaveValue("");
  // Reopens on the channel list (no number yet, so Text waits), not on the message form.
  await expect(page.getByRole("button", { name: "Text", exact: true })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveCount(0);
});
