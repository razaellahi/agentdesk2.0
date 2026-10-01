# Architecture

Agent Desk 2.0 is a single React application. It replaces unified-agent, the Agent Desk settings part of unified-admin, and the VRS front end. This document covers the rules that keep it maintainable as it grows.

## Layers

```
src/
  app/         composition root: bootstrap, providers, router, shell, navigation
  features/    one folder per product area (auth, workspace, recordings, admin, …)
  core/        cross-cutting services without UI opinions (api, auth, tenant, i18n, theme, realtime, telephony)
  components/  ui/ = owned shadcn primitives; common/ = app-wide composites
  shared/      pure helpers and hooks
  config/      runtime config schema and loader
```

Dependencies only point **downwards**: `app` → `features` → `core`/`components`/`shared`/`config`. Two ESLint rules enforce this (`no-restricted-imports`):

- `core`, `components`, `shared` and `config` never import `features` or `app`.
- A feature imports another feature only through its `index.ts` (`@/features/<name>`). Inside a feature, use relative imports.

## Startup (`src/app/bootstrap.ts`)

1. `config.json`: fetched with no-cache, hosts rewritten to the page FQDN, validated with zod (`runtimeConfig.schema.ts`).
2. Tenant: `resolveTenant()` uses `TENANT_MODE`; storage is namespaced to `ad2:{tenant}:…`.
3. Theme: the tenant/user preference, applied before the first React render.
4. In parallel: tenant logo, `/agent-desk-settings`, and i18n (`/locale-setting` plus file-engine translations).
5. SSO from URL parameters (Finesse/CRM), otherwise session restore through the refresh token.

A failure in step 1 or 4 renders `StartupError` with Retry. Steps 2–3 cannot fail.

## Data

- **Server state** uses TanStack Query (`app/providers/queryClient.ts`). Query keys are prefixed with the feature name and include the tenant whenever data can differ per tenant.
- **Client and realtime state** uses Zustand stores, normalised by id. Components select the slice they need. Socket events (Phase 2) update stores through `core/realtime/dispatch` only.
- **HTTP** goes through `core/api/createServiceClient`. It adds `Authorization`, `agentId` and `tenantid`, refreshes the token once on a 401, and returns a normalised `ApiError`. Public endpoints pass `{ auth: false }`.

## Auth and permissions

- There is one login: agent-manager `/agent/login`. It covers password, 2FA, forced password change, Finesse and CRM SSO. The access token is kept in memory; the refresh token and user live in tenant-scoped `sessionStorage`, so sessions stay per tab as in the old apps.
- Every permission rule lives in `core/auth/permissions/resources.ts` (`PERMISSIONS`). Navigation (`app/navigation/navConfig.ts`), route guards and `<Can>`/`usePermission` all read from it.
- The agent session (socket, telephony, agent state) starts only for users with the `agent` or `supervisor` role.

## UI

- Colours come from tokens only (`core/theme/tokens.css`), mapped to Tailwind in `core/theme/index.css`. ESLint rejects hex literals in TSX. Light, dark and system themes; tenant brand colours are contrast-checked.
- Use logical CSS (`ms-`, `pe-`, `start-`) so RTL works without overrides.
- Every user-visible string goes through i18next. Existing unified-agent keys are reused; new keys go in `public/i18n/en.json`. `pnpm i18n:check` fails CI on missing literal keys.
- Accessibility target is WCAG 2.1 AA: Radix primitives, visible focus, a skip link, reduced motion.

## Testing

- **Unit**: Vitest + Testing Library, next to the code (`*.test.ts(x)`).
- **E2E**: Playwright against the MSW mock backend (`pnpm e2e`, which starts `vite --mode mock`). Mock users in `src/test/msw/data.ts`: `agent`, `supervisor`, `admin` and `otp` (code `123456`). The password `wrong` fails and `expired` triggers a forced password change.

## Deployment

- `docker/Dockerfile` is the runtime image for CI (it copies `dist`). The root `Dockerfile` is a self-contained multi-stage build.
- At container start, `05-agent-desk-env.envsh` normalises `BASE_PATH`; nginx renders its template; `40-agent-desk.sh` writes `config.json` from the environment, sets `<base href>`, and links the app at `BASE_PATH`.
- nginx sends a strict CSP. `FRAME_ANCESTORS` allows embedding in Finesse or a CRM.
