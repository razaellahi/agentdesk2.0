import { Briefcase, MessageSquareText, UserRound, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDeskSettings } from "@/core/agent-settings";
import { usePermission, useScope } from "@/core/auth";
import { caseManagementConfigured, useLinkedCases } from "@/features/cases";
import type { CustomerRow } from "@/features/customers";
import { isFakeConversation } from "../linking/phonebookLink";
import { maskPii, piiAttribute } from "../model/pii";
import type { Conversation } from "../model/types";
import { useSchemaStore } from "../store/schemaStore";
import { useMaskedValue } from "./useMaskedValue";

export function text(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const first = value.map(String).find((item) => item.trim());
    return first ?? null;
  }
  return null;
}

function asSuggestion(value: unknown): CustomerRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as CustomerRow;
  return row._id ? row : null;
}

export type ContextTabId = "profile" | "conversation" | "cases" | "sms" | "outbound";

export interface ContextTab {
  id: ContextTabId;
  label: string;
  icon: LucideIcon;
  /** Something here needs the agent's attention (e.g. matching profiles to link). */
  attention?: boolean;
}

/** Everything the customer context needs, shared by the tab strip and the panel. */
export function useCustomerContext(conversation: Conversation) {
  const { t } = useTranslation();
  const settings = useDeskSettings();
  const manage = usePermission("customerManage");
  const manageHere = usePermission("customerManageInConversation");
  const canViewCustomers = usePermission("customerList");
  const fake = isFakeConversation(conversation);
  const customer = conversation.customer;
  const context = fake ? "manage" : "manage_in_conversation";
  const first = useMaskedValue(text(customer.firstName), "firstName", context);
  const last = useMaskedValue(text(customer.lastName), "lastName", context);
  const full = useScope("customer", context);
  const masked = useScope("customer", "masked_pii");
  const schema = useSchemaStore((s) => s.schema);
  const display = (value: unknown, key: string) =>
    maskPii(
      value,
      piiAttribute(key, schema.find((attr) => attr.key.toLowerCase() === key.toLowerCase()) ?? null),
      { full, masked },
    );
  const suggestions = (conversation.customerSuggestions ?? [])
    .map(asSuggestion)
    .filter((row): row is CustomerRow => Boolean(row));
  const canLink = !fake && (manageHere || manage);
  return {
    customer,
    fake,
    full,
    display,
    schema,
    suggestions,
    canLink,
    canViewCustomers,
    canEdit: manage || (manageHere && !fake),
    name: [first, last].filter(Boolean).join(" "),
    unidentified: !text(customer.firstName) && !text(customer.lastName),
    kbEnabled: Boolean(settings?.knowledgeBaseSearch),
    hasSessions: conversation.activeChannelSessions.length > 0,
    settings,
    t,
  };
}

/** The tabs of the customer context. Outbound reach is integrated directly into customer info channel identifiers. */
export function useContextTabs(conversation: Conversation): ContextTab[] {
  const ctx = useCustomerContext(conversation);
  const { t } = ctx;
  // Case Management replaces the case-desk iframe gadget. Customers opened from the
  // customer list (no interaction) still list their cases; only linking needs a chat.
  const canCases =
    usePermission("casesInConversation") && caseManagementConfigured() && Boolean(conversation.customer._id);
  // A case already linked to this chat is worth a glance: mark the tab (shares the tab's cached request).
  const linkedCases = useLinkedCases(
    ctx.fake ? null : conversation.conversationId,
    conversation.customer._id || null,
    canCases,
  );
  const tabs: ContextTab[] = [
    {
      id: "profile",
      label: t("chat-features.customer-info.info"),
      icon: UserRound,
      attention: ctx.canLink && ctx.suggestions.length > 0,
    },
    { id: "conversation", label: t("workspace.context-conversation"), icon: MessageSquareText },
  ];
  if (canCases)
    tabs.push({
      id: "cases",
      label: t("cases.tab"),
      icon: Briefcase,
      attention: (linkedCases.data?.length ?? 0) > 0,
    });
  return tabs;
}

export type CustomerContext = ReturnType<typeof useCustomerContext>;
