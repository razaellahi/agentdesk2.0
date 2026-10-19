import {
  Check,
  Copy,
  CornerDownLeft,
  History,
  Link2,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { SearchField } from "@/components/common/ListChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeskSettings } from "@/core/agent-settings";
import { usePermission } from "@/core/auth";
import { CasesTab } from "@/features/cases";
import {
  CustomerForm,
  listCustomers,
  type CustomerRow,
  OutboundComposeSheet,
  LabelDots,
  useCustomerLabels,
} from "@/features/customers";
import { cn } from "@/shared/lib/utils";
import { searchKnowledgeBase, type KnowledgeBaseHit } from "../api";
import { kindOfChannelType } from "../model/outboundPlan";
import { useCaseConversationContext } from "../hooks/useCaseConversationContext";
import { useOutboundReach } from "../hooks/useOutboundReach";
import { HistoryDialog } from "./HistoryDialog";
import { ReachCustomer } from "./ReachCustomer";
import { openLinkConversationDialog } from "../linking/linkDialog";
import { linkCustomerWithTopic, channelIdentifierAttr } from "../linking/linkCustomerWithTopic";
import { linkingChannelSession, phonebookLinkingPath } from "../linking/phonebookLink";
import { formatDataValue, parseConversationInsight } from "../model/conversationInsight";
import type { Conversation } from "../model/types";
import { useComposerStore, composerKey } from "../store/composerStore";
import { ChannelBadge } from "./ChannelIcon";
import { CustomerAvatar } from "./CustomerInitials";
import {
  text,
  useCustomerContext,
  type ContextTabId,
  type CustomerContext as Ctx,
} from "../hooks/useCustomerContext";

function linkErrorMessage(error: unknown, t: (key: string) => string) {
  const message = String(error);
  if (message.includes("space-unavailable")) {
    return t("snackbar.space-unavailable-may-delete-channel-identifer");
  }
  return message || t("snackbar.Unable-to-link-customer");
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2 border-b border-border/40 px-3.5 py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

type FactRow = { key: string; label: string; value: string; raw: string; channels: string[] };

type ChipAction = { label: string; mode: "continue" | "start"; onSelect: () => void } | null;

/**
 * One fact with a copy button (only when the agent may see the full value) and, for
 * channel identifiers, the channels it belongs to (source customer-info channel
 * list). Each chip offers "Reply here" when the customer is already on that channel
 * in this conversation, or starts one when the channel can be used.
 */
function Fact({
  label,
  value,
  copyable,
  channels = [],
  actionFor,
}: {
  label: string;
  value: string;
  copyable: boolean;
  channels?: string[];
  actionFor?: (channel: string) => ChipAction;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <div className="group/fact flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-surface-2/70">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{label}</div>
        <div className="mt-0.5 truncate text-xs font-medium text-foreground tabular-nums" title={value}>
          {value}
        </div>
        {channels.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-1">
            {channels.map((channel) => {
              const action = actionFor?.(channel) ?? null;
              return (
                <li
                  key={channel}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full bg-surface-2 py-0.5 ps-1.5 text-[10px] text-muted-foreground",
                    action ? "pe-0.5" : "pe-2",
                  )}
                >
                  <ChannelBadge channelType={{ name: channel }} size="sm" className="-ms-1" />
                  <span>{channel}</span>
                  {action && (
                    <button
                      type="button"
                      className="grid size-4 place-items-center rounded-full text-primary hover:bg-primary-soft"
                      aria-label={action.label}
                      title={action.label}
                      onClick={action.onSelect}
                    >
                      {action.mode === "continue" ? (
                        <CornerDownLeft className="size-3" />
                      ) : (
                        <MessageSquarePlus className="size-3" />
                      )}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {copyable && (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="size-6 rounded-full opacity-0 group-hover/fact:opacity-100 hover:bg-surface-2 focus-visible:opacity-100"
          aria-label={t("workspace.copy-value", { label })}
          onClick={() =>
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            })
          }
        >
          {copied ? (
            <Check className="size-3 text-success" />
          ) : (
            <Copy className="size-3 text-muted-foreground" />
          )}
        </Button>
      )}
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

  // Primary contact facts: profile fields first, then schema channel identifiers, without repeats.
  const facts: FactRow[] = [];
  const addFact = (key: string, label: string, raw: unknown, attrKey: string, channels: string[] = []) => {
    const value = text(raw);
    if (!value) return;
    const existing = facts.find((fact) => fact.raw === value);
    if (existing) {
      // Same value under a schema identifier (e.g. phone + WhatsApp): keep one row, merge its channels.
      existing.channels = [...new Set([...existing.channels, ...channels])];
      return;
    }
    facts.push({ key, label, value: display(value, attrKey), raw: value, channels });
  };
  addFact("phone", t("workspace.phone"), customer.phoneNumber ?? customer.phone, "phoneNumber");
  addFact("email", t("workspace.email"), customer.email, "email");
  for (const attr of ctx.schema) {
    if (!attr.isChannelIdentifier || !attr.key) continue;
    const raw = customer[attr.key as keyof typeof customer];
    const values = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : [];
    values.forEach((value, index) =>
      addFact(`${attr.key}-${index}`, attr.label || attr.key, value, attr.key, attr.channelTypes ?? []),
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b border-border/40 bg-surface px-3.5 py-3">
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
                  "truncate text-sm font-semibold text-foreground",
                  ctx.canEdit && customer._id && "transition-colors group-hover:text-primary",
                )}
                title={name}
              >
                {name}
              </h3>
            </div>
            {ctx.unidentified ? (
              <span className="mt-1 inline-flex rounded-full border border-warning/30 bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning-text">
                {t("workspace.unidentified-hint")}
              </span>
            ) : (
              <p className="truncate text-xs text-muted-foreground tabular-nums">{facts[0]?.value ?? ""}</p>
            )}
            <LabelDots labels={labels} className="mt-1" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {(canHistory || canCustomerHistory) && customer._id && (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="View customer history"
              title="View customer history"
              className="size-8 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
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
              className="size-8 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
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
              className="size-8 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
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
      {tab === "knowledge" && <KnowledgeTab conversation={conversation} />}
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
  return <CasesTab key={context.interactionId} context={context} />;
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
  const [query, setQuery] = useState("");
  // Same plan as the header's Reach customer panel, so the chips never disagree with it.
  const reach = useOutboundReach(conversation, true);
  const chipAction = (raw: string, channel: string): ChipAction => {
    const kind = kindOfChannelType(channel);
    const option = kind ? reach.options.find((o) => o.kind === kind) : undefined;
    if (!option) return null;
    const channelName = t(`workspace.reach.channel.${option.kind}`);
    if (option.state === "continue")
      return {
        label: `${t("workspace.reach.reply-here")} · ${channelName}`,
        mode: "continue",
        onSelect: () => reach.continueOn(option),
      };
    if (option.state !== "ready") return null;
    const target = option.targets.find((item) => item.value === raw) ?? {
      value: raw,
      attrKey: "",
      display: raw,
    };
    return {
      label: t("workspace.start-conversation-on", { channel: channelName }),
      mode: "start",
      onSelect: () => reach.start(option, target),
    };
  };
  const [matches, setMatches] = useState<CustomerRow[]>([]);
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
        setMatches([]);
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
        {facts.length ? (
          <div className="-mx-1.5">
            {facts.map((fact) => (
              <Fact
                key={fact.key}
                label={fact.label}
                value={fact.value}
                copyable={ctx.full}
                // Source hides the email action while an email session is already active.
                channels={fact.channels}
                actionFor={(channel) => chipAction(fact.raw, channel)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("chat-features.customer-info.not-found")}</p>
        )}
      </Section>
      {reach.composeRequest && (
        <OutboundComposeSheet
          key={`${reach.composeRequest.channel}:${reach.composeRequest.destination}`}
          request={reach.composeRequest}
          onClose={reach.closeCompose}
        />
      )}

      {ctx.canLink && (
        <Section title={t("chat-features.customer-info.link-profile")}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const session = linkingChannelSession(conversation);
              const attr = channelIdentifierAttr(session?.channel.channelType.name);
              const field = attr?.key || "phoneNumber";
              void listCustomers(8, 0, query.trim(), { field }).then((page) => setMatches(page.docs));
            }}
          >
            <SearchField value={query} onChange={setQuery} placeholder={t("labels.search")} />
          </form>
          {matches.length > 0 && (
            <ul className="space-y-1">
              {matches.map((match) => (
                <li key={match._id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border px-2 py-1.5 text-start text-xs hover:bg-muted"
                    onClick={() => {
                      if (!match._id) return;
                      runLink(match as Record<string, unknown>);
                    }}
                  >
                    {matchName(match)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </>
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
            <li
              key={session.id}
              className="flex min-h-8 items-center gap-2.5 rounded-xl bg-surface-2/60 px-3 py-2"
            >
              <ChannelBadge channelType={session.channel.channelType} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">{session.channel.channelType.name}</div>
                <div className="truncate text-xs text-muted-foreground tabular-nums">
                  {display(
                    session.channelData.channelCustomerIdentifier,
                    channelIdentifierAttr(session.channel.channelType.name)?.key ?? "phoneNumber",
                  ) || t("chat-features.customer-info.not-found")}
                </div>
              </div>
            </li>
          ))}
          {conversation.activeChannelSessions.length === 0 && (
            <li className="px-1.5 text-xs text-muted-foreground">
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
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize shadow-2xs",
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
              <p className="text-xs font-bold text-foreground">{insight.summary.heading}</p>
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
                <dt className="truncate font-medium text-muted-foreground" title={row.key}>
                  {row.key}
                </dt>
                <dd className="font-semibold break-words whitespace-pre-wrap text-foreground">
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

function KnowledgeTab({ conversation }: { conversation: Conversation }) {
  const { t, i18n } = useTranslation();
  const settings = useDeskSettings();
  const [kbQuery, setKbQuery] = useState("");
  const [kbBusy, setKbBusy] = useState(false);
  const [kbResults, setKbResults] = useState<KnowledgeBaseHit[]>([]);
  const [kbExpanded, setKbExpanded] = useState(false);
  return (
    <Section title={t("chat-features.customer-info.knowledge-base.title")}>
      <form
        className="flex gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!kbQuery.trim() || !settings?.knowledgeBaseUrl) return;
          setKbBusy(true);
          void searchKnowledgeBase({
            url: settings.knowledgeBaseUrl,
            query: kbQuery,
            language: i18n.language || "en",
          })
            .then((hit) => {
              setKbResults((prev) => [hit, ...prev.filter((row) => row.query !== hit.query)].slice(0, 2));
            })
            .catch((error: unknown) => toast.error(String(error)))
            .finally(() => setKbBusy(false));
        }}
      >
        <Input
          value={kbQuery}
          onChange={(event) => setKbQuery(event.target.value)}
          placeholder={t("chat-features.customer-info.knowledge-base.placeholder")}
          className="h-8 rounded-lg"
        />
        <Button
          type="submit"
          size="icon-sm"
          className="size-8 shrink-0 rounded-lg"
          disabled={kbBusy || !kbQuery.trim()}
        >
          {kbBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
        </Button>
      </form>
      <div className="mt-2 space-y-2">
        {kbResults.map((hit) => {
          const answer = hit.answer || "";
          const short = answer.length > 280 && !kbExpanded ? `${answer.slice(0, 280)}…` : answer;
          return (
            <article
              key={hit.query}
              className="space-y-1.5 rounded-xl border border-border/60 bg-card p-3 text-xs shadow-2xs"
            >
              <p className="font-semibold text-foreground">{hit.query}</p>
              <p className="leading-relaxed whitespace-pre-wrap text-muted-foreground">{short}</p>
              {answer.length > 280 && (
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => setKbExpanded((value) => !value)}
                >
                  {t(
                    kbExpanded
                      ? "chat-features.customer-info.knowledge-base.show-less"
                      : "chat-features.customer-info.knowledge-base.show-more",
                  )}
                </button>
              )}
              {hit.sources && hit.sources.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border/40 pt-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {t("chat-features.customer-info.knowledge-base.sources")}
                  </p>
                  {hit.sources.map((source, index) => (
                    <a
                      key={`${source.url ?? source.title ?? index}`}
                      href={source.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-primary underline-offset-2 hover:underline"
                    >
                      {source.title || source.url}
                    </a>
                  ))}
                </div>
              )}
              {answer && (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="mt-2 h-7 rounded-lg text-xs font-medium"
                  onClick={() => useComposerStore.getState().insertText(composerKey(conversation), answer)}
                >
                  {t("chat-features.interactions.apply")}
                </Button>
              )}
            </article>
          );
        })}
      </div>
    </Section>
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
