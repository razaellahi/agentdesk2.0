import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { conversationFixture } from "@/test/conversations";
import type * as AuthModule from "@/core/auth";
import type { Conversation } from "../model/types";
import { useContextTabs } from "./useCustomerContext";

// The Cases tab depends on the case backend; these tests cover only the tab-strip decision.
vi.mock("@/features/cases", () => ({
  caseManagementConfigured: () => true,
  useLinkedCases: () => ({ data: [] }),
}));
vi.mock("@/core/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof AuthModule>();
  return { ...actual, usePermission: () => true };
});

function TabProbe({ conversation }: { conversation: Conversation }) {
  const tabs = useContextTabs(conversation);
  return (
    <ul aria-label="tabs">
      {tabs.map((tab) => (
        <li key={tab.id}>{tab.id}</li>
      ))}
    </ul>
  );
}

describe("customer context tabs", () => {
  it("shows the Cases tab to an agent, so a case can always be opened or created from the conversation", () => {
    const conversation = conversationFixture("probe", "Probe");
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TooltipProvider>
          <TabProbe conversation={conversation} />
        </TooltipProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("list", { name: "tabs" })).toHaveTextContent("cases");
  });
});
