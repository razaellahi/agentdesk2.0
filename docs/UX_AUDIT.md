# Agent Desk 2.0 — Comprehensive UI/UX Audit & Google Design System Specification

**Date:** October 2026  
**Audited Against:** Canonical `origin/develop` baselines:

- **Unified Agent:** `0cef419dde480d023ba940355409b341e85dc6cb` (`origin/develop`)
- **Unified Admin:** `ee72cc3fb531576638f25caf745a9e67f3e02694` (`origin/develop`)
- **Voice Recording Solution (VRS):** `dcaf1c6328592ab9fbca8055a0230e764d4101f7` (`origin/develop`)
- **Agent Desk 2.0:** Working tree consolidation

---

## 1. Executive Summary & Google Design Philosophy

Agent Desk 2.0 consolidates three previously independent applications (Unified Agent, Unified Admin Settings, and VRS Media Recordings) into a single, unified enterprise workstation.

### Why the "Google Enterprise" Benchmark?

A contact-centre agent works under intense cognitive load, managing multiple real-time conversations across diverse media (voice, chat, email, social) while maintaining strict SLA targets. The user interface must not be decorative or distracting; it must feel like **Google Workspace** (Google Chat, Gmail, Google Meet) and **Google Cloud Console**:

1. **Calm, High-Contrast Surfaces:** Pure `#ffffff` surfaces on a soft `#f8f9fa` canvas with Google's crisp `#dadce0` hairline dividers. No blurry drop shadows, distracting gradients, or bouncy physics.
2. **Zero Layout Shift:** Modals, incoming requests, and side-by-side split panes never cover busy controls or displace active composers.
3. **Ultra-Legible Enterprise Typography:** Google Sans / `Inter` and `Roboto` font stack with fixed-width tabular figures (`tabular-nums`) for timers, metrics, and phone numbers.
4. **Ergonomic Density:** Maximized vertical and horizontal information density so agents can view rich customer context, timelines, and composers simultaneously without unnecessary scrolling.
5. **Clear Semantic States:** Immediate recognition of SLA status, agent readiness, connection health, and channel types through Google's standardized semantic color system.

---

## 2. Design Tokens, Colors & Typography System

### 2.1 Color Palette Specifications (Google Material 3)

| Token Name     | Light Value              | Dark Value | Purpose & Usage                                                  |
| :------------- | :----------------------- | :--------- | :--------------------------------------------------------------- |
| `--primary`    | `#1a73e8` (Google Blue)  | `#8ab4f8`  | Primary brand action, focused states, active pills               |
| `--primary-h`  | `#1765c9`                | `#aecbfa`  | Hover state for primary buttons                                  |
| `--primary-lt` | `#e8f0fe`                | `#172b4d`  | Soft primary container, active nav item background, agent bubble |
| `--canvas`     | `#f8f9fa`                | `#1e1f20`  | Application canvas background (Google Workspace base)            |
| `--surface`    | `#ffffff`                | `#282a2c`  | Main content card, panels, sidebars, dialog surfaces             |
| `--sec`        | `#f1f3f4`                | `#303134`  | Secondary surface container, customer chat bubble, search pill   |
| `--sec-2`      | `#e8eaed`                | `#3c4043`  | Surface container high, hover backgrounds                        |
| `--border`     | `#dadce0`                | `#3c4043`  | Standard hairline divider and component border                   |
| `--body`       | `#202124`                | `#e8eaed`  | Primary body text (high contrast, non-harsh)                     |
| `--medium`     | `#3c4043`                | `#bdc1c6`  | Medium emphasis labels, secondary icons                          |
| `--muted-text` | `#5f6368`                | `#9aa0a6`  | Muted descriptions, timestamps, placeholders                     |
| `--success`    | `#1e8e3e` (Google Green) | `#81c995`  | Ready agent state, delivered receipts, active connection         |
| `--success-lt` | `#e6f4ea`                | `#0f381e`  | Success notification / status chip background                    |
| `--warn`       | `#f9ab00` (Google Amber) | `#fdd663`  | Not Ready state, near-breach SLA alert, whisper indicator        |
| `--warn-lt`    | `#fef7e0`                | `#3a2e05`  | Warning badge / whisper composer highlight                       |
| `--error`      | `#d93025` (Google Red)   | `#f28b82`  | Disconnected state, SLA breach, destructive actions              |
| `--error-lt`   | `#fce8e6`                | `#3c1614`  | Error notification / breach badge background                     |
| `--bubble-c`   | `#f1f3f4`                | `#303134`  | Customer message bubble (neutral container)                      |
| `--bubble-a`   | `#e8f0fe`                | `#172b4d`  | Business/Agent message bubble (Google Blue container)            |

### 2.2 Typography Stack

- **Base UI Font:** `Inter`, `Roboto`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `"Google Sans Text"`, `Helvetica`, `Arial`, `sans-serif`
- **Headings & Display:** Clean `font-medium` (500) and `font-semibold` (600), eliminating previous eccentric display fonts (`Syne`, `Manrope`) which clashed with enterprise density.
- **Tabular Figures:** Applied universally to durations, SLA countdowns, queue counters, phone numbers, and table metrics via `font-variant-numeric: tabular-nums`.

### 2.3 Elevation & Shadows (Material Design 3)

- `--shadow-soft`: `0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)`
- `--shadow-lift`: `0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 4px 8px 3px rgba(60, 64, 67, 0.15)`
- `--shadow`: `0 2px 6px 2px rgba(60, 64, 67, 0.15), 0 1px 2px 0 rgba(60, 64, 67, 0.3)`

---

## 3. Template Architecture & Design Audit

### 3.1 Application Shell Template (`AppShell`, `TopBar`, `Sidebar`)

- **Top Bar (56px Google Workspace Header):**
  - Slim 56px height (`h-14`) matching Gmail and Google Chat.
  - Left: Rounded-full menu toggle icon button, branded Mark, hairline divider, and route title in clean sentence-case.
  - Center: Non-intrusive **Request Center** for incoming push/pull task notifications; renders inline without overlaying conversation panes.
  - Right: Agent presence pill with live state timer and logged-in duration, quick-action pill cluster (Outbound, Announcements, Quick Links, Voicemail badge), and Google Account circular avatar menu with clean ring.
- **Sidebar Navigation (Google Chat / Gmail Pill Rail):**
  - Active navigation items styled as Google pill shapes (`rounded-full`) with `--primary-lt` (`#e8f0fe`) background and `--primary` (`#1a73e8`) icon/text.
  - Collapsible icon-only mode renders circular icon buttons with hover tooltips and rich floating dropdown menus on click.
  - Dynamic unread count badges for Voicemail and Queues displayed in compact rounded-full badges.

### 3.2 Workspace & Multi-Chat Template (`ConversationsPage`, `ConversationRail`, `ConversationPane`)

- **Multi-Chat Board (Google Chat Model):**
  - Supports 1, 2, or 3 simultaneous conversations based on monitor width.
  - Focus-driven layout: Active pane receives `~1.75x` flex growth while inactive panes remain readable at `min-w-[320px]`.
  - Keyboard navigation: `Alt+1..3` jumps directly between panes; `Alt+N` jumps to the next conversation with unread customer turns.
- **Conversation Rail (Chat List):**
  - 48px row density with 36px circular avatar, customer initials, channel icon overlay, latest message preview snippet, unread counter, and SLA indicator ring.
  - Pill search bar and quick filter chips (`All`, `Unread`, `SLA`, `Waiting`).
- **Conversation Pane Header (48px Single Chrome Row):**
  - Merged pane chrome containing: Pane number chip, customer avatar + name, live SLA countdown chip, customer wait time chip, Transfer, Consult, Conference, Wrap-up, and More actions.
- **Message Stream (Google Chat Bubbles & Timeline):**
  - Customer messages aligned to the start side in `--bubble-c` (`#f1f3f4` / `#303134`).
  - Agent and business messages aligned to the end side in `--bubble-a` (`#e8f0fe` / `#172b4d`).
  - Consecutive turns from the same participant are grouped with a single timestamp and avatar.
  - Floating message action pill on hover: Copy, Reply, Private Reply, Edit, with zero layout shift.
  - Past activities paged into the transcript via virtualized scroll restoration.
- **Composer (Google Chat Style Input):**
  - Auto-growing multiline input with clean Google hairline border, rounded corners, and focus ring.
  - Inline toolstrip with circular icon buttons (`size-7 rounded-full`): Bold, Italic, Emojis, Canned replies, AI Refine, Attachments, and Voice secure link.
  - Whisper Mode: Composer border transforms to Google Amber (`#f9ab00`) with an internal warning banner and amber Send button ("Whisper").
- **Customer Context Dock (Google Companion Panel):**
  - Always-visible 44px icon strip on the right edge (Profile, Conversation Data, Knowledge Base, SMS).
  - Slides open smoothly to 320px without displacing composer or active transcript.

### 3.3 Data Table & List Template (`DataView`, `ListChrome`)

- **Google Cloud Console Standard:**
  - Integrated toolbar: Search input with clear button (`X`), filter dropdowns, and primary action buttons.
  - Sticky table headers with subtle background, sentence-case 12px medium labels, and sort indicators.
  - Table rows at standardized density (`--density-row: 40px`), neutral hover background (`--sec`), and selected row highlight (`--primary-lt`).
  - Pager: Centered range indicator (`1–25 of 142`) with circular Google icon buttons (`<` and `>`).
  - Empty states: Soft circular icon container (`rounded-full bg-primary-soft text-primary`), clean headline, and actionable button.

### 3.4 Dialog, Sheet & Popover Template (`Dialog`, `Sheet`, `Popover`, `DropdownMenu`)

- Material Design 3 rounded-2xl dialogs with solid surfaces (`bg-surface`), crisp borders (`border-border`), and circular close buttons.
- Radix-based keyboard accessibility, visible focus rings, and screen reader announcements.

---

## 4. Features Perspective Analysis from Develop Branches

Below is the cross-repository feature analysis comparing the canonical `origin/develop` branches with their consolidated implementation in Agent Desk 2.0:

| Functional Area    | Feature / Capability             | Source Repository & Baseline                             | Agent Desk 2.0 UX Implementation                                                                    | Google Design Elevation                                      |
| :----------------- | :------------------------------- | :------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| **Workspace**      | Multi-chat concurrent handling   | Custom requirement / UA enhancement                      | 1–3 pane split board with focus ratio (`1.75x`), Alt+1..3 shortcuts, and drag-to-resize rail        | Google Chat split-screen view; pane replacement undo toast   |
| **Workspace**      | Multi-channel message stream     | `unified-agent` `chat-features/interactions`             | Full support for Web Chat, SMS, WhatsApp, Facebook, Email, Rich buttons, Carousels, and Media       | Google Chat clean bubble containers; grouped turns by sender |
| **Workspace**      | Email threading & rich editor    | `unified-agent` `email-activity`, `email-composer`       | Thread expansion, Reply/Reply-All/Forward, To/Cc/Bcc, inline images, signatures, HTML preview       | Gmail-style inline email editor with recipient pills         |
| **Workspace**      | Whisper & Internal collaboration | `unified-agent` `interactions.component.ts`              | Role-based whisper mode, amber composer alert ring, internal note message bubble tag                | Google Chat warning amber theme; clear audience demarcation  |
| **Workspace**      | In-conversation assistance       | `unified-agent` `interactions.component.ts`              | Direct transfer to agent/queue, consult call/chat, conference, and hand raise                       | Google Meet floating action dialogs with search filter       |
| **Workspace**      | Wrap-up categories & forms       | `unified-agent` `wrap-up-form`                           | Searchable categories, option checklists, character counters, notes, and skip/apply                 | Clean Google Form card layout with validation chips          |
| **Workspace**      | Customer Context & Schema        | `unified-agent` `customer-info`, `contact-card`          | Schema-driven dynamic attributes, PII masking precedence, copy-on-hover, profile match linking      | Google Contact 360 companion panel on right edge             |
| **Voice / CTI**    | SIP WebRTC & Cisco Finesse       | `unified-agent` `sip.service`, `finesse.service`         | Floating persistent `CallDock` with dialpad, mute, hold, consult leg, and transfer                  | Google Meet / Phone floating dock with call leg duration     |
| **Voice / CTI**    | Call recording controls          | `unified-agent` `call-controls.component.ts`             | Pause/Resume call recording with live visual indicator (`REC` red pulse / `PAUSED` amber)           | Google Meet recording indicator badge                        |
| **Voice / CTI**    | Voicemail inbox                  | `unified-agent` `voicemail-inbox.component.ts`           | Global top-bar unread counter badge, inline audio player with waveform, mark-as-read                | Google Voice inbox list with instant playback                |
| **Supervise**      | Live conversations & monitoring  | `unified-agent` `supervisor/active-chats`                | Table with live timers, channel icons, sentiment chip, silent monitor, and barge-in                 | Google Cloud Console monitoring table with real-time refresh |
| **Supervise**      | Queues & Agent activity          | `unified-agent` `supervisor/queue-chats`, `active-agent` | Queue wait timers, active MRD state breakdown, agent reason code inspection                         | Dense data table with status pills and search filters        |
| **Supervise**      | Team announcements               | `unified-agent` `announcement`, `announcement-dialog`    | Top-bar bell popover with unread dot, supervisor creation dialog, seen status tracking              | Google Workspace notification drawer                         |
| **Insights**       | Dashboards & Realtime            | `unified-agent` `dashboard`, `reporting-api`             | Summary KPIs, Agent performance, Supervisor stats, Grafana iframe embeds, and AI widget generator   | Google Cloud dashboard cards with metric charts              |
| **Customers**      | Phonebook & Schema Editor        | `unified-agent` `phonebook`, `customer-schema`           | Schema-driven column preferences, multi-label filtering, attribute type CRUD (string, int, regex)   | Google Cloud data grid with schema builder                   |
| **Customers**      | Subscribed lists (Pull mode)     | `unified-agent` `pull-mode`                              | Request list preview, join conversation, queue subscription management                              | Clean card feed with instant accept actions                  |
| **Recordings**     | VRS Media playback & tags        | `VRS` `front-end` `voice-recordings`, `recording-rules`  | Audio/video player with waveform peaks, Keycloak tag role assignment, CSV export, MP3/WAV download  | Google Cloud Media player with timeline markers              |
| **Recordings**     | Archival & Audit logs            | `VRS` `front-end` `archival-configuration`, `audit-logs` | Server retention rules, storage backend settings, detailed user audit history table                 | Enterprise audit log table with filter bar                   |
| **Administration** | Agent Desk Settings              | `unified-admin` `admin/agent-desk-settings`              | Grouped configuration tabs (Telephony, Finesse, Channels, Web Widget, General), dirty-state SaveBar | Google Admin console layout with field validations           |
| **Administration** | Teams & QM models                | `unified-admin` `admin/teams`, `admin/qm`                | Team member assignment, quality monitoring evaluation forms and scoring models                      | Clean master-detail management interface                     |

---

## 5. Summary of UI/UX Enhancements Implemented

1. **Google Font Stack Integration:**
   - Updated `index.html` to import `Inter` and `Roboto` from Google Fonts.
   - Configured `--font-ui` and `--font-display` in `tokens.css` with fallbacks to Google Sans and system fonts.
2. **Precision Material Design 3 Color Tokens:**
   - Implemented exact Google Workspace colors (`#1a73e8`, `#f8f9fa`, `#dadce0`, `#202124`, `#1e8e3e`, `#f9ab00`, `#d93025`).
   - Standardized hairline borders (`#dadce0` in light mode, `#3c4043` in dark mode) ensuring crisp panel delineation without visual clutter.
   - Optimized Google Chat bubble contrast: customer in neutral `#f1f3f4`, agent in subtle `#e8f0fe` tint.
3. **Component Refinement:**
   - `Button`: Adopted Material Design 3 `font-medium` (500), `rounded-lg` for buttons, and `rounded-full` for icon buttons.
   - `Input`: Outlined input styling with `#dadce0` border, `rounded-lg`, and Google Blue focus ring.
   - `Card` & `Dialog`: Material 3 `rounded-xl` and `rounded-2xl` surfaces with `--shadow-soft` and `--shadow-lift`.
   - `DropdownMenu`: Elevated `rounded-xl` container with `rounded-lg` items and comfortable touch targets.
   - `Badge`: Added Google semantic variants (`success`, `warning`, `secondary`) in pill shapes.
4. **Shell & Navigation Elevation:**
   - `TopBar`: Polished to 56px Google Workspace header with circular icon buttons and pill-shaped action group.
   - `Sidebar`: Upgraded navigation items to Google Chat/Gmail pill shape (`rounded-full`) with `--primary-lt` active highlight.
   - `UserMenu`: Circular avatar with subtle border ring and structured Google Account menu.
5. **Data Table & List Polish:**
   - `DataView` & `ListChrome`: Aligned with Google Cloud Console tables with sticky sentence-case headers, search clear button (`X`), and circular pager buttons.
   - `EmptyState`: Centered circular icon badge in `--primary-lt` with clean headline and actionable button.
6. **Workspace Polish:**
   - `CallDock`: Floating card upgraded to Google Meet style with circular icon badge and clean surface.
   - `Composer`: Cleaned toolbar buttons to circular Google icon buttons with hover background.
   - `ContextPanel` & `CustomerPanel`: Designed as a Google Workspace companion rail (Keep / Tasks side panel in Gmail/Docs) with circular icon tabs (`rounded-full`), clean header, and pill badges.
   - `ConversationPane`: Google Meet / Chat pill toolbar buttons (`h-8 rounded-full`), circular icon buttons, and pill timer badges (`rounded-full`).
   - `ConversationRail`: Google Chat filter pills (`All`, `Unread`, `SLA`, `Waiting`), active item tinted container (`bg-primary-lt`), and circular collapse/expand buttons.
   - `WrapUpPanel`: Clean Google Material 3 surface (eliminated backdrop-blur), pill chips, and standard form controls.
   - `RequestCenter`: Actionable notification pill cards with Google pill buttons and subtle elevation.
   - `QuickLinksMenu` & `AgentAnnouncementsMenu`: Elevated popovers to clean Google Workspace cards.
7. **Administration & Analytics Polish:**
   - `SettingsLayout`: Google Cloud Console side-navigation pills (`bg-primary-lt text-primary rounded-full`) and structured card sections.
   - `RealtimePage`: Google pill tab navigation and circular plus button.
   - `RecordingTable`: Google Cloud Console table headers, neutral row hover, and crisp hairline borders.
