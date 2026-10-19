import { describe, expect, it } from "vitest";
import { agentNames, asArray, chatsFromBuckets, matchesAgentSearch, sortBySeconds } from "./model";

describe("supervise reporting rows", () => {
  it("flattens queue buckets and keeps the queue name on each chat", () => {
    const rows = chatsFromBuckets([
      {
        queueName: "Sales",
        chats: [
          { customerName: "Ada", conversationState: "ACTIVE", activeSince: 10 },
          { customerName: "Bea", conversationState: "ON_HOLD", activeSince: 30 },
        ],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ customerName: "Ada", queueName: "Sales" });
  });

  it("filters by conversation state and sorts by elapsed seconds", () => {
    const rows = sortBySeconds(
      chatsFromBuckets(
        [
          {
            chats: [
              { activeSince: 5, conversationState: "ACTIVE" },
              { activeSince: 20, conversationState: "ON_HOLD" },
            ],
          },
        ],
        "ACTIVE",
      ),
      "activeSince",
      "desc",
    );
    expect(rows.map((row) => row.activeSince)).toEqual([5]);
  });

  it("matches an agent search against name and username", () => {
    const chat = { agentDetails: [{ name: "Sara Khan", userName: "sara" }] };
    expect(agentNames(chat)).toBe("Sara Khan");
    expect(matchesAgentSearch(chat, "sara")).toBe(true);
    expect(matchesAgentSearch(chat, "nope")).toBe(false);
  });

  it("accepts a bare array or a docs wrapper", () => {
    expect(asArray({ docs: [1] })).toEqual([1]);
    expect(asArray({ data: ["a"] })).toEqual(["a"]);
    expect(asArray(null)).toEqual([]);
  });
});
