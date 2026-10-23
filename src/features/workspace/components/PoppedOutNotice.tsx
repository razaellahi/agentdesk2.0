import { SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useMaskedValue } from "../hooks/useMaskedValue";
import { useConversation } from "../store/conversationStore";
import { mergeConversationBack } from "../store/popout";
import { CustomerAvatar } from "./CustomerInitials";
import { EmptyConversationArt } from "./EmptyConversationArt";

/** One conversation in a floating window, with the way back into the main view. */
function PoppedOutRow({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation();
  const conversation = useConversation(conversationId);
  const first = useMaskedValue(conversation?.customer.firstName, "firstName", "manage_in_conversation");
  const last = useMaskedValue(conversation?.customer.lastName, "lastName", "manage_in_conversation");
  if (!conversation) return null;
  const name = [first, last].filter(Boolean).join(" ") || t("globals.UNIDENTIFIED-CUSTOMER");
  return (
    <li className="flex items-center gap-3 rounded-xl border border-chat-rule bg-surface py-2 ps-3 pe-2 text-start">
      <CustomerAvatar name={name} size="md" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{name}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 rounded-lg"
        aria-label={t("workspace.bring-back-named", { name })}
        onClick={() => mergeConversationBack(conversationId)}
      >
        <SquareArrowOutUpRight className="size-3.5 -scale-x-100" aria-hidden />
        {t("workspace.bring-back")}
      </Button>
    </li>
  );
}

/**
 * The main view when every open conversation is in a floating window: says so, instead of claiming nothing is
 * open, and brings a conversation back with one click.
 */
export function PoppedOutNotice({ ids }: { ids: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 overflow-y-auto bg-surface px-6 py-8 text-center">
      {/* Floating windows open at the top right, so on a wide screen the notice keeps to the left of them. */}
      <div className="desk-enter m-auto flex w-full max-w-md flex-col items-center lg:ms-16 lg:me-auto">
        <EmptyConversationArt className="h-44 w-auto sm:h-56" />
        <p className="mt-6 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("workspace.popped-out-title", { count: ids.length })}
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {t("workspace.popped-out-hint", { count: ids.length })}
        </p>
        <ul className="mt-6 flex w-full flex-col gap-2">
          {ids.map((id) => (
            <PoppedOutRow key={id} conversationId={id} />
          ))}
        </ul>
      </div>
    </div>
  );
}
