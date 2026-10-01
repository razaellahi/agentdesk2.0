import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { AdminLanguagesPage, AdminSettingsPage, AdminTranslationsPage } from "@/features/admin";
import { ConversationsPage } from "@/features/workspace";

/**
 * Page component per navigation id. Modules are code-split; until a module's
 * phase lands it renders the shared placeholder.
 */
export const LoginPage = lazy(() => import("@/features/auth/LoginRoute"));

const placeholder = lazy(() => import("../pages/ModulePlaceholder"));

export const MODULE_PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  conversations: lazy(ConversationsPage),
  customers: placeholder,
  labels: placeholder,
  schema: placeholder,
  voicemail: placeholder,
  "subscribed-lists": placeholder,
  live: placeholder,
  queues: placeholder,
  agents: placeholder,
  recent: placeholder,
  announcements: placeholder,
  summary: placeholder,
  "agent-performance": placeholder,
  "team-stats": placeholder,
  "team-detail": placeholder,
  realtime: placeholder,
  recordings: placeholder,
  "audit-logs": placeholder,
  "recording-rules": placeholder,
  archival: placeholder,
  "recording-tags": placeholder,
  "admin-settings": lazy(AdminSettingsPage),
  "admin-languages": lazy(AdminLanguagesPage),
  "admin-translations": lazy(AdminTranslationsPage),
};
