/** Mock data for the composer's two helpers: quick replies (cim-customer) and text refine (LLM connector). */

export interface QuickReplyDoc {
  id: string;
  tags: string[];
  message: string;
}

/** Canned answers an agent would keep for the questions the demo chats ask. */
export const demoQuickReplies = (): QuickReplyDoc[] => [
  {
    id: "qr-greeting",
    tags: ["greeting", "hello"],
    message: "Hello! Thanks for contacting Expertflow support. How can I help you today?",
  },
  {
    id: "qr-hold",
    tags: ["hold", "wait"],
    message: "Thank you for your patience. I'm checking this for you and will be back in a moment.",
  },
  {
    id: "qr-order",
    tags: ["order", "details"],
    message:
      "Could you please share your order number and the email address used at checkout so I can look into this?",
  },
  {
    id: "qr-refund",
    tags: ["refund", "return"],
    message:
      "You can return most items within 30 days of delivery for a full refund. Refunds reach the original payment method within 5 to 7 business days.",
  },
  {
    id: "qr-delivery",
    tags: ["delivery", "shipping", "tracking"],
    message:
      "Standard delivery takes 3 to 5 business days and express takes 1 to 2. You'll find the tracking link in your dispatch email.",
  },
  {
    id: "qr-warranty",
    tags: ["warranty"],
    message:
      "All blenders come with a 2 year warranty that covers manufacturing faults. Send us a photo of the issue and we'll arrange a replacement.",
  },
  {
    id: "qr-escalate",
    tags: ["escalate", "supervisor"],
    message: "I'm escalating this to our specialist team. You'll receive an update by email within 24 hours.",
  },
  {
    id: "qr-sorry",
    tags: ["sorry", "apology"],
    message: "I'm very sorry for the inconvenience. Let me make this right for you.",
  },
  {
    id: "qr-closing",
    tags: ["closing", "bye"],
    message: "Is there anything else I can help you with today? Thanks for chatting with us!",
  },
];

const TYPOS: [RegExp, string][] = [
  [/\bteh\b/gi, "the"],
  [/\brecieve(d)?\b/gi, "receive$1"],
  [/\bpls\b|\bplz\b/gi, "please"],
  [/\bthx\b|\bthanx\b/gi, "thank you"],
  [/\bu\b/gi, "you"],
  [/\bur\b/gi, "your"],
  [/\bwont\b/gi, "won't"],
  [/\bcant\b/gi, "can't"],
  [/\bdont\b/gi, "don't"],
  [/\bim\b/gi, "I'm"],
  [/\bi\b/g, "I"],
  [/\bwanna\b/gi, "want to"],
  [/\bgonna\b/gi, "going to"],
  [/\s+([,.!?])/g, "$1"],
  [/\s{2,}/g, " "],
];

/**
 * A stand-in for the LLM: fixes common slips, capitalises sentences and closes with a courteous line, so the
 * refine preview always has something visibly different to compare with what the agent typed.
 */
export function refineDemoText(text: string): string {
  let out = text.trim();
  for (const [pattern, replacement] of TYPOS) out = out.replace(pattern, replacement);
  out = out.replace(/(^|[.!?]\s+)([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase());
  if (!/[.!?]$/.test(out)) out += ".";
  const closing = "Please let me know if there is anything else I can help you with.";
  return out.length < 140 && !out.includes(closing) ? `${out} ${closing}` : out;
}
