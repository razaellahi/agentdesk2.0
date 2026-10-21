import { beforeEach, describe, expect, it } from "vitest";
import { useKnowledgeStore } from "./knowledgeStore";

const hit = (query: string) => ({ query, answer: `answer to ${query}`, sources: [] });

describe("knowledge store", () => {
  beforeEach(() => useKnowledgeStore.setState({ hits: {}, expanded: {} }));

  it("keeps the newest answer first and replaces a repeated question", () => {
    const { addHit } = useKnowledgeStore.getState();
    addHit("c1", hit("refunds"));
    addHit("c1", hit("delivery"));
    addHit("c1", { ...hit("refunds"), answer: "updated" });
    expect(useKnowledgeStore.getState().hits.c1?.map((row) => row.query)).toEqual(["refunds", "delivery"]);
    expect(useKnowledgeStore.getState().hits.c1?.[0]?.answer).toBe("updated");
  });

  it("keeps each conversation's answers apart and caps how many it holds", () => {
    const { addHit } = useKnowledgeStore.getState();
    for (let i = 0; i < 9; i++) addHit("c1", hit(`q${i}`));
    addHit("c2", hit("other"));
    expect(useKnowledgeStore.getState().hits.c1).toHaveLength(6);
    expect(useKnowledgeStore.getState().hits.c1?.[0]?.query).toBe("q8");
    expect(useKnowledgeStore.getState().hits.c2).toHaveLength(1);
  });

  it("clearing drops the answers and closes the full view", () => {
    const { addHit, expand, clear } = useKnowledgeStore.getState();
    addHit("c1", hit("refunds"));
    expand("c1", "refunds");
    clear("c1");
    expect(useKnowledgeStore.getState().hits.c1).toEqual([]);
    expect(useKnowledgeStore.getState().expanded.c1).toBeNull();
  });
});
