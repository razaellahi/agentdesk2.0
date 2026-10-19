import {
  BookOpen,
  Briefcase,
  MessageSquareShare,
  MessageSquareText,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDeskSettings } from "@/core/agent-settings";
import { usePermission, useScope } from "@/core/auth";
import { caseManagementConfigured } from "@/features/cases";
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

export type ContextTabId = "profile" | "conversation" | "cases" | "knowledge" | "sms" | "outbound";

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
    kbEnabled: Boolean(settings?.knowledgeBaseSearch && settings.knowledgeBaseUrl),
    hasSessions: conversation.activeChannelSessions.length > 0,
    settings,
    t,
  };
}

/** The tabs of the customer context, in Sprinklr's third-pane order. */
export function useContextTabs(conversation: Conversation): ContextTab[] {
  const ctx = useCustomerContext(conversation);
  const { t } = ctx;
  // Like the header's Reach customer: any channel can be used (WhatsApp, email...), not only voice and SMS.
  const inSession = usePermission("agentSession");
  const canInitiate = usePermission("initiateChat");
  const canReach = inSession && canInitiate;
  // Case Management replaces the case-desk iframe gadget; real conversations only.
  const canCases = usePermission("casesInConversation") && caseManagementConfigured() && !ctx.fake;
  const tabs: ContextTab[] = [
    {
      id: "profile",
      label: t("chat-features.customer-info.info"),
      icon: UserRound,
      attention: ctx.canLink && ctx.suggestions.length > 0,
    },
    { id: "conversation", label: t("workspace.context-conversation"), icon: MessageSquareText },
  ];
  if (canCases) tabs.push({ id: "cases", label: t("cases.tab"), icon: Briefcase });
  if (ctx.kbEnabled && ctx.hasSessions)
    tabs.push({
      id: "knowledge",
      label: t("chat-features.customer-info.knowledge-base.title"),
      icon: BookOpen,
    });
  if (canReach) {
    tabs.push({
      id: "outbound",
      label: t("workspace.outbound", { defaultValue: "Outbound" }),
      icon: MessageSquareShare,
    });
  }
  return tabs;
}

export type CustomerContext = ReturnType<typeof useCustomerContext>;
