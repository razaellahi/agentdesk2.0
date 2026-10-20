import { useState } from "react";
import { useLinkedCases } from "../hooks/useLinkedCases";
import { CaseCreatePanel } from "./CaseCreatePanel";
import { CaseDetailPanel } from "./CaseDetailPanel";
import { CustomerCasesList } from "./CustomerCasesList";

/** What the conversation tells Case Management (the old AGENTDESK_AUTH context, minus the token). */
export interface CaseConversationContext {
  /**
   * Conversation id that cases link to. Null when the customer was opened without a
   * real interaction (from the customer list): their cases show, linking does not apply.
   */
  interactionId: string | null;
  customerProfileId: string | null;
  /** Customer display name for the case's linked-conversation record. */
  customerName: string | null;
  /** Channel type name (WhatsApp, Web, …). */
  channel: string | null;
  agentName: string | null;
}

type View =
  { kind: "list" } | { kind: "create" } | { kind: "detail"; caseId: string; linkedNotice?: boolean };

/**
 * Conversation "Cases" tab: the customer's cases, the case already linked to this
 * conversation, creating a case from it and commenting/linking (case-console widget).
 */
export function CasesTab({ context }: { context: CaseConversationContext }) {
  const [view, setView] = useState<View>({ kind: "list" });
  const linked = useLinkedCases(context.interactionId, context.customerProfileId);
  const linkedCase = linked.data?.[0] ?? null;

  if (view.kind === "create") {
    return (
      <CaseCreatePanel
        context={context}
        onBack={() => setView({ kind: "list" })}
        onOpen={(caseId) => setView({ kind: "detail", caseId })}
      />
    );
  }
  if (view.kind === "detail") {
    return (
      <CaseDetailPanel
        key={view.caseId}
        caseId={view.caseId}
        linkedNotice={view.linkedNotice}
        context={context}
        onBack={() => setView({ kind: "list" })}
      />
    );
  }
  return (
    <CustomerCasesList
      context={context}
      linkedCase={linkedCase}
      linkedLoading={Boolean(context.interactionId) && linked.isPending}
      onOpen={(caseId) => setView({ kind: "detail", caseId })}
      // A conversation links to at most one case: "New case" on a linked chat opens that case (widget-create.guard).
      onCreate={() =>
        setView(
          linkedCase ? { kind: "detail", caseId: linkedCase.id, linkedNotice: true } : { kind: "create" },
        )
      }
    />
  );
}
