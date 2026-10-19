import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/common/ListChrome";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { QueryError } from "@/components/common/QueryError";
import { DataTable, DataView, EmptyRow, Td, Th } from "@/components/common/DataView";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/core/i18n";
import { listAuditLogs } from "./api";

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState({ username: "", action: "", ipAddress: "", startDate: "", endDate: "" });
  const [filters, setFilters] = useState(draft);
  const query = useQuery({
    queryKey: ["recording-audit", filters, page],
    queryFn: () => listAuditLogs({ ...filters, offset: page * 25, pageSize: 25 }),
  });
  const rows = query.data?.rows ?? [];

  return (
    <DataView
      title={t("nav.audit-logs")}
      toolbar={
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters(draft);
            setPage(0);
          }}
        >
          {(["username", "action", "ipAddress", "startDate", "endDate"] as const).map((key) => (
            <Input
              key={key}
              type={key.endsWith("Date") ? "datetime-local" : "text"}
              aria-label={key}
              placeholder={key}
              value={draft[key]}
              onChange={(e) => setDraft((s) => ({ ...s, [key]: e.target.value }))}
              className="w-40"
            />
          ))}
          <Button type="submit">{t("labels.search")}</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const empty = { username: "", action: "", ipAddress: "", startDate: "", endDate: "" };
              setDraft(empty);
              setFilters(empty);
              setPage(0);
            }}
          >
            Reset
          </Button>
        </form>
      }
      footer={<Pager page={page} pageSize={25} total={query.data?.total ?? 0} onPage={setPage} />}
    >
      <QueryError error={query.error} onRetry={() => void query.refetch()} />
      <DataTable>
        <thead>
          <tr>
            <Th>{t("recordings.time")}</Th>
            <Th>{t("recordings.user")}</Th>
            <Th>{t("recordings.action")}</Th>
            <Th>{t("recordings.resource")}</Th>
            <Th>{t("recordings.status")}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <EmptyRow>{query.isLoading ? t("supervisor.loading-dashboard") : t("recordings.empty")}</EmptyRow>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <Td>{row.timestamp ? formatDateTime(row.timestamp) : ""}</Td>
              <Td className="font-medium">{row.username}</Td>
              <Td>{row.action && <Badge variant="secondary">{row.action}</Badge>}</Td>
              <Td className="tabular-nums">{row.resource_id}</Td>
              <Td>{row.status}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </DataView>
  );
}
