import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LinkDialogRequest, LinkDialogResult } from "../linking/linkCustomerWithTopic";

import { PortalContainerContext, focusedOverlayContainer } from "@/components/ui/portal-container";
import { registerLinkDialog } from "../linking/linkDialog";
type Pending = LinkDialogRequest & { container?: HTMLElement; resolve: (result: LinkDialogResult) => void };

/** Mount once near the workspace shell so link confirms can show a merge checkbox. */
export function LinkConversationHost() {
  const { t } = useTranslation();
  const [pending, setPending] = useState<Pending | null>(null);
  const [merge, setMerge] = useState(false);
  const current = useRef<Pending | null>(null);

  useEffect(() => {
    registerLinkDialog(
      (req) =>
        new Promise<LinkDialogResult>((resolve) => {
          current.current?.resolve({ confirmed: false, merge: false });
          const next = { ...req, resolve, container: focusedOverlayContainer() };
          current.current = next;
          setMerge(false);
          setPending(next);
        }),
    );
    return () => {
      registerLinkDialog(null);
      current.current?.resolve({ confirmed: false, merge: false });
      current.current = null;
    };
  }, []);
  useEffect(() => {
    const ownerWindow = pending?.container?.ownerDocument.defaultView;
    if (!ownerWindow) return;
    const cancel = () => {
      if (current.current !== pending) return;
      pending?.resolve({ confirmed: false, merge: false });
      current.current = null;
      setPending(null);
    };
    ownerWindow.addEventListener("pagehide", cancel);
    return () => ownerWindow.removeEventListener("pagehide", cancel);
  }, [pending]);

  const close = (confirmed: boolean) => {
    pending?.resolve({ confirmed, merge });
    current.current = null;
    setPending(null);
  };

  return (
    <PortalContainerContext.Provider value={pending?.container}>
      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && close(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("link-conversation.link-conversation")}
              {pending?.customerName}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("link-conversation.like-to-link-conversation")}
            {pending?.customerName}
          </p>
          {pending?.offerMerge && pending.channelIdentifier && (
            <label className="mt-3 flex items-start gap-2 text-sm">
              <Checkbox checked={merge} onCheckedChange={(value) => setMerge(value === true)} />
              <span>
                {t("link-conversation.add-channel-identifeir")} {pending.channelIdentifier}
                {pending.attributeLabel ? ` (${pending.attributeLabel})` : ""}
              </span>
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              {t("link-conversation.cancel")}
            </Button>
            <Button type="button" onClick={() => close(true)}>
              {t("link-conversation.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalContainerContext.Provider>
  );
}
