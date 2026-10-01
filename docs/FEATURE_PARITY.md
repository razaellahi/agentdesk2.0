# Feature parity checklist

The rule is that **no feature of the retired apps may be dropped**. Each row names the source, the place it lives in Agent Desk 2.0, and the delivery phase. A row is ticked only when the feature works in the new app and has an automated test.

Sources:

- **UA** is `EF/unified-agent` (`develop`).
- **UAD** is `EF/unified-admin/Frontend` (`develop`), Agent Desk settings only.
- **VRS** is `EF/VRS/front-end` on `origin/master` plus `origin/5.12_i-PTCL-1312`, which adds tags.

Status: ✅ done · 🟡 in progress · ⬜ not started. Phase numbers come from the plan.

## Platform (Phase 0)

| ✓   | Feature                                                                                                       | Source                                                                         | Agent Desk 2.0                                                         |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| ✅  | Runtime `config.json`, `envsubst` template, host rewrite to the page FQDN                                     | UA `appConfig.service.ts`, `docker/`                                           | `src/config/*`, `docker/*`                                             |
| ✅  | Startup error screen with Retry (config or settings failure)                                                  | UA `app.component.html`                                                        | `app/pages/StartupError.tsx`                                           |
| ✅  | Agent Desk settings loaded at startup and flattened                                                           | UA `utils/agent-desk-settings.util.ts`                                         | `core/agent-settings/*`                                                |
| ✅  | Tenant logo from the file engine                                                                              | UA/UAD `downloadAndSaveLogo`                                                   | `core/tenant/branding.ts`                                              |
| ✅  | Multi-tenancy: subdomain, fixed or header; storage isolated per tenant                                        | new                                                                            | `core/tenant`, `core/storage`                                          |
| ✅  | Login with username and password (agent-manager `/agent/login`)                                               | UA `login.component.ts`                                                        | `features/auth/LoginPage.tsx`                                          |
| ✅  | 2FA by app (QR and secret), SMS (phone, confirm, resend 30 s, max 3), email (60 s) and RSA (masked)           | UA `login.component.*`                                                         | `features/auth/components/TwoFactorStep.tsx`                           |
| ✅  | Forced password change with policy checklist; voluntary change                                                | UA `change-password-dialog/`                                                   | `features/auth/components/ChangePasswordDialog.tsx`                    |
| ✅  | Password-expiry warning after login                                                                           | UA `_showPasswordWarningFromLogin`                                             | `app/providers/SessionEffects.tsx`                                     |
| ✅  | Finesse gadget SSO from URL parameters, with HA retry on the secondary node                                   | UA `autoFinesseLogin`, `initiateFinesseHALogin`                                | `core/auth/ssoParams.ts`, `app/bootstrap.ts`                           |
| ✅  | CRM SSO (`source=dynamics365\|salesforce`)                                                                    | UA `externalServiceLogin`                                                      | same                                                                   |
| ✅  | `fcm-key` URL parameter                                                                                       | UA `cacheAgentFcmKey`                                                          | `core/auth/ssoParams.ts` (consumed in Phase 2)                         |
| ✅  | Token refresh: single flight, retry once, logout on failure                                                   | UA `auth.interceptor.ts`, UAD interceptor                                      | `core/api/apiClient.ts`, `core/auth/authService.ts`                    |
| ✅  | Session restored after reload                                                                                 | UA `autoLogin`                                                                 | `restoreSession()` (uses the refresh token, not a stored access token) |
| ✅  | Permissions from Keycloak resources and scopes; route guards; menus filtered                                  | UA `auth.guard.ts`, `menu-config.service.ts`; UAD `AuthGuard`; VRS `AuthGuard` | `core/auth/permissions`, `app/navigation`, `app/router/guards.tsx`     |
| ✅  | VRS realm roles (admin > supervisor > agent; download, export, viewtag, evaluatetag)                          | VRS `auth.service.ts`                                                          | `PERMISSIONS.recordings*` (roles read from the JWT)                    |
| ✅  | 403 page instead of a blank page                                                                              | VRS guard (blank)                                                              | `ForbiddenPage`                                                        |
| ✅  | Legacy URLs: old `#/` routes and saved `home_page`                                                            | all                                                                            | `app/navigation/legacyRoutes.ts`                                       |
| ✅  | i18n: locale-setting, then file-engine translations, falling back to bundled JSON; 10 languages; legacy codes | UA `i18n.service.ts`                                                           | `core/i18n/*`                                                          |
| ✅  | RTL for `ar` and `ur`                                                                                         | UA `RTL-styles.scss`                                                           | `dir` on `<html>` plus logical CSS properties                          |
| ✅  | Light, dark and **system** theme; per-user persistence; no flash before paint                                 | UA dark mode, VRS dark mode                                                    | `core/theme/*`, `public/theme-init.js`                                 |
| ✅  | Compact density                                                                                               | UA `compact-view.scss`                                                         | `data-density`, Preferences                                            |
| ✅  | Preferences: language, theme, home page (finishes the never-rendered SettingsComponent)                       | UA `new-components/settings`                                                   | `app/pages/PreferencesPage.tsx`                                        |
| ✅  | Docker, nginx, CSP, base path set at runtime, GitLab CI                                                       | all                                                                            | `Dockerfile`, `docker/`, `.gitlab-ci.yml`                              |
| ⬜  | Inactivity auto-logout (paused during calls, hidden tab, blur)                                                | UA `inactivity.service.ts`                                                     | Phase 2                                                                |
| ⬜  | GTM `dataLayer` events                                                                                        | UA `index.html`, login                                                         | Phase 9 (`GTM_ID`)                                                     |

## Admin: Agent Desk settings (Phase 1)

| ✓   | Feature                                                                                                                                                                                              | Source                              | Agent Desk 2.0                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| ✅  | Settings form: messaging, knowledge, voice (Cisco and CX Voice mutually exclusive, metadata-driven Cisco fields, static read-only fields), CRM, conversation handling (validation ranges), workspace | UAD `admin/agent-desk-settings/*`   | `features/admin/settings/*` (e2e: `e2e/admin.spec.ts`) |
| ✅  | Read-only mode without `manage` scope; Save only when dirty; unsaved-changes guard                                                                                                                   | UAD                                 | same                                                   |
| ✅  | Languages: timezone, supported languages, default (keep at least one; default moves when removed)                                                                                                    | UAD `general-settings/locale`       | `features/admin/languages`                             |
| ✅  | Translations: grid, search, unsaved count, compare two languages, default view, restore default, import and export JSON/CSV/XLSX, reference validation that blocks Save                              | UAD `general-settings/translations` | `features/admin/translations`                          |

## Conversation workspace (Phases 2–4)

| ✓   | Feature                                                                                                                                                                                                                     | Source                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 🟡  | Socket.io connection with all server and client events; license errors; logged in elsewhere                                                                                                                                 | UA `socket.service.ts`                                          |
| 🟡  | Agent state (Ready, Not Ready with reason, Logout with reason), per-MRD state, state timer                                                                                                                                  | UA `app-header`                                                 |
| 🟡  | Incoming push, pull and external voice requests: accept, skip, reject; ring and browser notifications; auto-answer                                                                                                          | UA `chat-notifications`, `socket.service`                       |
| 🟡  | Conversation list with SLA ring, unread count, last message                                                                                                                                                                 | UA `chats/`                                                     |
| ⬜  | **Multi-pane board** (1, 2 or 3 panes, focus, pane tabs, pop-out dock, waiting timers)                                                                                                                                      | new (mockup)                                                    |
| 🟡  | All message types: plain, button, carousel, list, link, url, image, video, audio, voice, file, location, contact, sticker, comment, email, form data, conversation data, system notification, wrap-up, outbound SMS, custom | UA `chat-messages/`                                             |
| 🟡  | Composer: formatting, emoji, attachments, spell check (en/fr/ger), canned messages, `/` quick replies, typing indicator, channel-session choice, edit, reply, failed-message handling                                       | UA `interactions`, `message-composer`                           |
| ⬜  | AI: bot suggestions with confidence, LLM suggestions, KB search, text refine, summary, sentiment                                                                                                                            | UA `interactions`, `customer-info`, `ai-text-refine.service.ts` |
| 🟡  | Wrap-up form (categories, codes, notes, timer); leave; pause and resume with hold spans                                                                                                                                     | UA `wrap-up-form`, `interactions`                               |
| ⬜  | Direct transfer and conference; consult with consult-transfer and consult-conference; named-agent assistance; external transfer                                                                                             | UA `interactions`                                               |
| ⬜  | Supervisor whisper, barge-in and silent monitor; hand raise and lower                                                                                                                                                       | UA                                                              |
| ⬜  | Email threads (reply, reply-all, forward, signatures); social comment actions; scheduled activities                                                                                                                         | UA `email-activity`, `comment-message`                          |
| ⬜  | Customer info panel: PII masking, edit, profile matching and linking, active channel sessions, form data                                                                                                                    | UA `customer-info`, `contact-card`                              |
| ⬜  | Embedded third-party apps; secure video link                                                                                                                                                                                | UA                                                              |
| 🟡  | CRM `postMessage` bridge (16 events in, `switchConversation` out)                                                                                                                                                           | UA `crmEvents.service.ts`                                       |

## Voice (Phase 5)

| ✓   | Feature                                                                                                                                                                                                                     | Source                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| ⬜  | CX Voice (SIP.js): login, answer, reject, hold, mute, outbound, blind/queue/external transfer, consult, conference, monitor, barge, DTMF, video and screen share, pause/resume recording, media permissions, campaign calls | UA `sip.service.ts`     |
| ⬜  | Cisco Finesse (UCCE and UCCX): full command and event set, RONA, ANI lookup, MRD sync, HA                                                                                                                                   | UA `finesse.service.ts` |
| ⬜  | Call controls UI (now a call dock)                                                                                                                                                                                          | UA `call-controls/`     |
| ⬜  | Voicemail inbox                                                                                                                                                                                                             | UA `voicemail-inbox/`   |

## Customers and outbound (Phase 6)

| ✓   | Feature                                                                                                           | Source                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ⬜  | Customer list: search, sort, column reorder and preferences, label filter, advanced AND/OR filters, saved filters | UA `phonebook/`, `column-preferences/`                                   |
| ⬜  | Create and edit customers (schema-driven form)                                                                    | UA `create-customer/`, `customer-actions/`                               |
| ⬜  | Schema attributes: CRUD, ordering, types, PII and required flags                                                  | UA `customer-schema/`                                                    |
| ⬜  | Labels CRUD                                                                                                       | UA `labels/`                                                             |
| ⬜  | Outbound panel, dial pad, From channel, cold email, SMS, manual call; compliance (opt-out, DNC, calling window)   | UA `features/outbound-communication`, `send-sms`, `manual-outbound-call` |
| ⬜  | Quick replies (behind flag), quick links (pinned)                                                                 | UA `quick-replies-dialog`, `app-header`                                  |
| ⬜  | Pull mode: subscribed lists and requests                                                                          | UA `pull-mode/`                                                          |
| ⬜  | Announcements: supervisor CRUD; agent sidenav with seen status; QM notifications                                  | UA `announcement/`                                                       |

## Supervisor and dashboards (Phase 7)

| ✓   | Feature                                                                                            | Source                       |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------- |
| ⬜  | Grafana dashboards: summary, agent performance, team stats, team detail                            | UA `supervisor/grafana` etc. |
| ⬜  | Active chats with silent monitor and whisper; filters; auto-refresh                                | UA `active-chats/`           |
| ⬜  | Queued chats **including re-queue** (unfinished in UA); real endpoints instead of the Postman mock | UA `queue-chats/`            |
| ⬜  | Agents: activity, MRD states, force Ready or Logout                                                | UA `active-agent-details/`   |
| ⬜  | Recent conversations with history view                                                             | UA `recent-chats/`           |
| ⬜  | Realtime custom dashboard: tabs, grid, widget builder, KPI/chart/table widgets, saved layout       | UA `dashboard/`              |
| ⬜  | AI widget generator (web-llm, behind flag)                                                         | UA `ai-widget.service.ts`    |

## Recordings (Phase 8)

| ✓   | Feature                                                                                                                                                                                               | Source                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| ⬜  | Recordings table: server paging, sort, column reorder, resize and visibility; multi-leg rows; archived styling; played-by marker; count; refresh                                                      | VRS `voice-recordings` (master)                |
| ⬜  | Filters: agent id and name (hidden for agents), calling and called number, duration, hold time, wrap-up codes, call variable 1–10, direction (CISCO), tag, date and time range, "Date Within" presets | VRS                                            |
| ⬜  | Audio player (WaveSurfer, WAV peaks, ±10 s, volume, speed, keyboard) with play audit                                                                                                                  | VRS `audio-player-dialog`, `wav-peaks.util.ts` |
| ⬜  | Download WAV/MP3 (role `download`); video player for screen recordings                                                                                                                                | VRS `video-player`                             |
| ⬜  | CSV export (role `export`; full re-fetch; BOM; Excel-safe numbers) with audit                                                                                                                         | VRS `csv-export.service.ts`                    |
| ⬜  | Audit logs                                                                                                                                                                                            | VRS `audit-logs`                               |
| ⬜  | Recording rules: drag-and-drop priority, mask validator, days, time range, screen capture (not on EFCX)                                                                                               | VRS `recording-rules`                          |
| ⬜  | Archival settings: SFTP, two modes, multi-tenant on EFCX                                                                                                                                              | VRS `archival-configuration`                   |
| ⬜  | Tag management and per-recording tag assignment                                                                                                                                                       | VRS `5.12_i-PTCL-1312`                         |
