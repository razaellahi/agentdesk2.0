import { describe, expect, it } from "vitest";
import { emailReplyContext, splitQuotedEmail, validEmailRecipients } from "./email";
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
  it("never addresses the connector's public mailbox (PUBLIC-EMAIL-ID)", () => {
    const viaPublic: CimMessage = {
      ...original,
      header: {
        ...original.header,
        channelSession: {
          channel: {
            channelConnector: {
              channelProviderConfigs: [{ key: "PUBLIC-EMAIL-ID", value: "Help@Example.com" }],
            },
          },
        },
      },
      body: { ...original.body, recipientsTo: ["help@example.com"], recipientsCc: ["help@example.com"] },
    };
    const all = emailReplyContext(viaPublic, session, "REPLY_ALL");
    expect(all.to).toBe("customer@example.com");
    expect(all.cc).toBe("");
  });
  it("quotes the original in source (Outlook) form with sender, date, recipients and subject", () => {
    const { quotedHtml } = emailReplyContext(
      { ...original, header: { ...original.header, timestamp: Date.UTC(2026, 9, 21, 12) } },
      session,
      "REPLY_TO",
    );
    expect(quotedHtml).toMatch(
      /^<blockquote><p><b>From:<\/b> customer@example.com<br\/><b>Sent:<\/b> \w+day, /,
    );
    expect(quotedHtml).toContain("<b>To:</b> support@example.com, colleague@example.com");
    expect(quotedHtml).toContain("<b>Subject:</b> My case</p><p>Original</p></blockquote>");
  });
  it("separates a reply from the history quoted below it", () => {
    expect(splitQuotedEmail("<p>Thanks</p><hr><blockquote><p>Earlier</p></blockquote>")).toEqual({
      content: "<p>Thanks</p><hr>",
      quoted: "<blockquote><p>Earlier</p></blockquote>",
    });
    const outlook =
      '<div>Done</div><div id="divRplyFwdMsg"><b>From:</b> a<br><b>Sent:</b> b<br><b>To:</b> c<br><b>Subject:</b> d</div><div>Old</div>';
    expect(splitQuotedEmail(outlook).content).toBe("<div>Done</div>");
    expect(splitQuotedEmail(outlook).quoted).toContain("Old");
    // Nothing above the quote, or no quote at all: the whole email is the content.
    expect(splitQuotedEmail("<blockquote>Only</blockquote>")).toEqual({
      content: "<blockquote>Only</blockquote>",
      quoted: "",
    });
    expect(splitQuotedEmail("<p>Plain &lt;b&gt;</p>").quoted).toBe("");
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
