import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Eye,
  EyeOff,
  Info,
  Lock,
  MessageSquareText,
  Phone,
  PlugZap,
  Settings2,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ReadOnlyNotice } from "@/components/common/ReadOnlyNotice";
import { SaveBar } from "@/components/common/SaveBar";
import { useUnsavedChanges } from "@/components/common/useUnsavedChanges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDeskSettingsStore } from "@/core/agent-settings";
import { ApiError } from "@/core/api";
import { usePermission } from "@/core/auth";
import { cn } from "@/shared/lib/utils";
import { adminKeys, getDeskSettingsDoc, saveDeskSettings } from "../api";
import {
  Field,
  PlainRow,
  SectionIndex,
  SettingsSection,
  ToggleRow,
  type SectionMeta,
} from "../components/SettingsLayout";
import { CISCO_FIELDS, CX_VOICE_FIELDS, HOLD_SPANS, type ConfigField } from "./fields";
import { settingsSchema, toForm, toPayload, type SettingsForm } from "./model";

const SETTINGS_ERROR_TOGGLES: Partial<Record<FieldPath<SettingsForm>, FieldPath<SettingsForm>>> = {
  "knowledgeAiAssistance.knowledgeBaseUrl": "knowledgeAiAssistance.isKnowledgeBaseSearchEnabled",
  "conversationHandling.wrapUpTime": "conversationHandling.isWrapUpEnabled",
  "conversationHandling.inactivityTimeoutSeconds": "conversationHandling.isInactivityTimerEnabled",
  "conversationHandling.prefixCode": "conversationHandling.isOutboundSmsEnabled",
  "conversationHandling.autoAnswerDelay": "conversationHandling.isAutoAnswerEnabled",
  "voiceTelephony.cxVoiceSettings.autoCallAnswerTimer": "voiceTelephony.isCxVoiceEnabled",
};

const SETTINGS_FIELD_IDS: Partial<Record<string, string>> = {
  "knowledgeAiAssistance.knowledgeBaseUrl": "f-kb-url",
  "conversationHandling.prefixCode": "f-prefix",
  "conversationHandling.holdConversation": "f-hold",
  "voiceTelephony.cxVoiceSettings.autoCallAnswerTimer": "f-cxVoiceSettings-autoCallAnswerTimer",
};

function settingsFieldLabel(path: string, t: (key: string) => string) {
  const keys: Record<string, string> = {
    "knowledgeAiAssistance.knowledgeBaseUrl": "admin-settings.fields.kbUrl.label",
    "conversationHandling.wrapUpTime": "admin-settings.fields.wrapUpTime.label",
    "conversationHandling.inactivityTimeoutSeconds": "admin-settings.fields.inactivityTime.label",
    "conversationHandling.prefixCode": "admin-settings.fields.prefixCode.label",
    "conversationHandling.holdConversation": "admin-settings.fields.hold.label",
    "conversationHandling.autoAnswerDelay": "admin-settings.fields.autoAnswerDelay.label",
    "workspacePreferences.dashboardRefreshTime": "admin-settings.fields.dashboardRefresh.label",
    "voiceTelephony.cxVoiceSettings.autoCallAnswerTimer": "admin-settings.cx.autoCallAnswerTimer.label",
  };
  const key = keys[path];
  return key ? t(key) : (path.split(".").at(-1) ?? path);
}

function SecretInput({ id, disabled, ...props }: React.ComponentProps<typeof Input>) {
  const { t } = useTranslation();
  const [reveal, setReveal] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={reveal ? "text" : "password"}
        autoComplete="off"
        className="pe-9 font-mono"
        disabled={disabled}
        {...props}
      />
      <button
        type="button"
        onClick={() => setReveal((r) => !r)}
        className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        aria-label={reveal ? t("auth.hide-password") : t("auth.show-password")}
      >
        {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/** Agent Desk Settings (unified-admin /agent-desk). */
export default function SettingsPage() {
  const { t } = useTranslation();
  const canManage = usePermission("adminSettingsManage");
  const queryClient = useQueryClient();
  const schema = useMemo(() => settingsSchema(t), [t]);

  const query = useQuery({ queryKey: adminKeys.deskSettings, queryFn: getDeskSettingsDoc });
  const loaded = useMemo(() => (query.data ? toForm(query.data as never) : undefined), [query.data]);

  const form = useForm<SettingsForm>({ resolver: zodResolver(schema), values: loaded, mode: "onChange" });
  const { control, register, setValue, formState, reset, handleSubmit } = form;
  const watch = useWatch({ control });
  const dirty = formState.isDirty;
  useUnsavedChanges(dirty && canManage);

  const save = useMutation({
    mutationFn: (values: SettingsForm) => saveDeskSettings(toPayload(values, query.data!.id)),
    onSuccess: (_res, values) => {
      const payload = toPayload(values, query.data!.id);
      queryClient.setQueryData(adminKeys.deskSettings, payload);
      // The running desk picks the change up without a page refresh.
      useDeskSettingsStore.getState().set(payload);
      reset(toForm(payload as never));
      toast.success(t("admin-settings.saved"));
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : t("admin-settings.save-failed")),
  });

  const sections: SectionMeta[] = useMemo(
    () => [
      { id: "messaging", title: t("admin-settings.sections.messaging.title"), icon: MessageSquareText },
      { id: "knowledge", title: t("admin-settings.sections.knowledge.title"), icon: BookOpen },
      { id: "voice", title: t("admin-settings.sections.voice.title"), icon: Phone },
      { id: "crm", title: t("admin-settings.sections.crm.title"), icon: PlugZap },
      { id: "conversation", title: t("admin-settings.sections.conversation.title"), icon: Workflow },
      { id: "workspace", title: t("admin-settings.sections.workspace.title"), icon: Settings2 },
    ],
    [t],
  );

  useEffect(() => {
    if (query.error)
      toast.error(query.error instanceof ApiError ? query.error.message : t("admin-settings.load-failed"));
  }, [query.error, t]);

  if (query.isLoading || (!loaded && !query.error)) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-6 w-80" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (!loaded) {
    return (
      <EmptyState
        icon={Settings2}
        title={t("admin-settings.load-failed")}
        action={<Button onClick={() => void query.refetch()}>{t("errors.reload")}</Button>}
      />
    );
  }

  const ro = !canManage;
  const opts = { shouldDirty: true, shouldValidate: true } as const;
  const v = watch.voiceTelephony;
  const hasVoice = Boolean(v?.isCiscoEnabled || v?.isCxVoiceEnabled);
  const errorOf = (path: FieldPath<SettingsForm>) => {
    const parts = path.split(".");
    let node: unknown = formState.errors;
    for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
    if (!node || typeof node !== "object") return undefined;
    const record = node as { message?: unknown; root?: { message?: unknown } };
    if (typeof record.message === "string") return record.message;
    if (typeof record.root?.message === "string") return record.root.message;
    return undefined;
  };

  // isValid from the form library stays false even when these values pass the schema,
  // which left Save disabled behind a generic "unsaved changes" line.
  const parsedSettings = schema.safeParse(form.getValues());
  const invalidFields = parsedSettings.success
    ? []
    : [
        ...new Map(
          parsedSettings.error.issues.map((issue) => {
            const path = issue.path.map(String).join(".");
            return [path, { path, message: issue.message, label: settingsFieldLabel(path, t) }] as const;
          }),
        ).values(),
      ];

  const revealInvalid = (path: string) => {
    const fieldPath = path as FieldPath<SettingsForm>;
    const parent = SETTINGS_ERROR_TOGGLES[fieldPath];
    if (parent) setValue(parent, true, opts);
    window.setTimeout(
      () => {
        const id = SETTINGS_FIELD_IDS[fieldPath] ?? `f-${path}`;
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      parent ? 50 : 0,
    );
  };

  const toggle = (
    name: FieldPath<SettingsForm>,
    labelKey: string,
    extra?: Partial<React.ComponentProps<typeof ToggleRow>>,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ToggleRow
          label={t(`admin-settings.fields.${labelKey}.label`)}
          description={t(`admin-settings.fields.${labelKey}.description`)}
          checked={Boolean(field.value)}
          onChange={(checked) => field.onChange(checked)}
          disabled={ro || extra?.disabled}
          {...extra}
        />
      )}
    />
  );

  const numberField = (
    name: FieldPath<SettingsForm>,
    labelKey: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <Field
      htmlFor={`f-${name}`}
      label={t(`admin-settings.fields.${labelKey}.label`)}
      description={t(`admin-settings.fields.${labelKey}.description`)}
      error={errorOf(name)}
      className="max-w-xs"
    >
      <Input
        id={`f-${name}`}
        type="number"
        inputMode="numeric"
        readOnly={ro}
        aria-invalid={Boolean(errorOf(name)) || undefined}
        {...register(name, { valueAsNumber: true })}
        {...props}
      />
    </Field>
  );

  const configField = (group: "ciscoSettings" | "cxVoiceSettings", f: ConfigField<string>) => {
    const name = `voiceTelephony.${group}.${f.name}` as FieldPath<SettingsForm>;
    const prefix = group === "ciscoSettings" ? "cisco" : "cx";
    const label = t(`admin-settings.${prefix}.${f.name}.label`);
    const description = t(`admin-settings.${prefix}.${f.name}.description`);
    const locked = ro || f.static;
    const id = `f-${group}-${f.name}`;
    if (f.type === "boolean") {
      return (
        <Controller
          key={f.name}
          control={control}
          name={name}
          render={({ field }) => (
            <div className="flex items-start justify-between gap-4 sm:col-span-2">
              <div>
                <label htmlFor={id} className="text-sm font-medium">
                  {label}
                </label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                id={id}
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
                disabled={locked}
              />
            </div>
          )}
        />
      );
    }
    return (
      <Field key={f.name} htmlFor={id} label={label} description={description} error={errorOf(name)}>
        {f.type === "select" ? (
          <Controller
            control={control}
            name={name}
            render={({ field }) => (
              <Select value={String(field.value)} onValueChange={field.onChange} disabled={locked}>
                <SelectTrigger id={id} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        ) : f.type === "secret" ? (
          <SecretInput id={id} readOnly={locked} {...register(name)} />
        ) : (
          <div className="relative">
            <Input
              id={id}
              type={f.type === "number" ? "number" : "text"}
              readOnly={locked}
              className={cn(f.static && "pe-8 text-muted-foreground")}
              {...register(name, f.type === "number" ? { valueAsNumber: true } : {})}
            />
            {f.static && (
              <Lock
                className="absolute end-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-label={t("admin-settings.managed")}
              />
            )}
          </div>
        )}
      </Field>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <PageHeader description={t("admin-settings.description")} className="mb-5" />
      {ro && <ReadOnlyNotice />}
      <div className="mt-4 flex gap-8">
        <SectionIndex sections={sections} />
        <form className="flex min-w-0 flex-1 flex-col gap-5" onSubmit={(e) => e.preventDefault()} noValidate>
          <SettingsSection
            id="messaging"
            icon={MessageSquareText}
            title={sections[0]!.title}
            description={t("admin-settings.sections.messaging.description")}
          >
            {toggle("messagingComposition.isMessageFormattingEnabled", "messageFormatting")}
            {toggle("messagingComposition.isTextRefineEnabled", "textRefine", {
              hint: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info
                      className="ms-1.5 inline size-3.5 text-muted-foreground"
                      aria-label={t("admin-settings.fields.textRefine.tooltip")}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {t("admin-settings.fields.textRefine.tooltip")}
                  </TooltipContent>
                </Tooltip>
              ),
            })}
            {toggle("messagingComposition.isSpellCheckEnabled", "spellCheck")}
            {toggle("messagingComposition.isEmojisEnabled", "emojis")}
            {toggle("messagingComposition.isFileSharingEnabled", "fileSharing")}
          </SettingsSection>

          <SettingsSection
            id="knowledge"
            icon={BookOpen}
            title={sections[1]!.title}
            description={t("admin-settings.sections.knowledge.description")}
          >
            {toggle("knowledgeAiAssistance.isKnowledgeBaseSearchEnabled", "kbSearch", {
              children: (
                <Field
                  htmlFor="f-kb-url"
                  label={t("admin-settings.fields.kbUrl.label")}
                  description={t("admin-settings.fields.kbUrl.description")}
                  error={errorOf("knowledgeAiAssistance.knowledgeBaseUrl")}
                >
                  <Input
                    id="f-kb-url"
                    type="url"
                    readOnly={ro}
                    placeholder="https://"
                    {...register("knowledgeAiAssistance.knowledgeBaseUrl")}
                  />
                </Field>
              ),
            })}
          </SettingsSection>

          <SettingsSection
            id="voice"
            icon={Phone}
            title={sections[2]!.title}
            description={t("admin-settings.sections.voice.description")}
          >
            {toggle("voiceTelephony.isVoicemailEnabled", "voicemail")}
            {toggle("voiceTelephony.isCallingComplianceEnabled", "callingCompliance")}
            <Controller
              control={control}
              name="voiceTelephony.isCiscoEnabled"
              render={({ field }) => (
                <ToggleRow
                  label={t("admin-settings.fields.cisco.label")}
                  description={t("admin-settings.fields.cisco.description")}
                  checked={Boolean(field.value)}
                  disabled={ro || Boolean(v?.isCxVoiceEnabled)}
                  onChange={(on) => {
                    field.onChange(on);
                    if (on) setValue("voiceTelephony.isCxVoiceEnabled", false, opts);
                    if (!on && !v?.isCxVoiceEnabled)
                      setValue("crmIntegration.enableVoiceEventsForCrm", false, opts);
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    {CISCO_FIELDS.filter(
                      (f) => f.name !== "ssoBackendUrl" || v?.ciscoSettings?.isGadget === false,
                    ).map((f) => configField("ciscoSettings", f))}
                  </div>
                </ToggleRow>
              )}
            />
            <Controller
              control={control}
              name="voiceTelephony.isCxVoiceEnabled"
              render={({ field }) => (
                <ToggleRow
                  label={t("admin-settings.fields.cxVoice.label")}
                  description={t("admin-settings.fields.cxVoice.description")}
                  checked={Boolean(field.value)}
                  disabled={ro || Boolean(v?.isCiscoEnabled)}
                  onChange={(on) => {
                    field.onChange(on);
                    if (on) setValue("voiceTelephony.isCiscoEnabled", false, opts);
                    if (!on && !v?.isCiscoEnabled)
                      setValue("crmIntegration.enableVoiceEventsForCrm", false, opts);
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    {CX_VOICE_FIELDS.map((f) => configField("cxVoiceSettings", f))}
                  </div>
                </ToggleRow>
              )}
            />
            {hasVoice && toggle("voiceTelephony.isWebRtcVideoEnabled", "webRtcVideo")}
          </SettingsSection>

          <SettingsSection
            id="crm"
            icon={PlugZap}
            title={sections[3]!.title}
            description={t("admin-settings.sections.crm.description")}
          >
            {hasVoice && toggle("crmIntegration.enableVoiceEventsForCrm", "voiceEventsForCrm")}
            {toggle("crmIntegration.isCrmEventsEnabled", "crmEvents")}
          </SettingsSection>

          <SettingsSection
            id="conversation"
            icon={Workflow}
            title={sections[4]!.title}
            description={t("admin-settings.sections.conversation.description")}
          >
            {toggle("conversationHandling.isAutoAnswerEnabled", "autoAnswer", {
              children: numberField("conversationHandling.autoAnswerDelay", "autoAnswerDelay", {
                min: 0,
                step: 500,
              }),
            })}
            {toggle("conversationHandling.isWrapUpEnabled", "wrapUp", {
              children: numberField("conversationHandling.wrapUpTime", "wrapUpTime", { min: 15, max: 1800 }),
            })}
            {toggle("conversationHandling.isConversationParticipantsEnabled", "participants")}
            {toggle("conversationHandling.isShowActiveChannelsDataEnabled", "activeSessions")}
            <PlainRow>
              <Controller
                control={control}
                name="conversationHandling.holdConversation"
                render={({ field }) => {
                  const selected = new Set(field.value);
                  const all = selected.size === HOLD_SPANS.length;
                  return (
                    <fieldset>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <legend className="text-sm font-medium">
                            {t("admin-settings.fields.hold.label")}
                          </legend>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {t("admin-settings.fields.hold.description")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={ro}
                          onClick={() => field.onChange(all ? [HOLD_SPANS[0]] : [...HOLD_SPANS])}
                        >
                          {all ? t("globals.unselect-all") : t("globals.Select-All")}
                        </Button>
                      </div>
                      <div
                        id="f-hold"
                        data-settings-invalid={
                          errorOf("conversationHandling.holdConversation") ? "f-hold" : undefined
                        }
                        className={cn(
                          "mt-3 flex flex-wrap gap-1.5 rounded-xl",
                          errorOf("conversationHandling.holdConversation") && "ring-2 ring-destructive/50",
                        )}
                        role="group"
                      >
                        {HOLD_SPANS.map((n) => {
                          const on = selected.has(n);
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={ro}
                              aria-pressed={on}
                              onClick={() => {
                                const next = new Set(selected);
                                if (on) next.delete(n);
                                else next.add(n);
                                field.onChange([...next].sort((a, b) => a - b));
                              }}
                              className={cn(
                                "h-8 min-w-12 rounded-full border px-3 text-sm tabular transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                on
                                  ? "border-primary bg-primary-soft font-medium text-primary"
                                  : "bg-surface text-medium hover:bg-surface-2",
                              )}
                            >
                              {t("admin-settings.fields.hold.minutes", { count: n })}
                            </button>
                          );
                        })}
                      </div>
                      {errorOf("conversationHandling.holdConversation") && (
                        <p className="mt-2 text-sm text-destructive-text" role="alert">
                          {errorOf("conversationHandling.holdConversation")}
                        </p>
                      )}
                    </fieldset>
                  );
                }}
              />
            </PlainRow>
            {toggle("conversationHandling.isInactivityTimerEnabled", "inactivity", {
              children: numberField("conversationHandling.inactivityTimeoutSeconds", "inactivityTime", {
                min: 30,
                max: 3600,
                onBlur: (e) => {
                  // An emptied field falls back to the 30 s minimum, as in unified-admin.
                  if (e.currentTarget.value === "")
                    setValue("conversationHandling.inactivityTimeoutSeconds", 30, opts);
                },
              }),
            })}
            {toggle("conversationHandling.isOutboundSmsEnabled", "outboundSms", {
              children: (
                <>
                  <Field
                    htmlFor="f-prefix"
                    label={t("admin-settings.fields.prefixCode.label")}
                    description={t("admin-settings.fields.prefixCode.description")}
                    error={errorOf("conversationHandling.prefixCode")}
                    className="max-w-xs"
                  >
                    <Input
                      id="f-prefix"
                      maxLength={4}
                      readOnly={ro}
                      aria-invalid={Boolean(errorOf("conversationHandling.prefixCode")) || undefined}
                      {...register("conversationHandling.prefixCode")}
                    />
                  </Field>
                  <Controller
                    control={control}
                    name="conversationHandling.isOutboundSmsSendandClose"
                    render={({ field }) => (
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <label htmlFor="f-sms-close" className="text-sm font-medium">
                            {t("admin-settings.fields.smsSendClose.label")}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {t("admin-settings.fields.smsSendClose.description")}
                          </p>
                        </div>
                        <Switch
                          id="f-sms-close"
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                          disabled={ro}
                        />
                      </div>
                    )}
                  />
                </>
              ),
            })}
          </SettingsSection>

          <SettingsSection
            id="workspace"
            icon={Settings2}
            title={sections[5]!.title}
            description={t("admin-settings.sections.workspace.description")}
          >
            <PlainRow>
              {numberField("workspacePreferences.dashboardRefreshTime", "dashboardRefresh", {
                min: 1000,
                step: 1000,
              })}
            </PlainRow>
          </SettingsSection>

          {canManage && (
            <SaveBar
              visible={dirty}
              saving={save.isPending}
              canSave={parsedSettings.success}
              onDiscard={() => reset(loaded)}
              onSave={() => void handleSubmit((values) => save.mutate(values))()}
              message={
                invalidFields.length > 0 ? (
                  <span>
                    {t("admin-settings.fix-errors")}{" "}
                    {invalidFields.map((field, index) => (
                      <button
                        key={field.path}
                        type="button"
                        className="font-semibold text-destructive-text underline underline-offset-2"
                        onClick={() => revealInvalid(field.path)}
                      >
                        {field.label}
                        {index < invalidFields.length - 1 ? ", " : ""}
                      </button>
                    ))}
                  </span>
                ) : undefined
              }
            />
          )}
        </form>
      </div>
    </div>
  );
}
