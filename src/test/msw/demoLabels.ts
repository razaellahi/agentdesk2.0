/** Labels for `pnpm mock`: the ones an agent can pick, and which of the demo customers carry them. */
export const MOCK_LABELS = [
  { _id: "label-vip", name: "VIP", colorCode: "#16a34a" },
  { _id: "label-callback", name: "Call back", colorCode: "#f59e0b" },
  { _id: "label-complaint", name: "Complaint", colorCode: "#dc2626" },
  { _id: "label-new-lead", name: "New lead", colorCode: "#2563eb" },
  { _id: "label-corporate", name: "Corporate", colorCode: "#7c3aed" },
  { _id: "label-escalated", name: "Escalated", colorCode: "#ea580c" },
];

/** The demo run (`.env.mock`) shows customers already labelled; e2e starts them bare. */
export const DEMO_DATA = import.meta.env.VITE_MOCK_LIVE_CHATS === "true";

/** Label ids by customer, as the customer API stores them. */
const BY_CUSTOMER: Record<string, string[]> = {
  "customer-amina": ["label-vip", "label-complaint"],
  "customer-bilal": ["label-callback"],
  "customer-chen": ["label-corporate", "label-vip"],
  "customer-fatima": ["label-new-lead"],
  "customer-hassan": ["label-complaint", "label-callback"],
  "customer-ibrahim": ["label-corporate"],
  "customer-layla": ["label-new-lead"],
  "customer-marcus": ["label-corporate", "label-escalated"],
  "customer-nadia": ["label-vip"],
  "customer-omar": ["label-callback"],
  "customer-priya": ["label-new-lead", "label-vip"],
  "customer-sofia": ["label-escalated"],
};

export const demoLabelsOf = (customerId: string): string[] =>
  DEMO_DATA ? (BY_CUSTOMER[customerId] ?? []) : [];
