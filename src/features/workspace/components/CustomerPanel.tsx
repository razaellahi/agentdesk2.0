import { Check, Copy, CornerDownLeft, History, Link2, Loader2, Pencil, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/core/auth";
import { CasesTab } from "@/features/cases";
import {
  CustomerForm,
  type CustomerRow,
  OutboundComposeSheet,
  LabelDots,
  useCustomerLabels,
} from "@/features/customers";
import { cn } from "@/shared/lib/utils";
import { destinationKey, kindOfChannelType, type OutboundKind } from "../model/outboundPlan";
import { useCaseConversationContext } from "../hooks/useCaseConversationContext";
import { useOutboundReach } from "../hooks/useOutboundReach";
import { HistoryDialog } from "./HistoryDialog";
import { ReachCustomer } from "./ReachCustomer";
import { openLinkConversationDialog } from "../linking/linkDialog";
import { linkCustomerWithTopic, channelIdentifierAttr } from "../linking/linkCustomerWithTopic";
import { phonebookLinkingPath } from "../linking/phonebookLink";
import { formatDataValue, parseConversationInsight } from "../model/conversationInsight";
import { readWebChannel } from "../model/webChannel";
import { ActiveSessionCard } from "./ActiveSessionCard";
import { KnowledgeFocusView, KnowledgeFullView, KnowledgeSearch } from "./KnowledgeBase";
import type { Conversation } from "../model/types";
import { useKnowledgeStore } from "../store/knowledgeStore";
import { channelTypeNames, distinctChannels, hasChannelLook } from "../model/channelIcons";
import { ChannelGlyph, OutboundActionIcon } from "./ChannelIcon";
import { CustomerAvatar } from "./CustomerInitials";
import {
  text,
  useCustomerContext,
  type ContextTabId,
  type CustomerContext as Ctx,
} from "../hooks/useCustomerContext";

/**
 * The leading icon of an identifier group: the channel's mark on its small round tile with a hairline ring,
 * the same tile used wherever a channel is shown. Shown once per group, never per value.
 */
/** The channels a value reaches, as small outline marks in their own colours (the row's actions are the real thing). */
function ChannelHint({ channels }: { channels: string[] }) {
  const shown = distinctChannels(channels).slice(0, 3);
  if (shown.length < 2) return null;
  return (
    <span
      className="flex shrink-0 items-center gap-1 transition-opacity group-hover/fact:opacity-0"
      title={channels.join(", ")}
    >
      {shown.map((name) => (
        <ChannelGlyph key={name} name={name} className="size-3.5" />
      ))}
    </span>
  );
}

function linkErrorMessage(error: unknown, t: (key: string) => string) {
  const message = String(error);
  if (message.includes("space-unavailable")) {
    return t("snackbar.space-unavailable-may-delete-channel-identifer");
  }
  return message || t("snackbar.Unable-to-link-customer");
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2 border-b border-border/30 px-4 py-3.5 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-medium tracking-normal text-foreground/80">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

type FactOutboundAction = {
  id: string;
  kind: OutboundKind;
  mode: "continue" | "start";
  label: string;
  title: string;
  disabled: boolean;
  busy: boolean;
  onSelect: () => void;
};

type FactRow = {
  key: string;
  label: string;
  value: string;
  raw: string;
  attrKey: string;
  channels: string[];
};

/**
 * One contact fact with outbound action triggers (Call, SMS, Email, WhatsApp, Reply here)
 * and copy action. Uses canonical outbound action icons without duplicate leading logos.
 */
function Fact({
  label,
  value,
  icon,
  detail,
  channels,
  copyable,
  actions = [],
}: {
  label: string;
  value: string;
  /** What draws the leading tile: the identifier's kind, or its first channel. */
  icon: string;
  /** What the value is, e.g. "Phone number · Voice". */
  detail: string;
  channels: string[];
  copyable: boolean;
  actions?: FactOutboundAction[];
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  return (
    <div className="group/fact relative flex items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-surface-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2">
        <ChannelGlyph name={icon} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13px] leading-5 font-medium text-foreground tabular-nums select-text"
          title={value}
        >
          {value}
        </p>
        <p className="truncate text-xs leading-4 text-muted-foreground">{detail}</p>
      </div>
      <ChannelHint channels={channels} />

      {/* Trailing: outbound actions and copy. Over the end of the row on hover or focus, so the
          value keeps the full width; always shown where there is no hover (touch). */}
      <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center gap-1 bg-linear-to-l from-surface-2 from-75% to-transparent ps-8 pe-2 opacity-0 transition-opacity group-focus-within/fact:pointer-events-auto group-focus-within/fact:opacity-100 group-hover/fact:pointer-events-auto group-hover/fact:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
        {actions.map((act) => {
          const isContinue = act.mode === "continue";

          return (
            <Button
              key={act.id}
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={act.disabled}
              title={act.title}
              aria-label={act.label}
              onClick={act.onSelect}
              className={cn(
                "size-7 rounded-full bg-surface shadow-2xs transition-all duration-150 hover:bg-surface hover:shadow-sm active:scale-95",
                isContinue && "text-primary",
                act.disabled && "cursor-not-allowed opacity-40 shadow-none active:scale-100",
              )}
            >
              {act.busy ? (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              ) : isContinue ? (
                <CornerDownLeft className="size-3.5" />
              ) : (
                <OutboundActionIcon kind={act.kind} className="size-4" />
              )}
            </Button>
          );
        })}

        {copyable && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className={cn(
              "size-8 rounded-full text-muted-foreground transition-all duration-150 hover:bg-surface hover:text-foreground active:scale-95",
            )}
            aria-label={t("workspace.copy-value", { label })}
            title={t("workspace.copy-value", { label })}
            onClick={() =>
              void navigator.clipboard?.writeText(value).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              })
            }
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Customer context for the open conversation (Sprinklr-style third pane): a
 * compact customer card that stays on top, then the selected tab's widgets.
 */
export function CustomerPanel({ conversation, tab }: { conversation: Conversation; tab: ContextTabId }) {
  const ctx = useCustomerContext(conversation);
  const { t, customer, display } = ctx;
  const navigate = useNavigate();
  const canHistory = usePermission("history"),
    canCustomerHistory = usePermission("customerHistory");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const labels = useCustomerLabels(customer.labels);
  const name = ctx.name || t("globals.UNIDENTIFIED-CUSTOMER");
  const expandedAnswer = useKnowledgeStore((state) => state.expanded[conversation.conversationId] ?? null);
  const knowledgeFocused = useKnowledgeStore((state) => state.focused[conversation.conversationId] ?? false);

  // Contact facts, one group per schema channel identifier. Each attribute carries its own channels
  // (phone number: SMS and WhatsApp; voice: CX Voice and Cisco; web: Web and WebRTC), so the same
  // number under two attributes shows under both. Email and phone fall back to the profile fields only
  // when the schema does not list them.
  const facts: FactRow[] = [];
  const addFact = (key: string, label: string, raw: unknown, attrKey: string, channels: string[] = []) => {
    const value = text(raw);
    if (!value) return;
    facts.push({ key, label, value: display(value, attrKey), raw: value, attrKey, channels });
  };
  const valuesOf = (raw: unknown): string[] =>
    (Array.isArray(raw) ? raw : [raw])
      .map((item) => text(item))
      .filter((item): item is string => Boolean(item));
  const identifiers = ctx.schema.filter((attr) => attr.isChannelIdentifier && attr.key);
  const listed = (...keys: string[]) => identifiers.some((attr) => keys.includes(attr.key!));
  for (const attr of identifiers) {
    valuesOf(customer[attr.key as keyof typeof customer]).forEach((value, index) =>
      addFact(
        `${attr.key}-${index}`,
        attr.label || attr.key!,
        value,
        attr.key!,
        channelTypeNames(attr.channelTypes),
      ),
    );
  }
  if (!listed("phoneNumber", "phone"))
    valuesOf(customer.phoneNumber ?? customer.phone).forEach((value, index) =>
      addFact(`phone-${index}`, t("workspace.phone"), value, "phoneNumber", ["SMS", "WHATSAPP"]),
    );
  if (!listed("email"))
    valuesOf(customer.email).forEach((value, index) =>
      addFact(`email-${index}`, t("workspace.email"), value, "email", ["EMAIL"]),
    );

  const knowledgeAvailable = ctx.kbEnabled && ctx.hasSessions;
  if (tab === "profile" && knowledgeAvailable && expandedAnswer)
    return <KnowledgeFullView conversation={conversation} query={expandedAnswer} />;
  if (tab === "profile" && knowledgeAvailable && knowledgeFocused)
    return <KnowledgeFocusView conversation={conversation} />;

  return (
    <div className="flex min-h-0 flex-col bg-chat-panel-right">
      <div className="flex items-start gap-3 border-b border-border/40 bg-chat-panel-right-card px-4 py-3.5">
        <div
          role={ctx.canEdit && customer._id ? "button" : undefined}
          tabIndex={ctx.canEdit && customer._id ? 0 : undefined}
          onClick={ctx.canEdit && customer._id ? () => setEditing(true) : undefined}
          onKeyDown={
            ctx.canEdit && customer._id
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setEditing(true);
                  }
                }
              : undefined
          }
          className={cn(
            "-m-1 flex min-w-0 flex-1 items-start gap-3 rounded-xl p-1 transition-colors",
            ctx.canEdit && customer._id && "group cursor-pointer hover:bg-surface-2/60",
          )}
          title={ctx.canEdit && customer._id ? t("chat-features.customer-info.update-profile") : undefined}
        >
          <CustomerAvatar
            name={name}
            size="md"
            className={cn(ctx.canEdit && customer._id && "transition-transform group-hover:scale-105")}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3
                className={cn(
                  "truncate text-[16px] font-medium tracking-tight text-foreground",
                  ctx.canEdit && customer._id && "transition-colors group-hover:text-primary",
                )}
                title={name}
              >
                {name}
              </h3>
            </div>
            {ctx.unidentified ? (
              <span className="mt-1 inline-flex rounded-full border border-warning/30 bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-text">
                {t("workspace.unidentified-hint")}
              </span>
            ) : (
              <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground tabular-nums">
                {facts[0]?.value ?? ""}
              </p>
            )}
            <LabelDots labels={labels} className="mt-1" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-surface-2/60 p-0.5">
          {(canHistory || canCustomerHistory) && customer._id && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="View customer history"
              title="View customer history"
              className="size-7 rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="size-4" />
            </Button>
          )}
          {ctx.canEdit && customer._id && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={t("chat-features.customer-info.update-profile")}
              title={t("chat-features.customer-info.update-profile")}
              className="size-7 rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {ctx.canViewCustomers && ctx.canLink && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={t("chat-features.customer-info.link-profile")}
              title={t("chat-features.customer-info.link-profile")}
              className="size-7 rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
              onClick={() => navigate(phonebookLinkingPath(conversation))}
            >
              <Link2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {tab === "profile" && <ProfileTab conversation={conversation} facts={facts} ctx={ctx} />}
      {tab === "conversation" && <ConversationTab conversation={conversation} ctx={ctx} />}
      {tab === "cases" && <CaseManagementTab conversation={conversation} />}
      {(tab === "outbound" || tab === "sms") && <OutboundTab conversation={conversation} />}

      {editing && (
        <CustomerForm
          customer={customer}
          conversationId={conversation.conversationId}
          onClose={() => setEditing(false)}
        />
      )}
      {historyOpen && <HistoryDialog customer={customer} onClose={() => setHistoryOpen(false)} />}
    </div>
  );
}

function CaseManagementTab({ conversation }: { conversation: Conversation }) {
  const context = useCaseConversationContext(conversation);
  return <CasesTab key={`${context.interactionId}|${context.customerProfileId}`} context={context} />;
}

function ProfileTab({
  conversation,
  facts,
  ctx,
}: {
  conversation: Conversation;
  facts: FactRow[];
  ctx: Ctx;
}) {
  const { t, display } = ctx;
  const navigate = useNavigate();
  const reach = useOutboundReach(conversation, true);
  // Identifiers of one type share a header and its icon, so the icon is never repeated per value.
  // One row per value: a number kept under Phone number and Voice is one row, reaching every channel of both.
  const rows = facts.reduce<{ fact: FactRow; labels: string[]; icon: string }[]>((all, fact) => {
    const row = all.find((item) => item.fact.raw === fact.raw);
    if (row) {
      if (!row.labels.includes(fact.label)) row.labels.push(fact.label);
      row.fact = { ...row.fact, channels: [...new Set([...row.fact.channels, ...fact.channels])] };
      return all;
    }
    const icon = hasChannelLook(fact.label) ? fact.label : (fact.channels[0] ?? fact.label);
    all.push({ fact, labels: [fact.label], icon });
    return all;
  }, []);

  const getActionsForFact = (fact: FactRow): FactOutboundAction[] => {
    const list: FactOutboundAction[] = [];
    const rawVal = fact.raw;
    const isEmail =
      fact.attrKey.toLowerCase().includes("email") ||
      fact.key.toLowerCase().includes("email") ||
      rawVal.includes("@");
    const isPhone =
      !isEmail &&
      (fact.attrKey.toLowerCase().includes("phone") ||
        fact.key.toLowerCase().includes("phone") ||
        rawVal.replace(/[^\d]/g, "").length >= 7);

    for (const option of reach.options) {
      const matchesTarget = option.targets.some(
        (t) => destinationKey(option.kind, t.value) === destinationKey(option.kind, rawVal),
      );
      const matchesChannel = fact.channels.some((c) => kindOfChannelType(c) === option.kind);
      const matchesKind =
        matchesTarget ||
        matchesChannel ||
        (isPhone && ["voice", "sms", "whatsapp"].includes(option.kind)) ||
        (isEmail && option.kind === "email");

      if (!matchesKind) continue;

      const target = option.targets.find(
        (t) => destinationKey(option.kind, t.value) === destinationKey(option.kind, rawVal),
      ) ?? {
        value: rawVal,
        attrKey: fact.attrKey,
        display: fact.value,
      };

      const channelName = t(`workspace.reach.channel.${option.kind}`);
      const busy = reach.busy === option.kind;

      if (option.state === "continue") {
        list.push({
          id: `${fact.key}-${option.kind}-continue`,
          kind: option.kind,
          mode: "continue",
          label: t("workspace.reach.reply-here"),
          title: `${t("workspace.reach.reply-here")} · ${channelName}`,
          disabled: false,
          busy,
          onSelect: () => reach.continueOn(option),
        });
      } else if (option.state === "ready" || option.kind === "email") {
        list.push({
          id: `${fact.key}-${option.kind}-ready`,
          kind: option.kind,
          mode: "start",
          label: t(`workspace.reach.action.${option.kind}`),
          title: `${t(`workspace.reach.action.${option.kind}`)} · ${channelName}`,
          disabled: reach.optedOut || Boolean(reach.busy),
          busy,
          onSelect: () => reach.start(option, target),
        });
      } else if (
        option.state === "unavailable" &&
        (option.reason === "PHONE_OFFLINE" || option.reason === "ON_CALL")
      ) {
        list.push({
          id: `${fact.key}-${option.kind}-unavailable`,
          kind: option.kind,
          mode: "start",
          label: t(`workspace.reach.action.${option.kind}`),
          title: reach.reasonText(option.reason, option.kind),
          disabled: true,
          busy: false,
          onSelect: () => undefined,
        });
      }
    }

    // Direct email action: ensure an email fact always provides the email compose action
    if (isEmail && !list.some((a) => a.kind === "email")) {
      const emailOption = reach.options.find((o) => o.kind === "email");
      const target = { value: rawVal, attrKey: fact.attrKey, display: fact.value };
      list.push({
        id: `${fact.key}-email-direct`,
        kind: "email",
        mode: "start",
        label: t("workspace.reach.action.email"),
        title: `${t("workspace.reach.action.email")} · ${t("workspace.reach.channel.email")}`,
        disabled: reach.optedOut || Boolean(reach.busy),
        busy: reach.busy === "email",
        onSelect: () => {
          if (emailOption) {
            reach.start(emailOption, target);
          } else {
            reach.start({ kind: "email", targets: [target], state: "ready" }, target);
          }
        },
      });
    }

    return list;
  };

  const matchName = (match: CustomerRow) =>
    [display(match.firstName, "firstName"), display(match.lastName, "lastName")].filter(Boolean).join(" ") ||
    display(match.email, "email") ||
    display(match.phoneNumber, "phoneNumber");
  const runLink = (selected: Record<string, unknown>) => {
    void linkCustomerWithTopic({
      conversationId: conversation.conversationId,
      selected,
      confirm: openLinkConversationDialog,
    })
      .then((result) => {
        if (!result.linked) return;
        toast.success(t("snackbar.Profile-linked-successfully"));
      })
      .catch((error: unknown) => toast.error(linkErrorMessage(error, t)));
  };

  return (
    <>
      {ctx.canLink && ctx.suggestions.length > 0 && (
        <section className="m-3 space-y-1.5 rounded-xl border border-warning/40 bg-warning-soft/60 p-2.5">
          <p className="text-xs font-medium text-warning-text">
            {ctx.suggestions.length} {t("chat-features.customer-info.profile-matched")}
          </p>
          <ul className="space-y-1">
            {ctx.suggestions.slice(0, 15).map((match) => (
              <li key={match._id} className="flex items-center gap-1">
                <span className="min-w-0 flex-1 truncate rounded-lg bg-surface px-2 py-1 text-xs">
                  {matchName(match)}
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={t("chat-features.customer-info.link-profile")}
                  onClick={() => runLink(match as Record<string, unknown>)}
                >
                  <Link2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          {ctx.canViewCustomers && (
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => navigate(phonebookLinkingPath(conversation, { withChannelFilter: true }))}
            >
              {t("chat-features.customer-info.view-matches")}
            </Button>
          )}
        </section>
      )}

      <Section title={t("chat-features.customer-info.channel-identifiers")}>
        {reach.optedOut && (
          <div
            role="alert"
            className="mb-2.5 flex items-start gap-2.5 rounded-xl bg-destructive-soft px-3 py-2 text-xs text-destructive-text"
          >
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="leading-tight font-medium">{t("snackbar.Outbound-Blocked-Opt-Out")}</p>
          </div>
        )}
        {facts.length ? (
          <div className="divide-y divide-border/50 overflow-hidden rounded-xl bg-surface ring-1 ring-border/60">
            {rows.map(({ fact, labels, icon }) => (
              <Fact
                key={fact.key}
                label={fact.label}
                value={fact.value}
                icon={icon}
                detail={labels.join(" · ")}
                channels={fact.channels}
                copyable={ctx.full}
                actions={getActionsForFact(fact)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("chat-features.customer-info.not-found")}</p>
        )}
      </Section>
      {ctx.kbEnabled && ctx.hasSessions && <KnowledgeSection conversation={conversation} />}
      {reach.composeRequest && (
        <OutboundComposeSheet
          key={`${reach.composeRequest.channel}:${reach.composeRequest.destination}`}
          request={reach.composeRequest}
          onClose={reach.closeCompose}
        />
      )}
    </>
  );
}

function KnowledgeSection({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const id = conversation.conversationId;
  const found = useKnowledgeStore((state) => (state.hits[id]?.length ?? 0) > 0);
  return (
    <Section
      title={t("chat-features.customer-info.knowledge-base.title")}
      action={
        found && (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => useKnowledgeStore.getState().clear(id)}
          >
            {t("chat-features.customer-info.knowledge-base.clear")}
          </button>
        )
      }
    >
      <KnowledgeSearch conversation={conversation} />
    </Section>
  );
}

function ConversationTab({ conversation, ctx }: { conversation: Conversation; ctx: Ctx }) {
  const { t, display } = ctx;
  const insight = parseConversationInsight(conversation.activeConversationData);
  const sentiment = insight.sentiment?.toLowerCase() ?? "";
  return (
    <>
      <Section title={t("chat-features.customer-info.active-sessions")}>
        <ul className="space-y-1.5">
          {conversation.activeChannelSessions.map((session) => (
            <ActiveSessionCard
              key={session.id}
              session={session}
              identifier={
                display(
                  session.channelData.channelCustomerIdentifier,
                  channelIdentifierAttr(session.channel.channelType.name)?.key ?? "phoneNumber",
                ) || t("chat-features.customer-info.not-found")
              }
              info={readWebChannel(session)}
              display={display}
            />
          ))}
          {conversation.activeChannelSessions.length === 0 && (
            <li className="px-1.5 text-xs font-normal text-muted-foreground">
              {t("chat-features.customer-info.no-active-conversation")}
            </li>
          )}
        </ul>
      </Section>

      {insight.sentiment && (
        <Section title={t("chat-features.customer-info.sentiment")}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize shadow-2xs",
                sentiment.includes("neg")
                  ? "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/30 dark:text-rose-400"
                  : sentiment.includes("pos")
                    ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-400"
                    : "bg-muted text-foreground ring-1 ring-border/50",
              )}
            >
              <span>{sentiment.includes("pos") ? "😊" : sentiment.includes("neg") ? "⚠️" : "😐"}</span>
              <span>{insight.sentiment}</span>
            </span>
          </div>
        </Section>
      )}
      {insight.summary && (
        <Section title={t("chat-features.customer-info.summary")}>
          <div className="space-y-1 rounded-xl bg-primary-soft/40 p-3">
            {insight.summary.heading && (
              <p className="text-xs font-medium text-foreground">{insight.summary.heading}</p>
            )}
            {insight.summary.content && (
              <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {insight.summary.content}
              </p>
            )}
          </div>
        </Section>
      )}
      {insight.rows.length > 0 && (
        <Section title={t("chat-features.customer-info.conversation-data")}>
          <dl className="space-y-1.5 text-xs">
            {insight.rows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 rounded-lg bg-muted/15 px-2 py-1.5"
              >
                <dt className="truncate font-normal text-muted-foreground" title={row.key}>
                  {row.key}
                </dt>
                <dd className="font-normal break-words whitespace-pre-wrap text-foreground">
                  {formatDataValue(row.value)}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </>
  );
}

/**
 * Outbound for this conversation's customer: one row per channel, each with its
 * logo and a single button (Call, Text, Message, Compose...). The same rows as the
 * header's Reach customer panel, so the plan is shared: nothing is offered that
 * would be refused, a channel the customer is already on offers "Reply here", and
 * numbers are masked. Dialling an arbitrary number is the top bar's outbound panel.
 */
function OutboundTab({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const reach = useOutboundReach(conversation, true);

  return (
    <div className="p-2">
      {reach.optedOut && (
        <p
          role="alert"
          className="m-1.5 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive-soft p-3 text-xs text-destructive-text"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("snackbar.Outbound-Blocked-Opt-Out")}
        </p>
      )}
      <ReachCustomer reach={reach} name="" onDone={() => undefined} bare />
      {reach.composeRequest && (
        <OutboundComposeSheet
          key={`${reach.composeRequest.channel}:${reach.composeRequest.destination}`}
          request={reach.composeRequest}
          onClose={reach.closeCompose}
        />
      )}
    </div>
  );
}
