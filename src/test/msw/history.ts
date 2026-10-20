import { minutesAgo } from "./demoTime";

/** An email line carries its subject and any attachment names; without it the line is a chat message. */
interface Mail {
  subject: string;
  attachments?: string[];
}

/** [who, minutes ago, text, mail?]: C is the customer, A is the agent (Sana Iqbal). */
type Line = ["C" | "A", number, string] | ["C" | "A", number, string, Mail];

/** The mailbox the desk answers from. */
const SUPPORT_ADDRESS = "support@expertflow-demo.com";

/**
 * Earlier conversations of the mock customers, in the shape of the conversation-manager's
 * customer activities. Their times line up with the case links in cases.ts (see LINK_POINTS there),
 * so opening a case's conversation lands on the message where the case was raised.
 */
const SCRIPTS: Record<string, { name: string; email?: string; lines: Line[] }> = {
  "customer-a": {
    name: "Amina",
    lines: [
      // A refund request two days ago (case 2, linked at 2874 minutes ago).
      ["C", 2885, "Hi, I returned my order last week but the refund has not arrived yet."],
      ["A", 2883, "Hello Amina, thanks for reaching out. Let me check the return status for you."],
      ["A", 2880, "I can see the return was received on the 12th. Refunds usually take 5 to 7 working days."],
      ["C", 2878, "That is already 8 days. Can you escalate it?"],
      ["A", 2875, "Absolutely. I am raising a case for our billing team so someone follows it up."],
      [
        "A",
        2874,
        "Done, I have linked this chat to the case. You will get an email as soon as it is processed.",
      ],
      ["C", 2872, "Thank you."],
      // A declined card payment this afternoon (case 1, raised at 171 minutes ago).
      ["C", 190, "Hello, my card payment keeps getting declined at checkout."],
      [
        "A",
        188,
        "Hi Amina, sorry about that. Could you tell me the last four digits of the card and when you tried?",
      ],
      ["C", 185, "Ending 4421, I tried twice about ten minutes ago."],
      ["A", 183, "Thank you. Let me look at the gateway logs."],
      [
        "A",
        178,
        "I can see two authorization attempts, both declined with a gateway timeout. It is not a problem with your card.",
      ],
      ["C", 176, "But I was charged, I got an SMS from my bank."],
      [
        "A",
        174,
        "Understood. That is a pending hold which should release by itself, but I would like the payments team to confirm.",
      ],
      ["C", 172, "Please do. My order did not go through either."],
      [
        "A",
        171,
        "I have created case CASE-20261019-00001 for you. The payments team will update you by email.",
      ],
      ["C", 166, "Great, thanks for the help."],
      ["A", 160, "Is there anything else I can help you with today?"],
      ["C", 158, "No, that is all."],
    ],
  },
  "customer-b": {
    name: "Bilal",
    lines: [
      ["C", 85, "My internet drops every evening since the upgrade, usually around 8pm."],
      ["A", 83, "Sorry to hear that, Bilal. Have you tried restarting the router?"],
      ["C", 81, "Yes, many times. The lights go red for a minute and then it recovers."],
      ["A", 79, "Which router model do you have, and are you on cable or wifi?"],
      ["C", 77, "It is the R-500, mostly on wifi."],
      [
        "A",
        74,
        "Thanks. Since this has repeated for several days I will open a technical case so an engineer can check the line.",
      ],
      ["C", 71, "Okay, please."],
      ["A", 66, "Done. I linked this chat to the case and the technical team will contact you within a day."],
      ["C", 60, "Can you ask them to call after 6pm?"],
      ["A", 58, "Noted, I added that to the case."],
      ["C", 55, "Thank you."],
    ],
  },
  "customer-amina": {
    name: "Amina Raza",
    email: "amina@example.com",
    lines: [
      // Loyalty points by email a day ago (case 7, linked at 1485 minutes ago).
      [
        "C",
        1500,
        "Hello,\n\nMy loyalty points from last month are not showing in my account. I made a purchase on the 3rd of October and expected 340 points.\n\nKind regards,\nAmina Raza",
        { subject: "Missing loyalty points from my October purchase" },
      ],
      [
        "A",
        1494,
        "Hi Amina,\n\nThank you for writing in. I can see the purchase on the 3rd and confirm that the 340 points were never credited. Could you tell me whether the order was paid by gift card?\n\nBest regards,\nSana Iqbal",
        { subject: "Re: Missing loyalty points from my October purchase" },
      ],
      [
        "C",
        1492,
        "Hi Sana,\n\nNo gift card, it was a normal card payment. Can you add the points back?\n\nThanks,\nAmina",
        { subject: "Re: Missing loyalty points from my October purchase" },
      ],
      [
        "A",
        1485,
        "Hi Amina,\n\nCrediting points needs approval from the loyalty team, so I have raised case CASE-20261019-00007 and linked this email thread to it. They usually answer within a few hours and I will write to you as soon as it is done.\n\nBest regards,\nSana Iqbal",
        { subject: "Re: Missing loyalty points from my October purchase" },
      ],
      [
        "C",
        1483,
        "Perfect, thank you for the quick help.\n\nAmina",
        { subject: "Re: Missing loyalty points from my October purchase" },
      ],
      // A delivery address change this morning (case 6, linked at 285 minutes ago).
      ["C", 300, "Hi, I need to change the delivery address on my open order."],
      ["A", 298, "Of course. Could you confirm your order number and the new address?"],
      ["C", 295, "Order 78210. New address is 14 Garden Road, Block C."],
      [
        "A",
        291,
        "Thank you. The order has not shipped yet, but the address needs a quick check with the warehouse.",
      ],
      ["C", 288, "How long will that take?"],
      [
        "A",
        285,
        "I have raised a case so the warehouse team confirms it today. I will keep this chat linked to it.",
      ],
      ["C", 283, "Great, thank you Sana."],
      ["A", 282, "You are welcome. Anything else I can help with?"],
      ["C", 280, "No, that is everything."],
    ],
  },
  // Chen Wei, an accounts contact at a trading company: a billing dispute entirely by email.
  "customer-chen": {
    name: "Chen Wei",
    email: "chen.wei@lumina-trading.example",
    lines: [
      [
        "C",
        2400,
        "Dear support team,\n\nInvoice INV-20418 charges 20% VAT, but our company is VAT exempt and the certificate is already on file with you. The invoice total is 1,200 higher than it should be. Please correct it. The invoice is attached.\n\nBest regards,\nChen Wei\nAccounts, Lumina Trading",
        { subject: "Invoice INV-20418 shows the wrong VAT amount", attachments: ["INV-20418.pdf"] },
      ],
      [
        "A",
        2395,
        "Dear Chen,\n\nThank you for your email and for attaching the invoice. I am checking the exemption certificate against your account and will come back to you shortly.\n\nBest regards,\nSana Iqbal",
        { subject: "Re: Invoice INV-20418 shows the wrong VAT amount" },
      ],
      [
        "A",
        2380,
        "Dear Chen,\n\nI can confirm the VAT exemption certificate is on your account, so the invoice should not have charged VAT. I have raised case CASE-20261019-00008 and linked this email thread so our billing team can reissue the invoice. You will receive the corrected invoice and a credit note.\n\nBest regards,\nSana Iqbal",
        { subject: "Re: Invoice INV-20418 shows the wrong VAT amount" },
      ],
      [
        "C",
        2370,
        "Thank you Sana. Please make sure the new invoice keeps the same PO number, 7731-B.\n\nChen",
        { subject: "Re: Invoice INV-20418 shows the wrong VAT amount" },
      ],
      [
        "A",
        2000,
        "Dear Chen,\n\nUpdate from billing: credit note CN-5521 has been issued and the corrected invoice INV-20418-R keeps PO 7731-B. Both are attached.\n\nBest regards,\nSana Iqbal",
        {
          subject: "Re: Invoice INV-20418 shows the wrong VAT amount",
          attachments: ["CN-5521.pdf", "INV-20418-R.pdf"],
        },
      ],
      [
        "C",
        1990,
        "Received, everything looks correct now. Thank you.\n\nChen",
        { subject: "Re: Invoice INV-20418 shows the wrong VAT amount" },
      ],
    ],
  },
  // Fatima Noor: a warranty claim for a damaged product, raised from an email with photos.
  "customer-fatima": {
    name: "Fatima Noor",
    email: "fatima.noor@example.com",
    lines: [
      [
        "C",
        600,
        "Hello,\n\nMy new blender arrived this morning and the jar is cracked. It looks like it was damaged in transit. What can I do?\n\nFatima Noor",
        { subject: "Blender arrived damaged", attachments: ["jar-front.jpg", "jar-crack.jpg"] },
      ],
      [
        "A",
        595,
        "Hi Fatima,\n\nI am very sorry about that. Could you send me your order number and a photo of the box? Then I can arrange a replacement.\n\nBest regards,\nSana Iqbal",
        { subject: "Re: Blender arrived damaged" },
      ],
      [
        "C",
        580,
        "Hi Sana,\n\nThe order number is 55102. The photo of the box is attached.\n\nThank you,\nFatima",
        { subject: "Re: Blender arrived damaged", attachments: ["box.jpg"] },
      ],
      [
        "A",
        570,
        "Hi Fatima,\n\nThank you. I have opened warranty case CASE-20261019-00009 and linked this email thread to it. A replacement will be shipped within 3 to 5 working days and you do not need to return the damaged jar.\n\nBest regards,\nSana Iqbal",
        { subject: "Re: Blender arrived damaged" },
      ],
      [
        "C",
        555,
        "That is great news, thank you so much.\n\nFatima",
        { subject: "Re: Blender arrived damaged" },
      ],
    ],
  },
};

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const toHtml = (text: string) =>
  text
    .split("\n\n")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br/>")}</p>`)
    .join("");

/** Attachments the mock file endpoint can serve: names starting with "demo-" (see handlers.ts). */
const attachmentsOf = (names: string[] = []) =>
  names.map((label) => ({
    mediaName: `demo-${label}`,
    mediaLabel: label,
    mimeType: label.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
    size: 48_000,
  }));

/** Customer activities for the demo customers, newest first within a page; null for any other customer. */
export function demoCustomerActivities(customerId: string) {
  const script = SCRIPTS[customerId];
  if (!script) return null;
  return script.lines
    .map(([who, ago, text, mail]) => {
      const timestamp = minutesAgo(ago);
      const customer = who === "C";
      const customerAddress = script.email ?? "";
      const body = mail
        ? {
            type: "EMAIL",
            subject: mail.subject,
            markdownText: text,
            htmlBody: toHtml(text),
            from: customer ? customerAddress : SUPPORT_ADDRESS,
            recipientsTo: [customer ? SUPPORT_ADDRESS : customerAddress],
            recipientsCc: [] as string[],
            replyTo: [customer ? customerAddress : SUPPORT_ADDRESS],
            attachments: attachmentsOf(mail.attachments),
            emailThreads: [] as string[],
          }
        : { type: "PLAIN", markdownText: text };
      return {
        id: `demo-${customerId}-${ago}`,
        name: customer ? "CUSTOMER_MESSAGE" : "AGENT_MESSAGE",
        timestamp,
        data: {
          id: `demo-message-${customerId}-${ago}`,
          header: {
            timestamp,
            sender: customer
              ? { id: customerId, type: "CUSTOMER", senderName: script.name }
              : { id: "u-agent-1", type: "AGENT", senderName: "Sana Iqbal" },
            customer: { _id: customerId, firstName: script.name },
          },
          body,
        },
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}
