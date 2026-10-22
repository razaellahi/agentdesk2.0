import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setConfig } from "@/config";
import { makeConfig } from "@/test/fixtures";
import { initI18n } from "@/core/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { conversationFixture } from "@/test/conversations";
import type { CimMessage } from "../model/types";
import type { EmailPayload } from "../model/email";
import { useConversationStore } from "../store/conversationStore";
import { composerKey, useComposerStore } from "../store/composerStore";
import { Composer } from "./Composer";

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock("@/core/auth", () => ({
  useCurrentUser: () => ({ id: "agent-id", username: "agent" }),
  getSession: () => ({ user: { id: "agent-id" } }),
  usePermission: () => true,
  useScope: () => true,
  can: () => true,
}));
vi.mock("@/core/agent-settings", () => {
  const settings = { fileSharing: true, spellCheck: false, emojis: false, messageFormatting: false };
  return { useDeskSettings: () => settings, getDeskSettings: () => settings };
});
vi.mock("@/features/voice", () => ({
  useCallStore: (selector: (state: unknown) => unknown) =>
    selector({ conference: false, registered: true, phase: "idle" }),
  getVoicePassword: () => "",
}));
vi.mock("@/config/featureFlags", () => ({ useFeature: () => false }));
vi.mock("../api/extras", () => ({
  loadEmailSignature: async () => ({ signatureBody: "", signatureBodyWithAgentName: "<p>Sana</p>" }),
  createSecureVideoLink: vi.fn(),
  isSecureLinkConfigured: () => false,
}));
vi.mock("../session/actions", () => ({
  sendEmail: mocks.sendEmail,
  sendFiles: vi.fn(),
  sendText: vi.fn(),
  sendTyping: vi.fn(),
}));

const customerEmail: CimMessage = {
  id: "m-1",
  header: {
    timestamp: 1_700_000_000_000,
    sender: { type: "CUSTOMER", senderName: "Amina" },
    channelData: { serviceIdentifier: "support@example.com" },
  },
  body: {
    type: "EMAIL",
    subject: "Invoice",
    from: "amina@example.com",
    replyTo: ["amina@example.com"],
    recipientsTo: ["support@example.com"],
    emailThreads: ["m-0"],
    htmlBody: "<p>Original</p>",
    markdownText: "Original",
  },
};

function Host({ id }: { id: string }) {
  const conversation = useConversationStore((s) => s.byId[id]);
  return conversation ? <Composer conversation={conversation} /> : null;
}

function open() {
  const c = conversationFixture("mail", "Amina");
  const session = c.activeChannelSessions[0]!;
  session.channel = { channelType: { name: "EMAIL" }, serviceIdentifier: "support@example.com" };
  session.channelData = {
    serviceIdentifier: "support@example.com",
    channelCustomerIdentifier: "amina@example.com",
  };
  c.messages = [customerEmail];
  useConversationStore.setState({ byId: { mail: c }, order: ["mail"], activeId: "mail" });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <Host id="mail" />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return { key: composerKey(c), user: userEvent.setup() };
}

const sent = (call: number) => mocks.sendEmail.mock.calls[call]![2] as EmailPayload;
const send = () => screen.getByRole("button", { name: "chat-features.interactions.send" });

describe("email composer", () => {
  beforeEach(async () => {
    setConfig(makeConfig());
    await initI18n({ defaultLanguage: "en", preferred: "en" });
    vi.clearAllMocks();
    useComposerStore.getState().reset();
    // Like the real send: the email appears in the conversation as the agent's own.
    mocks.sendEmail.mockImplementation(async (id: string, text: string, email: EmailPayload) => {
      useConversationStore.getState().addLocalMessage(id, {
        id: `sent-${mocks.sendEmail.mock.calls.length}`,
        header: { timestamp: Date.now(), sender: { type: "AGENT" } },
        body: { type: "EMAIL", markdownText: text, ...email, recipientsTo: [email.to] },
      });
      return true;
    });
  });

  it("forwards an email as it is, without the agent having to type", async () => {
    const { user } = open();
    await user.click(await screen.findByRole("button", { name: "chat-features.interactions.forward" }));
    await user.type(screen.getByLabelText("To"), "manager@example.com");
    await user.click(send());
    await waitFor(() => expect(mocks.sendEmail).toHaveBeenCalledTimes(1));
    expect(sent(0)).toMatchObject({ subject: "Fwd: Invoice", to: "manager@example.com" });
    expect(sent(0).htmlBody).toContain("<p>Original</p>");
    expect(sent(0).htmlBody).toMatch(/<b>Sent:<\/b>.*<b>To:<\/b> support@example.com/);
    // Source email envelope: no intent / originalMessageId options.
    expect(mocks.sendEmail.mock.calls[0]).toHaveLength(4);
  });

  it("keeps the next email in the thread after one is sent", async () => {
    const { key, user } = open();
    await waitFor(() => expect(useComposerStore.getState().drafts[key]?.to).toBe("amina@example.com"));
    useComposerStore.getState().patch(key, { text: "First answer" });
    await user.click(send());
    await waitFor(() => expect(mocks.sendEmail).toHaveBeenCalledTimes(1));
    expect(sent(0).emailThreads).toEqual(["m-0", "m-1"]);
    // The draft is re-initialised from the latest customer email, not left without a thread.
    await waitFor(() => expect(useComposerStore.getState().drafts[key]?.replyToId).toBe("m-1"));
    useComposerStore.getState().patch(key, { text: "Follow-up" });
    await user.click(send());
    await waitFor(() => expect(mocks.sendEmail).toHaveBeenCalledTimes(2));
    expect(sent(1)).toMatchObject({
      to: "amina@example.com",
      subject: "Re: Invoice",
      emailThreads: ["m-0", "m-1"],
    });
    expect(sent(1).htmlBody).toContain("<blockquote>");
  });

  it("adds the rich signature unless the agent leaves it out", async () => {
    const { key, user } = open();
    const toggle = await screen.findByRole("button", { name: "chat-features.interactions.signature" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    useComposerStore.getState().patch(key, { text: "With signature" });
    await user.click(send());
    await waitFor(() => expect(mocks.sendEmail).toHaveBeenCalledTimes(1));
    expect(sent(0).htmlBody).toContain("With signature<br/><p>Sana</p>");
    await waitFor(() => expect(useComposerStore.getState().drafts[key]?.text).toBe(""));
    await user.click(screen.getByRole("button", { name: "chat-features.interactions.signature" }));
    useComposerStore.getState().patch(key, { text: "Without" });
    await user.click(send());
    await waitFor(() => expect(mocks.sendEmail).toHaveBeenCalledTimes(2));
    expect(sent(1).htmlBody).not.toContain("Sana");
  });
});
