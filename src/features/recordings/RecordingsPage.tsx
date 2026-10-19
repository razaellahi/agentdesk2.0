import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { getConfig } from "@/config";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Download, FileSpreadsheet, MonitorPlay, Play, RotateCcw, RotateCw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataView } from "@/components/common/DataView";
import { Pager } from "@/components/common/ListChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser, usePermission, useSessionStore } from "@/core/auth";
import { AudioWaveform } from "./AudioWaveform";
import {
  assignRecordingTag,
  exportRecordings,
  listTags,
  CALL_VARIABLES,
  DATE_WITHIN,
  DURATION_OPTIONS,
  dateWithinRange,
  dayRange,
  fetchRecordingAudio,
  logDownload,
  logPlay,
  searchRecordings,
  type Recording,
  type RecordingSearch,
} from "./api";
import { VideoPlayer } from "./VideoPlayer";
import { RecordingTable } from "./RecordingTable";
import { recordingCsv } from "./csv";

const PAGE_SIZE = 25;

type Filters = RecordingSearch & { within: string };

function downloadCsv(rows: Recording[]) {
  const blob = new Blob([recordingCsv(rows, getConfig().DEPLOYMENT_PROFILE)], {
    type: "text/csv;charset=utf-8",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "recordings.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function emptyFilters(): Filters {
  const range = dayRange();
  return {
    ...range,
    within: "",
    agentId: "",
    AgentName: "",
    customerNumber: "",
    agentExtension: "",
    duration: "",
    holdTime: "",
    wrapupCodes: "",
    direction: "",
    callVariableKey: "",
    callVariableValue: "",
    offset: 0,
    pageSize: PAGE_SIZE,
  };
}

export default function RecordingsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const roles = useSessionStore((state) => state.realmRoles);
  const agentOnly = roles.includes("agent") && !roles.some((role) => ["admin", "supervisor"].includes(role));
  const cisco = getConfig().DEPLOYMENT_PROFILE === "CISCO";
  const canDownload = usePermission("recordingsDownload");
  const queryClient = useQueryClient();
  const tagsVisible = usePermission("recordingTagsView") && getConfig().DEPLOYMENT_PROFILE === "CISCO";
  const tagsAssign = usePermission("recordingTagsAssign");
  const tags = useQuery({ queryKey: ["recording-tags"], queryFn: listTags, enabled: tagsVisible });
  const assignment = useMutation({
    mutationFn: ({ row, id }: { row: Recording; id: number | null }) => assignRecordingTag(row, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recordings"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const [exporting, setExporting] = useState(false);
  const canExport = usePermission("recordingsExport");
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [rate, setRate] = useState(1);

  const query = useQuery({
    queryKey: ["recordings", applied, page],
    queryFn: () =>
      searchRecordings({
        ...applied,
        offset: page * PAGE_SIZE,
        pageSize: PAGE_SIZE,
      }),
  });
  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );
  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );
  const playRequest = useRef(0);
  useEffect(
    () => () => {
      playRequest.current++;
    },
    [],
  );
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? rows.length;

  const applyDraft = (next: Filters) => {
    const start = Date.parse((next.startTime ?? "").replace(" ", "T"));
    const end = Date.parse((next.endTime ?? "").replace(" ", "T"));
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      toast.error("Enter a valid date range with From before To.");
      return;
    }
    setPage(0);
    setApplied({ ...next, offset: 0, pageSize: PAGE_SIZE });
  };

  const playAudio = (sessionId: string, downloadUrl: string) => {
    const request = ++playRequest.current;
    void fetchRecordingAudio(downloadUrl, user?.username ?? "")
      .then((blob) => {
        if (request !== playRequest.current) return;
        setRate(1);
        setVideoUrl(null);
        setAudioUrl(URL.createObjectURL(blob));
        void logPlay(sessionId, user?.username ?? "").catch((e: Error) => toast.error(e.message));
      })
      .catch((e: Error) => toast.error(e.message));
  };
  const playVideo = (sessionId: string, screenUrl: string) => {
    const request = ++playRequest.current;
    void fetchRecordingAudio(screenUrl.replace("/recording/screen", "/stream"), user?.username ?? "")
      .then((blob) => {
        if (request !== playRequest.current) return;
        setAudioUrl(null);
        setVideoUrl(URL.createObjectURL(blob));
        void logPlay(sessionId, user?.username ?? "").catch((e: Error) => toast.error(e.message));
      })
      .catch((e: Error) => toast.error(e.message));
  };
  const downloadFile = (sessionId: string, downloadUrl: string, ext: "wav" | "mp3" | "mp4") => {
    if (!canDownload) return;
    void fetchRecordingAudio(downloadUrl, user?.username ?? "", "DOWNLOAD", ext === "mp4" ? undefined : ext)
      .then((blob) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${sessionId}.${ext}`;
        link.click();
        URL.revokeObjectURL(link.href);
        void logDownload(sessionId, user?.username ?? "").catch((e: Error) => toast.error(e.message));
      })
      .catch((e: Error) => toast.error(e.message));
  };

  return (
    <DataView
      title={t("nav.recordings")}
      toolbar={
        <form
          className="flex w-full flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applyDraft(draft);
          }}
        >
          <Select
            value={draft.within || "none"}
            onValueChange={(value) => {
              const within = value === "none" ? "" : value;
              if (!within) {
                const range = dayRange();
                setDraft((prev) => ({ ...prev, within: "", ...range }));
                return;
              }
              const range = dateWithinRange(Number(within));
              setDraft((prev) => ({ ...prev, within, ...range }));
            }}
          >
            <SelectTrigger className="w-36" aria-label={t("recordings.date-within")}>
              <SelectValue placeholder={t("recordings.date-within")} />
            </SelectTrigger>
            <SelectContent>
              {DATE_WITHIN.map((option) => (
                <SelectItem key={option.value || "none"} value={option.value || "none"}>
                  {"labelKey" in option ? t(option.labelKey) : option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft.startTime ?? ""}
            onChange={(event) => setDraft((prev) => ({ ...prev, startTime: event.target.value, within: "" }))}
            className="w-44"
            aria-label={t("recordings.started")}
          />
          <Input
            value={draft.endTime ?? ""}
            onChange={(event) => setDraft((prev) => ({ ...prev, endTime: event.target.value, within: "" }))}
            className="w-44"
            aria-label={t("recordings.ended")}
          />
          {!agentOnly && (
            <>
              <Input
                value={draft.agentId ?? ""}
                onChange={(event) => setDraft((prev) => ({ ...prev, agentId: event.target.value }))}
                placeholder={t("recordings.agent")}
                className="w-32"
              />
              <Input
                value={draft.AgentName ?? ""}
                onChange={(event) => setDraft((prev) => ({ ...prev, AgentName: event.target.value }))}
                placeholder={t("recordings.agent-name")}
                className="w-36"
              />
            </>
          )}
          <Input
            value={draft.customerNumber ?? ""}
            onChange={(event) => setDraft((prev) => ({ ...prev, customerNumber: event.target.value }))}
            placeholder={t("recordings.calling")}
            className="w-32"
          />
          <Input
            value={draft.agentExtension ?? ""}
            onChange={(event) => setDraft((prev) => ({ ...prev, agentExtension: event.target.value }))}
            placeholder={t("recordings.called")}
            className="w-32"
          />
          <Select
            value={draft.duration || "any"}
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, duration: value === "any" ? "" : value }))
            }
          >
            <SelectTrigger className="w-32" aria-label={t("recordings.duration")}>
              <SelectValue placeholder={t("recordings.duration")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">
                {t("recordings.duration")}: {t("recordings.any")}
              </SelectItem>
              {DURATION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={draft.holdTime || "any"}
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, holdTime: value === "any" ? "" : value }))
            }
          >
            <SelectTrigger className="w-32" aria-label={t("recordings.hold")}>
              <SelectValue placeholder={t("recordings.hold")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">
                {t("recordings.hold")}: {t("recordings.any")}
              </SelectItem>
              {DURATION_OPTIONS.map((option) => (
                <SelectItem key={`hold-${option}`} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft.wrapupCodes ?? ""}
            onChange={(event) => setDraft((prev) => ({ ...prev, wrapupCodes: event.target.value }))}
            placeholder={t("recordings.wrapup")}
            className="w-36"
          />
          {cisco && (
            <Select
              value={draft.direction || "any"}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, direction: value === "any" ? "" : value }))
              }
            >
              <SelectTrigger className="w-32" aria-label={t("recordings.direction")}>
                <SelectValue placeholder={t("recordings.direction")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">
                  {t("recordings.direction")}: {t("recordings.any")}
                </SelectItem>
                <SelectItem value="INBOUND">{t("recordings.inbound")}</SelectItem>
                <SelectItem value="OUTBOUND">{t("recordings.outbound")}</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select
            value={draft.callVariableKey || "any"}
            onValueChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                callVariableKey: value === "any" ? "" : value,
                ...(value === "any" ? { callVariableValue: "" } : {}),
              }))
            }
          >
            <SelectTrigger className="w-40" aria-label={t("recordings.call-variable")}>
              <SelectValue placeholder={t("recordings.call-variable")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">
                {t("recordings.call-variable")}: {t("recordings.any")}
              </SelectItem>
              {CALL_VARIABLES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={draft.callVariableValue ?? ""}
            onChange={(event) => setDraft((prev) => ({ ...prev, callVariableValue: event.target.value }))}
            placeholder={t("recordings.call-variable-value")}
            className="w-36"
            disabled={!draft.callVariableKey}
          />
          <Button type="submit">
            <Search />
            {t("recordings.search")}
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-label="Refresh recordings"
            onClick={() => void query.refetch()}
          >
            <RotateCw />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const next = emptyFilters();
              setDraft(next);
              applyDraft(next);
            }}
          >
            Reset
          </Button>
          {tagsVisible && (
            <Select
              value={draft.tagId != null ? String(draft.tagId) : "all"}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, tagId: value === "all" ? undefined : Number(value) }))
              }
            >
              <SelectTrigger className="w-40" aria-label="Filter recording tag">
                <SelectValue placeholder="Recording tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {(tags.data ?? []).map((tag) => (
                  <SelectItem key={tag.id} value={String(tag.id)}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canExport && (
            <Button
              type="button"
              variant="outline"
              className="ms-auto"
              disabled={rows.length === 0 || exporting}
              onClick={() => {
                if (!canExport) return;
                setExporting(true);
                void exportRecordings(applied)
                  .then(downloadCsv)
                  .catch((e: Error) => toast.error(e.message))
                  .finally(() => setExporting(false));
              }}
            >
              <FileSpreadsheet />
              {t("recordings.export")}
            </Button>
          )}
        </form>
      }
      footer={<Pager page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />}
    >
      {query.isError && (
        <p role="alert" className="p-4 text-destructive-text">
          {query.error.message}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {audioUrl && (
        <div className="grid gap-2 border-b bg-muted/40 px-4 py-2.5">
          <AudioWaveform url={audioUrl} audioRef={audioRef} rate={rate} />
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label={t("recordings.skip-back")}
                  onClick={() => {
                    const node = audioRef.current;
                    if (node) node.currentTime = Math.max(0, node.currentTime - 10);
                  }}
                >
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("recordings.skip-back")}</TooltipContent>
            </Tooltip>
            <audio ref={audioRef} src={audioUrl} controls autoPlay className="h-8 min-w-48 flex-1">
              <track kind="captions" />
            </audio>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label={t("recordings.skip-forward")}
                  onClick={() => {
                    const node = audioRef.current;
                    if (node) node.currentTime += 10;
                  }}
                >
                  <RotateCw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("recordings.skip-forward")}</TooltipContent>
            </Tooltip>
            <div
              className="flex rounded-md border bg-card p-0.5"
              role="group"
              aria-label={t("recordings.speed")}
            >
              {[0.5, 1, 1.25, 1.5, 2].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded px-2 py-1 text-xs font-medium tabular-nums ${rate === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => {
                    const node = audioRef.current;
                    if (node) node.playbackRate = value;
                    setRate(value);
                  }}
                >
                  {value}×
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {videoUrl && <VideoPlayer url={videoUrl} onClose={() => setVideoUrl(null)} />}
      <RecordingTable
        rows={rows}
        loading={query.isLoading}
        tags={
          tagsVisible
            ? (row) =>
                tagsAssign ? (
                  <Select
                    value={row.tagId != null ? String(row.tagId) : "none"}
                    disabled={assignment.isPending}
                    onValueChange={(value) =>
                      assignment.mutate({ row, id: value === "none" ? null : Number(value) })
                    }
                  >
                    <SelectTrigger className="w-36" aria-label="Assign recording tag">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No tag</SelectItem>
                      {(tags.data ?? []).map((tag) => (
                        <SelectItem key={tag.id} value={String(tag.id)}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  (row.tagName ?? "—")
                )
            : undefined
        }
        actions={(row) => (
          <>
            {row.downloadUrl && row.sessionId && (
              <div className="flex justify-end gap-1">
                {row.screenRecordingUrl && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label={t("recordings.video")}
                        disabled={row.isArchived}
                        onClick={() => playVideo(row.sessionId!, row.screenRecordingUrl!)}
                      >
                        <MonitorPlay />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("recordings.video")}</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label={t("recordings.play")}
                      disabled={row.isArchived}
                      onClick={() => playAudio(row.sessionId!, row.downloadUrl!)}
                    >
                      <Play />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("recordings.play")}</TooltipContent>
                </Tooltip>
                {canDownload && row.screenRecordingUrl && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Download screen recording"
                    disabled={row.isArchived}
                    onClick={() => downloadFile(row.sessionId!, row.screenRecordingUrl!, "mp4")}
                  >
                    <Download />
                  </Button>
                )}
                {canDownload && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={t("recordings.download")}
                          disabled={row.isArchived}
                          onClick={() => downloadFile(row.sessionId!, row.downloadUrl!, "wav")}
                        >
                          <Download />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("recordings.download")}</TooltipContent>
                    </Tooltip>
                    {!row.downloadUrl.includes("/recording/screen") && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={t("recordings.mp3")}
                            disabled={row.isArchived}
                            onClick={() => downloadFile(row.sessionId!, row.downloadUrl!, "mp3")}
                          >
                            {t("recordings.mp3")}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("recordings.mp3")}</TooltipContent>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      />
    </DataView>
  );
}
