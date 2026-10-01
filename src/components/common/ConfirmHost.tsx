import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { useConfirmStore } from "./confirm";

/** Mounted once at the app root; renders requests made through `confirm()`. */
export function ConfirmHost() {
  const { t } = useTranslation();
  const request = useConfirmStore((s) => s.request);
  const settle = useConfirmStore((s) => s.settle);
  return (
    <AlertDialog open={Boolean(request)} onOpenChange={(open) => !open && settle(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description && <AlertDialogDescription>{request.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {request?.cancelLabel ?? t("globals.Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={request?.destructive ? buttonVariants({ variant: "destructive" }) : undefined}
          >
            {request?.confirmLabel ?? t("globals.Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
