import { describe, expect, it } from "vitest";
import { searchActivitiesQuery, searchConversationsQuery } from "./graphql";

describe("activity query", () => {
  it("filters voicemail for one agent", () => {
    const query = searchActivitiesQuery(
      [
        { key: "activity.name", operator: "equal_to", value: "VOICE_MAIL_ACTIVITY" },
        { key: "activity.data.additionalDetails.agentInfo.agentId", operator: "equal_to", value: 'a"b' },
      ],
      25,
      0,
    );
    expect(query).toContain("searchActivities");
    expect(query).toContain('value: "VOICE_MAIL_ACTIVITY"');
    expect(query).toContain('value: "a\\"b"');
  });
});

describe("recent conversation query", () => {
  it("keeps agent scope AND selected channel alternatives during pagination", () => {
    const query = searchConversationsQuery(25, 50, {
      filters: [{ key: "agentParticipants.id", operator: "equal_to", value: "agent-1" }],
      channels: ["Email", 'Web"Chat'],
      sortBy: "durationInSeconds",
      sortOrder: "ASC",
    });
    expect(query).toContain("pagination: { limit: 25, offset: 50 }");
    expect(query).toContain('sortBy: "durationInSeconds", sortOrder: ASC');
    expect(query).toContain('filter: { and: [ { key: "agentParticipants.id"');
    expect(query).toContain(
      '{ or: [ { key: "participants.participant.channel.name", operator: equal_to, value: "Email" }',
    );
    expect(query).toContain('value: "Web\\"Chat"');
  });
});
