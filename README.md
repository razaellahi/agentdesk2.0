# Agent Desk 2.0

One app that replaces three Expertflow front ends:

- **unified-agent**: the whole agent and supervisor workspace.
- **unified-admin**: only the Agent Desk settings (Settings, Languages, Translations).
- **VRS**: recordings, players, audit logs, rules, archival and tags.

Everyone signs in once and sees only what their Keycloak permissions allow.

- Plan and progress: [`docs/FEATURE_PARITY.md`](docs/FEATURE_PARITY.md)
- How the code is organised: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- What backends must provide: [`docs/BACKEND_PREREQUISITES.md`](docs/BACKEND_PREREQUISITES.md)

## Quick start

Requires Node 22+. pnpm is used through corepack (`corepack enable`, or prefix commands with `corepack`).

```bash
pnpm install
pnpm mock            # offline, mocked backend: http://localhost:4200/agent-desk/
                     # users: agent / supervisor / admin / otp (OTP 123456), any password
pnpm dev             # real backends: set VITE_PROXY_TARGET in .env.local (see .env.example)
```

| Command                                              | Purpose                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Static checks                                                      |
| `pnpm test` / `pnpm coverage`                        | Unit tests (Vitest)                                                |
| `pnpm e2e`                                           | Playwright e2e tests against the mock backend                      |
| `pnpm i18n:check`                                    | Every translation key used in code exists in `public/i18n/en.json` |
| `pnpm build`                                         | Production build into `dist/`                                      |

## Configuration

Runtime settings live in `config.json`. Key names match unified-agent, so existing deployment values carry over. In containers the file is rendered from environment variables; see [`environment_variables.env`](environment_variables.env) for every variable and its default.

New keys:

- `TENANT_MODE`, `TENANT_ID`, `DEFAULT_TENANT`: multi-tenancy
- `DEFAULT_LANGUAGE`, `DEFAULT_THEME`: language and theme defaults
- `BASE_PATH`: the path the app is served under
- `DEPLOYMENT_PROFILE`, `VRS_URL`: recordings
- `feature_*` flags

```bash
docker build -t agent-desk .
docker run -p 8080:8080 --env-file environment_variables.env agent-desk
# -> http://localhost:8080/agent-desk/
```
