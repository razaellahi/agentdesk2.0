import type { LinkDialogRequest, LinkDialogResult } from "./linkCustomerWithTopic";
let opener: ((req: LinkDialogRequest) => Promise<LinkDialogResult>) | null = null;
export function registerLinkDialog(value: typeof opener) {
  opener = value;
}
export function openLinkConversationDialog(req: LinkDialogRequest) {
  if (!opener) return Promise.reject(new Error("Link confirm dialog is unavailable"));
  return opener(req);
}
