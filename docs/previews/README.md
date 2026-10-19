# Agent Desk 2.0 UI review

Captured 2 October 2026 from the local **mock environment**, using synthetic customer conversations, recording rows and settings. These images demonstrate the implemented layout; they do not prove live login, telephony, reporting or recording service behavior. The Claude multi-chat reference still requires sign-in and has not been visually compared.

| Screen                                                      | Preview                                  |
| ----------------------------------------------------------- | ---------------------------------------- |
| Two simultaneous conversations, light theme                 | [Workspace](workspace-light.png)         |
| Two simultaneous conversations, dark theme                  | [Dark workspace](workspace-dark.png)     |
| One conversation on a 390px mobile viewport                 | [Mobile workspace](workspace-mobile.png) |
| Arabic direction and translations                           | [RTL workspace](workspace-rtl.png)       |
| Rich email composer, recipients and customer context        | [Email composer](email-composer.png)     |
| Unified Admin Agent Desk Settings only                      | [Settings](settings.png)                 |
| Correlated recording legs, sticky actions and archived rows | [Recordings](recordings.png)             |

Visual inspection found no page overflow on the populated mobile workspace and no browser page errors in these captures. The dark workspace, grouped settings and recording actions were also inspected. Full language, zoom, keyboard, cross-browser and real agent task acceptance remain in [the parity ledger](../FEATURE_PARITY.md).

To review locally, run `pnpm mock --host 127.0.0.1 --port 4310` and open `http://localhost:4310/agent-desk/`. The mock identities `agent`, `supervisor` and `admin` show different permission sets; use `secret` as the sample password. Mock mode does not establish an operational agent connection.

The main [consolidation plan](../CONSOLIDATION_PLAN.md) and [source inventory](../SOURCE_INVENTORY.md) retain the migration scope and develop baseline references.
