# Multi-chat reference reconciliation

The [multi-chat reference](https://claude.ai/artifact/5e01496e-df1a-47a8-8350-a5517349f1f4) ("Agent Desk Pane Tabs", option B, revised 25–30 September 2026) was read on 1 October 2026. It is design guidance, not a parity source: the user asked for its intent with real integration, not a copy. This note compares it with the current board.

## Adopted

| Reference behaviour                                                                         | Implementation                                                                                                                                             |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-up, 2-up or 3-up board, each pane with its own header actions, stream, draft and composer | `ConversationsPage` + `boardStore`; drafts per conversation and channel in `composerStore`                                                                 |
| Focused pane takes about 1.75× the width ("focus is width")                                 | Focused pane grows by `1.75`, above the 320 px pane minimum; on narrow screens the minimum wins                                                            |
| Alt+1…3 focuses a pane                                                                      | `useBoardShortcuts` (uses `KeyboardEvent.code`, so Option on macOS works)                                                                                  |
| Alt+N jumps to the next unread conversation                                                 | Same hook; opens the conversation in the board and focuses it                                                                                              |
| New customer message in a background pane: amber edge and unread count, cleared on focus    | Pane bar shows an amber top edge and an "N new" status; focusing the pane clears it                                                                        |
| Narrow screens show only the focused conversation                                           | Below 1024 px the workspace is list → conversation (`useMediaQuery`)                                                                                       |
| Board keeps its width for conversations                                                     | 2–3 panes fold the main nav to icons for the visit; 3 panes under 1536 px shrink the conversation list to avatars (SLA ring, unread and waiting dots stay) |
| Incoming requests never cover a pane                                                        | Requests sit in the top bar's free middle (first one inline, the rest behind "+N more"); below 1024 px they render in flow under the top bar               |
| Pop-out of a conversation without losing its draft                                          | Pop-out window sharing the parent session and draft (`popout.ts`, `ConversationPopoutHost`)                                                                |
| Customer context tied to one conversation, never beside another customer's composer         | Customer panel is anchored to its pane's conversation                                                                                                      |

## Deliberately different

| Reference                                                              | Current choice and reason                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Show on board" checkbox on every rail item is the only layout control | No pane-count control: the board is exactly the conversations the agent chose. A plain click shows a conversation in the focused pane (or another unpinned one). The side-by-side button on a list row, or Ctrl/⌘/Shift-click, adds it beside the focused pane; the button shows the pane number and removes it again. A full board replaces the least recently used unpinned, unfocused pane with an Undo toast. Drafts survive because they are stored per conversation. |
| Pop-out as Google Chat-style windows docked in the same tab            | A separate browser window, owned by the same session (no second socket or SIP registration), as required by the consolidation plan.                                                                                                                                                                                                                                                                                                                                        |
| Waiting chip fixed at amber from 1 min and red from 2 min              | Thresholds still 60/120 s. The consolidation plan requires them to follow SLA configuration; tracked below.                                                                                                                                                                                                                                                                                                                                                                |

## Not yet implemented

- Customer facts card on hover or click of the customer name, with copy buttons and no focus change.
- Sentiment popover (recent customer turns, jump to turn, correct a wrong read) and the one-line AI summary strip in the focused pane.
- One-line suggestion dock above the focused composer (suggestions currently render in the message stream).
- Composer tint and placeholder naming the wait when a customer has waited past the threshold.
- Narrow-pane "More" menu that keeps Pause and Pop out visible and puts Leave last (behind confirmation). The reference added this after a pilot near-miss on Leave.
- Configurable waiting thresholds from SLA settings instead of fixed 60/120 s.
