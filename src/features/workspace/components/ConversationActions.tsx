import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Hand,
  Headphones,
  MessageSquareShare,
  Minimize2,
  MoreHorizontal,
  Pause,
  PhoneForwarded,
  Pin,
  Play,
  SquareArrowOutUpRight,
  UserRound,
  UsersRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDeskSettings } from "@/core/agent-settings";
import { usePermission } from "@/core/auth";
import { OutboundComposeSheet } from "@/features/customers";
import { useCallStore } from "@/features/voice";
import { IconTooltip } from "@/components/common/IconTooltip";
import { cn } from "@/shared/lib/utils";
import { removeFromBoard } from "../board/sideBySide";
import { useOutboundReach } from "../hooks/useOutboundReach";
import type { Conversation } from "../model/types";
import { openWrapUp } from "../session/actions";
import { completeConsult } from "../session/assistance";
import {
  bargeIntoConversation,
  canChangeSupervisorRole,
  emitHandRaise,
  switchToWhisper,
} from "../session/agentSession";
import { useBoardStore } from "../store/boardStore";
import { openConversationPopout } from "../store/popout";
import { ParticipantsDialog } from "./ParticipantsDialog";
import { ReachCustomer } from "./ReachCustomer";

export type PaneLayout = "ultra-narrow" | "narrow" | "compact" | "roomy";

/** How many actions sit in the header at each pane width; the rest go to More. */
// Roomy has room for every action; the three-dot menu then only holds layout extras.
// Narrow panes keep Pause, Reach and Customer info in the header.
const INLINE_BUDGET: Record<PaneLayout, number> = { roomy: 12, compact: 9, narrow: 5, "ultra-narrow": 3 };

interface HeaderAction {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Lower shows first; ties keep declaration order. */
  priority: number;
  /** Always in the header (an active state the agent must see, e.g. a raised hand). */
  pinned?: boolean;
  pressed?: boolean;
  tone?: "warning" | "primary" | "danger";
  onSelect?: () => void;
  /** Choices shown as a menu (pause durations). */
  choices?: { key: string; label: string; onSelect: () => void }[];
  /** The Reach customer panel. */
  reach?: boolean;
  /** Greyed out but still shown (unified-agent keeps hold controls visible for whispers). */
  disabled?: boolean;
}

/**
 * The open conversation's actions, laid out by priority for the pane width:
 * nothing an agent cannot use is shown, nothing appears twice, an active state
 * (raised hand) never hides, and everything that does not fit goes to More.
 */
export function ConversationActions({
  conversation,
  displayName,
  layout,
  infoVisible,
  infoActive,
  onToggleInfo,
  board,
  onAssist,
  onPause,
  onResume,
  onLeave,
}: {
  conversation: Conversation;
  displayName: string;
  layout: PaneLayout;
  /** False when the context dock already shows customer info beside the transcript. */
  infoVisible: boolean;
  infoActive: boolean;
  onToggleInfo: () => void;
  board?: { index: number; count: number; focused: boolean };
  onAssist: () => void;
  onPause: (minutes: number) => void;
  onResume: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const settings = useDeskSettings();
  const canTransfer = usePermission("directTransfer");
  const canConsult = usePermission("consult");
  const canConference = usePermission("conference");
  const canLeave = usePermission("leaveChat");
  const canWrapUp = usePermission("wrapUp");
  const canInitiate = usePermission("initiateChat");
  const inSession = usePermission("agentSession");
  const monitoringVoice = useCallStore((s) => s.phase !== "idle" && s.main?.dialog.callType === "MONITORING");
  const pinned = useBoardStore((s) => s.pinned.includes(conversation.conversationId));
  const [reachOpen, setReachOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const reachFromMenu = useRef(false);
  const reach = useOutboundReach(conversation, reachOpen);

  const id = conversation.conversationId;
  const active = conversation.state === "ACTIVE";
  const primary = conversation.topicParticipant.role === "PRIMARY";
  const ownsConversation = primary && active;
  const holdOptions = settings?.holdOptions ?? [];
  const isAssistant = primary && conversation.agentParticipants.some((p) => p.role === "ASSISTANT");
  const multiPane = Boolean(board && board.count > 1);

  const wrapUpAvailable = Boolean(canWrapUp && settings?.wrapUp && active && !conversation.wrapUp.show);
  const leaveAllowed = canLeave || !active;
  const startWrapUp = () => openWrapUp(id, settings?.wrapUpSeconds ?? 0);
  const actions: HeaderAction[] = [];
  if (!monitoringVoice && canChangeSupervisorRole(id, "BARGE_IN"))
    actions.push({
      id: "barge",
      label: t("supervisor.barge-in"),
      icon: MessageSquareShare,
      priority: 1,
      tone: "primary",
      onSelect: () => bargeIntoConversation(id),
    });
  if (!monitoringVoice && canChangeSupervisorRole(id, "WHISPER"))
    actions.push({
      id: "whisper",
      label: t("chat-features.interactions.whisper"),
      icon: Headphones,
      priority: 2,
      onSelect: () => switchToWhisper(id),
    });
  // Hold follows unified-agent: any active conversation the agent is not only assisting on.
  // A whisper (listen-only) keeps the controls visible but disabled.
  const holdable = active && conversation.topicParticipant.role !== "ASSISTANT";
  const whispering = conversation.topicParticipant.role === "WHISPER";
  // A held conversation always shows Resume in the header, not only in the menu.
  if (conversation.hold.active && holdable)
    actions.push({
      id: "resume",
      label: t("chat-features.interactions.resume-conversation"),
      icon: Play,
      priority: 0,
      pinned: true,
      tone: "primary",
      disabled: whispering,
      onSelect: onResume,
    });
  if (ownsConversation)
    actions.push({
      id: "hand",
      label: conversation.handRaised
        ? t("chat-features.interactions.lower-hand")
        : t("chat-features.interactions.raise-hand"),
      icon: Hand,
      priority: 6,
      pinned: conversation.handRaised,
      pressed: conversation.handRaised,
      tone: conversation.handRaised ? "warning" : undefined,
      onSelect: () => emitHandRaise(id),
    });
  // Past (closed) conversations too: reaching the customer again is the usual reason to open one.
  if (inSession && canInitiate)
    actions.push({
      id: "reach",
      label: t("workspace.reach.trigger"),
      icon: PhoneForwarded,
      // Ahead of Customer info so it stays in the header, not the ... menu, in narrow panes.
      priority: 3,
      reach: true,
    });
  if (ownsConversation && (canTransfer || canConsult || canConference))
    actions.push({
      id: "transfer",
      label: t("chat-features.interactions.Transfer"),
      icon: ArrowRightLeft,
      priority: 5,
      onSelect: onAssist,
    });
  if (holdable && !conversation.hold.active && holdOptions.length > 0)
    actions.push({
      id: "pause",
      label: t("chat-features.interactions.pause-conversation"),
      icon: Pause,
      // High enough to stay in the header in compact panes, next to Resume.
      priority: 2,
      disabled: whispering,
      choices: holdOptions.map((span) => ({
        key: String(span.value),
        label: t("admin-settings.fields.hold.minutes", { count: span.value }),
        onSelect: () => onPause(span.value),
      })),
    });
  if (infoVisible)
    actions.push({
      id: "info",
      label: t("chat-features.customer-info.info"),
      icon: UserRound,
      // The header name opens it too, so it yields to Reach customer in a cramped pane.
      priority: 4,
      pressed: infoActive,
      tone: infoActive ? "primary" : undefined,
      onSelect: onToggleInfo,
    });

  // Who is in the conversation, when the desk has it switched on.
  if (settings?.conversationParticipants)
    actions.push({
      id: "participants",
      label: t("workspace.participants.title"),
      icon: UsersRound,
      priority: 7,
      onSelect: () => setParticipantsOpen(true),
    });
  if (wrapUpAvailable)
    actions.push({
      id: "wrapup",
      label: t("chat-features.interactions.wrapup"),
      icon: ClipboardCheck,
      priority: 8,
      onSelect: startWrapUp,
    });
  actions.push({
    id: "popout",
    label: t("globals.pop-out"),
    icon: SquareArrowOutUpRight,
    priority: 9,
    onSelect: () => {
      if (!openConversationPopout(id)) toast.error(t("workspace.popout-unavailable"));
    },
  });
  if (leaveAllowed)
    actions.push({
      id: "leave",
      label: t("chat-features.interactions.leave-conversation"),
      icon: X,
      priority: 10,
      tone: "danger",
      onSelect: onLeave,
    });

  const budget = INLINE_BUDGET[layout];
  const ranked = actions
    .map((action, order) => ({ action, order }))
    .sort((a, b) => a.action.priority - b.action.priority || a.order - b.order)
    .map(({ action }) => action);
  // Pinned states always show (even past the budget); the highest-priority rest fill it.
  const inline = new Set(ranked.filter((a) => a.pinned).map((a) => a.id));
  for (const action of ranked) {
    if (inline.size >= budget) break;
    inline.add(action.id);
  }
  const shown = ranked.filter((a) => inline.has(a.id));
  const overflow = ranked.filter((a) => !inline.has(a.id));
  // Leave closes the menu, below everything else and set apart; the rest follow priority.
  const overflowMain = overflow.filter((a) => a.id !== "leave");
  const leaveInMenu = !inline.has("leave");

  // Whatever the header does not show is in the menu; with everything shown there is no menu.
  const hasMore = overflowMain.length > 0 || isAssistant || multiPane || leaveInMenu;

  const openReachFromMenu = () => {
    reachFromMenu.current = true;
    // Let the menu finish closing before the panel opens against the header.
    requestAnimationFrame(() => setReachOpen(true));
  };

  // Icon-only, one size for every control; the name shows in a tooltip on hover and focus.
  const inlineButton = (action: HeaderAction) => {
    const classes = cn(
      "size-9 shrink-0 rounded-full bg-control text-foreground/70 transition-colors hover:bg-control-hover hover:text-foreground",
      action.tone === "warning" &&
        "bg-warning-soft text-warning-text hover:bg-warning-soft/80 hover:text-warning-text",
      action.tone === "primary" && "bg-primary-soft text-primary hover:bg-primary-soft/80 hover:text-primary",
      // Leave: quiet until hovered, then destructive.
      action.tone === "danger" && "hover:bg-destructive-soft hover:text-destructive",
    );
    const icon = (
      <action.icon
        className={cn("size-[18px]", action.id === "hand" && action.pressed && "animate-bounce")}
        strokeWidth={1.75}
        aria-hidden
      />
    );
    if (action.reach)
      return (
        <IconTooltip key={action.id} label={action.label}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={action.label}
              className={cn(classes, reachOpen && "bg-primary-soft text-primary")}
              data-testid="conversation-outbound-trigger"
            >
              {icon}
            </Button>
          </PopoverTrigger>
        </IconTooltip>
      );
    if (action.choices)
      return (
        <DropdownMenu key={action.id}>
          <IconTooltip label={action.label}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={action.label}
                className={classes}
                disabled={action.disabled}
              >
                {icon}
              </Button>
            </DropdownMenuTrigger>
          </IconTooltip>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{action.label}</DropdownMenuLabel>
            {action.choices.map((choice) => (
              <DropdownMenuItem key={choice.key} onSelect={choice.onSelect}>
                <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                {choice.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    return (
      <IconTooltip key={action.id} label={action.label}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={action.label}
          className={classes}
          disabled={action.disabled}
          aria-pressed={action.pressed}
          onClick={action.onSelect}
        >
          {icon}
        </Button>
      </IconTooltip>
    );
  };

  const menuItem = (action: HeaderAction): ReactNode => {
    if (action.choices)
      return (
        <DropdownMenuSub key={action.id}>
          <DropdownMenuSubTrigger>
            <action.icon className="size-4" aria-hidden />
            {action.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-40">
            {action.choices.map((choice) => (
              <DropdownMenuItem key={choice.key} onSelect={choice.onSelect}>
                <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                {choice.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    return (
      <DropdownMenuItem key={action.id} onSelect={action.reach ? openReachFromMenu : action.onSelect}>
        <action.icon className={cn("size-4", action.tone === "warning" && "text-warning-text")} aria-hidden />
        {action.label}
      </DropdownMenuItem>
    );
  };

  const consultItems = isAssistant
    ? [
        {
          key: "transfer",
          label: t("workspace.complete-consult-transfer"),
          icon: ArrowRightLeft,
          disabled: !canTransfer,
          mode: "transfer" as const,
        },
        {
          key: "conference",
          label: t("workspace.complete-consult-conference"),
          icon: Users,
          disabled: !canConference,
          mode: "conference" as const,
        },
      ]
    : [];

  return (
    <Popover
      open={reachOpen}
      onOpenChange={(open) => {
        setReachOpen(open);
        if (!open) reachFromMenu.current = false;
      }}
    >
      <PopoverAnchor asChild>
        <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          {shown.map(inlineButton)}

          {hasMore && (
            <DropdownMenu>
              <IconTooltip label={t("globals.view-more")}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-9 shrink-0 rounded-full bg-control text-foreground/70 transition-colors hover:bg-control-hover hover:text-foreground"
                    aria-label={t("globals.view-more")}
                  >
                    <MoreHorizontal className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
              </IconTooltip>
              <DropdownMenuContent
                align="end"
                className="max-h-[min(70vh,32rem)] min-w-56 overflow-y-auto"
                // Keep focus off the trigger so the Reach panel opened from here stays open.
                onCloseAutoFocus={(event) => reachFromMenu.current && event.preventDefault()}
              >
                {overflowMain.length > 0 && <>{overflowMain.map(menuItem)}</>}
                {consultItems.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    disabled={item.disabled}
                    onSelect={() => completeConsult(conversation, item.mode)}
                  >
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </DropdownMenuItem>
                ))}
                {board && multiPane && (
                  <>
                    <DropdownMenuItem
                      disabled={board.index === 0}
                      onSelect={() => useBoardStore.getState().swap(board.index, board.index - 1)}
                    >
                      <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
                      {t("workspace.move-pane-left")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={board.index === board.count - 1}
                      onSelect={() => useBoardStore.getState().swap(board.index, board.index + 1)}
                    >
                      <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
                      {t("workspace.move-pane-right")}
                    </DropdownMenuItem>
                    {layout === "ultra-narrow" && (
                      <DropdownMenuItem onSelect={() => useBoardStore.getState().togglePin(id)}>
                        <Pin className={cn("size-4", pinned && "fill-current")} aria-hidden />
                        {t(pinned ? "workspace.unpin-pane" : "workspace.pin-pane")}
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                {leaveInMenu && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled={!canLeave && active} variant="destructive" onSelect={onLeave}>
                      <X className="size-4" aria-hidden />
                      {t("chat-features.interactions.leave-conversation")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {board && multiPane && (
            <>
              {layout !== "ultra-narrow" && (
                <IconTooltip label={t(pinned ? "workspace.unpin-pane" : "workspace.pin-pane")}>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t(pinned ? "workspace.unpin-pane" : "workspace.pin-pane")}
                    aria-pressed={pinned}
                    className={cn(
                      "size-9 shrink-0 rounded-full",
                      pinned
                        ? "bg-primary-soft text-primary"
                        : "bg-control text-foreground/70 transition-colors hover:bg-control-hover hover:text-foreground",
                    )}
                    onClick={() => useBoardStore.getState().togglePin(id)}
                  >
                    <Pin className={cn("size-5", pinned && "fill-current")} />
                  </Button>
                </IconTooltip>
              )}
              <IconTooltip label={t("workspace.remove-from-board")}>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9 shrink-0 rounded-full bg-control text-foreground/70 transition-colors hover:bg-control-hover hover:text-foreground"
                  aria-label={t("workspace.remove-from-board")}
                  onClick={() => removeFromBoard(id)}
                >
                  {/* Not an X: this only closes the pane; it does not leave the conversation. */}
                  <Minimize2 className="size-5" />
                </Button>
              </IconTooltip>
            </>
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        collisionPadding={8}
        className="w-[min(24rem,calc(100vw-1rem))] overflow-hidden p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <ReachCustomer reach={reach} name={displayName} onDone={() => setReachOpen(false)} />
      </PopoverContent>

      <ParticipantsDialog
        conversation={conversation}
        open={participantsOpen}
        onOpenChange={setParticipantsOpen}
      />

      {reach.composeRequest && (
        <OutboundComposeSheet
          key={`${reach.composeRequest.channel}:${reach.composeRequest.destination}`}
          request={reach.composeRequest}
          onClose={reach.closeCompose}
        />
      )}
    </Popover>
  );
}
