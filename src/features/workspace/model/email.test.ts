import { describe, expect, it } from "vitest";
import { emailReplyContext, validEmailRecipients } from "./email";
import { buildTextMessage } from "./outgoing";
import { conversationFixture } from "@/test/conversations";
import type { CimMessage } from "./types";
const conv = conversationFixture("email", "Amina");
const session = {
  ...conv.activeChannelSessions[0]!,
  channel: { channelType: { name: "EMAIL" }, serviceIdentifier: "support@example.com" },
};
const original: CimMessage = {
  id: "m-1",
  header: { sender: { type: "CUSTOMER" }, channelData: { serviceIdentifier: "support@example.com" } },
  body: {
    type: "EMAIL",
    subject: "My case",
    from: "customer@example.com",
    replyTo: ["customer@example.com"],
    recipientsTo: ["support@example.com", "colleague@example.com"],
    recipientsCc: ["support@example.com", "manager@example.com"],
    emailThreads: ["m-0", "m-0"],
    htmlBody: "<p>Original</p>",
    attachments: [{ mediaName: "invoice.pdf", mediaLabel: "Invoice", size: 200 }],
  },
};
describe("email reply and forward contracts", () => {
  it("reply-all excludes the mailbox, deduplicates recipients and preserves the thread without mutating the source", () => {
    const snapshot = structuredClone(original);
    const reply = emailReplyContext(original, session, "REPLY_ALL");
    expect(reply).toMatchObject({
      subject: "Re: My case",
      to: "customer@example.com, colleague@example.com",
      cc: "manager@example.com",
      emailThreads: ["m-0", "m-1"],
      forwardedAttachments: [],
    });
    expect(original).toEqual(snapshot);
    expect(emailReplyContext(original, session, "REPLY_TO").to).toBe("customer@example.com");
  });
  it("forward requires a fresh destination and retains original attachments", () => {
    const forward = emailReplyContext(
      { ...original, body: { ...original.body, subject: "Re: My case" } },
      session,
      "FORWARD",
    );
    expect(forward).toMatchObject({
      subject: "Fwd: My case",
      to: "",
      cc: "",
      bcc: "",
      forwardedAttachments: [{ mediaName: "invoice.pdf" }],
    });
    expect(validEmailRecipients(forward.to)).toBe(false);
    expect(validEmailRecipients("person@example.com; invalid")).toBe(false);
  });
  it("publishes the source EMAIL envelope with plain text, mailbox, attachment metadata and thread references", () => {
    const message = buildTextMessage(conv, session, "Reply", {
      email: {
        subject: "Re: My case",
        htmlBody: "<p>Reply</p>",
        to: "customer@example.com",
        emailThreads: ["m-0", "m-1"],
        attachments: [{ mediaName: "invoice.pdf" }],
      },
    });
    expect(message.header.additionalData).toBeUndefined();
    expect(message.body).toMatchObject({
      type: "EMAIL",
      markdownText: "Reply",
      from: "support@example.com",
      replyTo: ["support@example.com"],
      recipientsTo: ["customer@example.com"],
      emailThreads: ["m-0", "m-1"],
      attachments: [{ mediaName: "invoice.pdf" }],
    });
  });
});
