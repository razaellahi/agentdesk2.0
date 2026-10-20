import { FieldLabel } from "./Fields";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchRoutingGroupMembers,
  fetchRoutingGroupsForReassign,
  type DirectoryUser,
  type ReassignInput,
} from "../api";
import { groupSlug } from "../model/format";

export interface ReassignRequest {
  /** "CASE-…" or "3 selected cases". */
  subject: string;
  currentGroupId: string | null;
  currentAssigneeId: string | null;
  verb: "assign" | "reassign";
}

function memberLabel(m: DirectoryUser) {
  const name = m.displayName?.trim();
  if (name && m.username) return `${name} (${m.username})`;
  return name || m.username || m.userId;
}

/**
 * Send a case to a team queue or to one team member: only one target is stored
 * (case-reassign.dialog.ts).
 */
export function ReassignDialog({
  request,
  onCancel,
  onSubmit,
}: {
  request: ReassignRequest | null;
  onCancel: () => void;
  onSubmit: (input: ReassignInput) => void;
}) {
  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        {request && (
          <ReassignForm key={request.subject} request={request} onCancel={onCancel} onSubmit={onSubmit} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReassignForm({
  request,
  onCancel,
  onSubmit,
}: {
  request: ReassignRequest;
  onCancel: () => void;
  onSubmit: (input: ReassignInput) => void;
}) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<"group" | "user">("group");
  const [groupId, setGroupId] = useState(request.currentGroupId ?? "");
  const [memberGroup, setMemberGroup] = useState(request.currentGroupId ?? "");
  const [userId, setUserId] = useState(request.currentAssigneeId ?? "");
  const [note, setNote] = useState("");

  const groupsQuery = useQuery({
    queryKey: ["cases", "reassign-groups"],
    queryFn: fetchRoutingGroupsForReassign,
  });
  const payload = groupsQuery.data;
  const groups =
    payload?.status === "OK" ? payload.groups.map((g) => ({ ...g, slug: groupSlug(g.name) })) : [];
  const groupsError = groupsQuery.isError
    ? t("cases.reassign.groups-failed")
    : payload && payload.status !== "OK"
      ? (payload.message ?? t("cases.reassign.groups-unavailable"))
      : null;
  // A single team is preselected, as in the source dialog.
  const onlyGroup = groups.length === 1 ? groups[0]!.slug : "";
  const effectiveGroup = groupId || onlyGroup;
  const effectiveMemberGroup = memberGroup || onlyGroup;

  const members = useQuery({
    queryKey: ["cases", "reassign-members", effectiveMemberGroup],
    queryFn: () => fetchRoutingGroupMembers(effectiveMemberGroup),
    enabled: target === "user" && Boolean(effectiveMemberGroup),
  });

  const ready = !groupsQuery.isPending && !groupsError && groups.length > 0;
  const canSubmit =
    ready &&
    (target === "group"
      ? Boolean(effectiveGroup.trim())
      : Boolean(effectiveMemberGroup.trim() && userId.trim() && !members.isFetching));

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      assignedGroupId: target === "group" ? effectiveGroup.trim() : null,
      assignedUserId: target === "user" ? userId.trim() : null,
      internalNote: note.trim() || undefined,
    });
  };

  const verb = request.verb === "assign" ? t("cases.reassign.assign") : t("cases.reassign.reassign");
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {verb} {request.subject}
        </DialogTitle>
        <DialogDescription>{t("cases.reassign.hint")}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <RadioGroup
          value={target}
          onValueChange={(value) => setTarget(value as "group" | "user")}
          className="gap-2"
        >
          <Label className="flex items-center gap-2 font-normal">
            <RadioGroupItem value="group" /> {t("cases.reassign.to-group")}
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <RadioGroupItem value="user" /> {t("cases.reassign.to-user")}
          </Label>
        </RadioGroup>
        {groupsQuery.isPending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {t("cases.reassign.loading-groups")}
          </p>
        ) : groupsError ? (
          <p className="text-sm text-destructive-text">{groupsError}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-destructive-text">{t("cases.reassign.no-groups")}</p>
        ) : target === "group" ? (
          <div className="space-y-1.5">
            <FieldLabel>{t("cases.routing-group")}</FieldLabel>
            <Select value={effectiveGroup} onValueChange={setGroupId}>
              <SelectTrigger className="w-full" aria-label={t("cases.routing-group")}>
                <SelectValue placeholder={t("cases.reassign.select-group")} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.slug}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <FieldLabel>{t("cases.reassign.team")}</FieldLabel>
              <Select
                value={effectiveMemberGroup}
                onValueChange={(value) => {
                  setMemberGroup(value);
                  setUserId("");
                }}
              >
                <SelectTrigger className="w-full" aria-label={t("cases.reassign.team")}>
                  <SelectValue placeholder={t("cases.reassign.select-group")} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.slug}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>{t("cases.reassign.member")}</FieldLabel>
              <Select
                value={userId}
                onValueChange={setUserId}
                disabled={!effectiveMemberGroup || members.isFetching}
              >
                <SelectTrigger className="w-full" aria-label={t("cases.reassign.member")}>
                  <SelectValue
                    placeholder={
                      members.isFetching
                        ? t("cases.reassign.loading-members")
                        : !effectiveMemberGroup
                          ? t("cases.reassign.select-team-first")
                          : (members.data?.length ?? 0) === 0
                            ? t("cases.reassign.no-members")
                            : t("cases.reassign.select-member")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(members.data ?? []).map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {memberLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <FieldLabel htmlFor="reassign-note">{t("cases.reassign.note")}</FieldLabel>
          <Textarea
            id="reassign-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          {t("cases.cancel")}
        </Button>
        <Button disabled={!canSubmit} onClick={submit}>
          {verb}
        </Button>
      </DialogFooter>
    </>
  );
}
