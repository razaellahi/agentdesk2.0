import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAssigneeCandidates, type DirectoryUser } from "../api";
import { directoryName as assigneeName } from "../model/format";

const NONE = "__policy__";

/** Optional assignee among the resolved routing group's members (case-assignee-picker). */
export function AssigneePicker({
  groupKey,
  value,
  onChange,
}: {
  groupKey: string | null;
  value: DirectoryUser | null;
  onChange: (user: DirectoryUser | null) => void;
}) {
  const { t } = useTranslation();
  const members = useQuery({
    queryKey: ["cases", "assignee-candidates", groupKey],
    queryFn: () => fetchAssigneeCandidates(groupKey!),
    enabled: Boolean(groupKey),
  });
  const list = members.data ?? [];
  const placeholder = !groupKey
    ? t("cases.create.assignee-pick-routing")
    : members.isPending
      ? t("cases.reassign.loading-members")
      : members.isError
        ? t("cases.create.assignee-load-failed")
        : list.length === 0
          ? t("cases.reassign.no-members")
          : t("cases.create.assignee-policy");
  return (
    <Select
      value={value?.userId ?? NONE}
      disabled={!groupKey || members.isPending}
      onValueChange={(id) => onChange(id === NONE ? null : (list.find((m) => m.userId === id) ?? null))}
    >
      <SelectTrigger className="w-full" aria-label={t("cases.assignee")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("cases.create.assignee-policy")}</SelectItem>
        {list.map((m) => (
          <SelectItem key={m.userId} value={m.userId}>
            {assigneeName(m)}
            {m.username && m.displayName ? ` (${m.username})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
