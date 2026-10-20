import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { IconTooltip } from "@/components/common/IconTooltip";
import { UnreadBadge } from "@/components/common/UnreadBadge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermission } from "@/core/auth";
import { formatRelative } from "@/core/i18n";
import { cn } from "@/shared/lib/utils";
import {
  caseKeys,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type CaseNotification,
} from "../api";
import { caseManagementConfigured } from "../model/config";
import { formatCommentBody } from "../model/format";

const TYPE: Record<string, { key: string; className: string }> = {
  SLA_WARNING: { key: "cases.notifications.sla", className: "bg-warning-soft text-warning-text" },
  SLA_BREACH: { key: "cases.notifications.breach", className: "bg-destructive-soft text-destructive-text" },
  MENTION: { key: "cases.notifications.mention", className: "bg-primary-soft text-primary" },
};

/** Case in-app notifications: SLA warnings/breaches and @mentions (notification-bell.component.ts). */
export function CaseNotificationsMenu() {
  const allowed = usePermission("casesInConversation");
  if (!allowed || !caseManagementConfigured()) return null;
  return <NotificationsMenu />;
}

function NotificationsMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const unread = useQuery({
    queryKey: caseKeys.unread,
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 60_000,
    retry: false,
  });
  const items = useQuery({
    queryKey: caseKeys.notifications,
    queryFn: fetchNotifications,
    enabled: open,
    staleTime: 0,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: caseKeys.notifications });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });

  const openItem = (n: CaseNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.caseId) {
      setOpen(false);
      void navigate(`/cases?caseId=${encodeURIComponent(n.caseId)}`);
    }
  };

  const count = unread.data ?? 0;
  const label = count > 0 ? t("cases.notifications.label-unread", { count }) : t("cases.notifications.label");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <IconTooltip label={label}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="relative size-9 rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label={label}
          >
            <BriefcaseBusiness className="size-[18px]" />
            {count > 0 && <UnreadBadge count={count} />}
          </Button>
        </PopoverTrigger>
      </IconTooltip>
      <PopoverContent
        align="end"
        className="w-96 rounded-2xl border border-border bg-surface p-0 shadow-lift"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium">{t("cases.notifications.title")}</p>
          {count > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              {t("cases.notifications.mark-all")}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.isPending ? (
            <p className="p-4 text-center text-xs text-muted-foreground">{t("cases.loading")}</p>
          ) : (items.data ?? []).length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">{t("cases.notifications.empty")}</p>
          ) : (
            <ul>
              {items.data!.map((n) => {
                const type = TYPE[n.type];
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={cn(
                        "w-full space-y-1 border-b border-border px-4 py-2.5 text-start hover:bg-surface-2/60",
                        !n.isRead && "bg-primary-soft/40",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                          type?.className ?? "bg-surface-2",
                        )}
                      >
                        {type ? t(type.key) : n.type}
                      </span>
                      <span className="block text-sm font-medium">{n.title}</span>
                      {n.body && (
                        <span className="block text-xs text-muted-foreground">
                          {formatCommentBody(n.body)}
                        </span>
                      )}
                      <span className="block text-[11px] text-muted-foreground">
                        {formatRelative(n.createdAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
