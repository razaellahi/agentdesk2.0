import { delay, http, HttpResponse, type HttpHandler } from "msw";
import { caseHandlers } from "./cases";
import { demoLabelsOf, MOCK_LABELS } from "./demoLabels";
import { demoQuickReplies, refineDemoText, type QuickReplyDoc } from "./composerAssist";
import { customersGraphql, demoSavedFilters, filtersGraphql } from "./customerSearch";
import { MOCK_DESK_SETTINGS, MOCK_LOCALE_SETTING, MOCK_TRANSLATIONS, MOCK_USERS, mockUserJwt } from "./data";
import { mockDemoFile } from "./demoFiles";
import { demoCustomerActivities } from "./history";
import { mockRecordingWav } from "./media";

/** Mutable mock state so admin screens can save and read back. */
export const mockDb = {
  quickReplies: new Map<string, { _id: string; user_Id: string; quickReplies: QuickReplyDoc[] }>(),
  savedFilters: demoSavedFilters(),
  deskSettings: structuredClone(MOCK_DESK_SETTINGS),
  localeSetting: structuredClone(MOCK_LOCALE_SETTING),
  preferences: new Map<string, Record<string, unknown>>(),
  translations: structuredClone(MOCK_TRANSLATIONS) as Record<string, Record<string, unknown>>,
  archival: new Map<string, Record<string, unknown>>(),
  dashboards: new Map<string, unknown>(),
  phonebook: [
    {
      _id: "customer-amina",
      firstName: "Amina",
      lastName: "Raza",
      voice: "+923001112233",
      email: "amina@example.com",
      // The same number is also her WhatsApp, so the two show as one identifier with both channels.
      whatsapp: "+923001112233",
      facebook: "amina.raza.official",
      instagram: "@amina.raza",
      web: "visitor-9c41",
      labels: [],
    },
    {
      _id: "customer-bilal",
      firstName: "Bilal",
      lastName: "Ahmed",
      voice: "+923004445566",
      whatsapp: "+923009998877",
      facebook: "bilal.ahmed.77",
      labels: [],
    },
    // Raise cases by email: see the email threads in history.ts and cases 8 and 9 in cases.ts.
    {
      _id: "customer-chen",
      firstName: "Chen",
      lastName: "Wei",
      voice: "+8613800138000",
      email: ["chen.wei@lumina-trading.example", "accounts@lumina-trading.example"],
      whatsapp: "+8613800138000",
      web: "visitor-2b77",
      labels: [],
    },
    {
      _id: "customer-fatima",
      firstName: "Fatima",
      lastName: "Noor",
      voice: "+971501234567",
      email: "fatima.noor@example.com",
      facebook: "fatima.noor.9",
      instagram: "@fatima.noor",
      labels: [],
    },
    // More people to search and filter: all sort after the four above, so they keep their places.
    {
      _id: "customer-hassan",
      firstName: "Hassan",
      lastName: "Mirza",
      voice: "+923011234567",
      email: "hassan.mirza@example.com",
      labels: [],
    },
    {
      _id: "customer-ibrahim",
      firstName: "Ibrahim",
      lastName: "Khalil",
      voice: "+96550123456",
      whatsapp: "+96550123456",
      email: "ibrahim.khalil@gulfmart.example",
      labels: [],
    },
    {
      _id: "customer-layla",
      firstName: "Layla",
      lastName: "Haddad",
      email: "layla.haddad@example.com",
      facebook: "layla.haddad.5",
      instagram: "@layla.h",
      labels: [],
    },
    {
      _id: "customer-marcus",
      firstName: "Marcus",
      lastName: "Webb",
      voice: "+14155550142",
      email: "marcus.webb@northwind.example",
      labels: [],
    },
    {
      _id: "customer-nadia",
      firstName: "Nadia",
      lastName: "Siddiqui",
      voice: "+923331234000",
      whatsapp: "+923331234000",
      email: "nadia.siddiqui@example.com",
      web: "visitor-71aa",
      labels: [],
    },
    {
      _id: "customer-omar",
      firstName: "Omar",
      lastName: "Farouk",
      voice: "+201001234567",
      whatsapp: "+201001234567",
      labels: [],
    },
    {
      _id: "customer-priya",
      firstName: "Priya",
      lastName: "Nair",
      voice: "+919876543210",
      email: "priya.nair@example.com",
      instagram: "@priya.nair",
      labels: [],
    },
    {
      _id: "customer-sofia",
      firstName: "Sofia",
      lastName: "Rossi",
      email: ["sofia.rossi@example.it", "s.rossi@studio-rossi.example"],
      facebook: "sofia.rossi.88",
      labels: [],
    },
  ],
  voicemails: [
    { id: "vm-1", status: "Unread", name: "Amina", timestamp: 1_790_000_000_000 },
    { id: "vm-2", status: "Unread", name: "Bilal", timestamp: 1_790_000_100_000 },
    { id: "vm-3", status: "Read", name: "Chen", timestamp: 1_789_000_000_000 },
  ],
  directory: [
    {
      id: "u-sup-1",
      username: "supervisor",
      firstName: "Omar",
      lastName: "Khan",
      roles: ["supervisor", "agent"],
    },
    { id: "u-sup-2", username: "leila", firstName: "Leila", lastName: "Hassan", roles: ["supervisor"] },
    { id: "u-agent-1", username: "agent", firstName: "Sana", lastName: "Iqbal", roles: ["agent"] },
    { id: "u-agent-2", username: "hassan", firstName: "Hassan", lastName: "Ali", roles: ["agent"] },
  ],
  teams: [
    {
      team_Id: "team-1",
      team_name: "Support",
      description: "Customer support",
      supervisor_Id: "u-sup-1" as string | null,
      supervisor: { id: "u-sup-1", username: "supervisor", firstName: "Omar", lastName: "Khan" } as {
        id: string;
        username: string;
        firstName: string;
        lastName: string;
        roles?: string[];
      } | null,
      source: "CX",
      created_by: "admin" as string | undefined,
      createdAt: "2026-03-01T09:00:00.000Z",
      isDeleted: false,
    },
  ],
  teamMembers: [
    { teamId: "team-1", type: "agent" as const, username: "agent" },
    { teamId: "team-1", type: "secondary-supervisor" as const, username: "leila" },
  ],
  qmModels: [
    {
      id: "64b0c0a0e4b0c0a0e4b0c0a1",
      formTitle: "Greeting quality",
      formDescription: "How the agent opened the conversation.",
      enableWeightage: true,
      formWeightage: 100,
      isDeleted: false,
      state: "published" as const,
      updatedAt: "2026-03-02T09:00:00.000Z",
      sections: [
        {
          sectionName: "Opening",
          sectionKey: "opening",
          sectionWeightage: 100,
          attributes: [
            {
              label: "Greeted the customer",
              key: "greeted",
              valueType: "mcq",
              attributeType: "OPTIONS",
              isRequired: true,
              attributeWeightage: 100,
              enableOptionWeightage: true,
              attributeOptions: {
                attributeData: [
                  {
                    values: [
                      { label: "Yes", value: "yes", optionWeightage: 100 },
                      { label: "No", value: "no", optionWeightage: 0 },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

// The demo customers carry labels (ids, as the customer API stores them).
for (const customer of mockDb.phonebook)
  (customer as { labels: string[] }).labels = demoLabelsOf(customer._id);

/** VOICE_MAIL_ACTIVITY documents in the conversation-manager searchActivities shape. */
function voicemailDocs(query: string) {
  const rows = mockDb.voicemails.filter((v) =>
    query.includes('value: "Unread"')
      ? v.status === "Unread"
      : query.includes('value: "Read"')
        ? v.status === "Read"
        : true,
  );
  return rows.map((v) => ({
    id: v.id,
    timestamp: v.timestamp,
    activity: {
      name: "VOICE_MAIL_ACTIVITY",
      channelSession: {
        channelData: { channelCustomerIdentifier: "+923001234567" },
        customer: { _id: `c-${v.id}`, firstName: v.name },
      },
      data: {
        recordingUrl: `https://mtt02.expertflow.com/file-engine/1/api/downloadFileStream?filename=${v.id}.wav`,
        duration: 12,
        additionalDetails: { status: v.status, agentInfo: { agentId: "u-agent-1" } },
      },
    },
  }));
}

const loginResponse = (username: string) => {
  const entry = MOCK_USERS[username] ?? MOCK_USERS.agent!;
  return {
    data: {
      token: mockUserJwt(entry.user.username),
      refresh_token: `refresh-${entry.user.username}`,
      keycloak_User: entry.user,
      is2FAEnabled: false,
    },
  };
};

// Mock state resets on every reload; preferences are kept in the browser so a saved theme survives it.
const PREFERENCES_KEY = (userId: string) => `mock:agentSetting:${userId}`;

function readSavedPreferences(userId: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY(userId));
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function savePreferences(userId: string, prefs: Record<string, unknown>) {
  try {
    localStorage.setItem(PREFERENCES_KEY(userId), JSON.stringify(prefs));
  } catch {
    /* storage unavailable: the in-memory copy still serves this page load */
  }
}

export const handlers: HttpHandler[] = [
  ...caseHandlers,
  http.get("*/channels/defaultoutbound", () => HttpResponse.json({ serviceIdentifier: "support-sms" })),
  http.get("*/channels", ({ request }) => {
    const type = new URL(request.url).searchParams.get("channelTypeName") ?? "SMS";
    return HttpResponse.json([
      {
        id: "channel-sms",
        name: "Customer support",
        serviceIdentifier: "support-sms",
        defaultOutbound: true,
        channelType: { id: "sms-type", name: type },
      },
    ]);
  }),
  // The customer API's GraphQL: full-text search and saved-filter results, and the saved filters themselves.
  http.post("*/v2/customers", async ({ request }) =>
    HttpResponse.json(customersGraphql((await request.json()) as never, mockDb.phonebook as never)),
  ),
  http.post("*/filter", async ({ request }) =>
    HttpResponse.json(filtersGraphql((await request.json()) as never, mockDb.savedFilters)),
  ),
  http.get("*/customers", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const search = params.get("paginateQuery") ?? "";
    const matched = search.includes("5551234567");
    if (matched)
      return HttpResponse.json({
        docs: [{ _id: "outbound-customer", firstName: "Amina", phoneNumber: "+925551234567", labels: [] }],
        totalDocs: 1,
      });
    // `field:text` and/or `labels:id,id` (the phonebook's label filter): customers with any of the labels.
    const [fieldPart, labelPart] = search.split(/,?labels:/);
    const labelIds = labelPart ? labelPart.split(",").filter(Boolean) : [];
    const [field, ...text] = (fieldPart ?? "").split(":");
    const needle = text.join(":").toLowerCase();
    const everyone = mockDb.phonebook as unknown as Record<string, unknown>[];
    const filtered = everyone.filter(
      (row) =>
        (!field ||
          !needle ||
          String(row[field] ?? "")
            .toLowerCase()
            .includes(needle)) &&
        (!labelIds.length || ((row.labels as string[]) ?? []).some((id) => labelIds.includes(id))),
    );
    // An unfiltered phonebook lists a few customers so the screen and its row actions can be exercised.
    const phonebook = search && !labelIds.length && !field ? [] : filtered;
    const limit = Number(params.get("limit")) || phonebook.length;
    const offset = Number(params.get("offset")) || 0;
    return HttpResponse.json({ docs: phonebook.slice(offset, offset + limit), totalDocs: phonebook.length });
  }),
  // The phonebook is mutable so a saved customer (labels included) reads back, as the real API does: labels are ids.
  http.get("*/cim-customer/customers/:id", ({ params }) => {
    const row = mockDb.phonebook.find((customer) => customer._id === params.id);
    return row ? HttpResponse.json(row) : HttpResponse.json({ message: "Not found" }, { status: 404 });
  }),
  http.put("*/cim-customer/customers/:id", async ({ params, request }) => {
    const index = mockDb.phonebook.findIndex((customer) => customer._id === params.id);
    if (index < 0) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    mockDb.phonebook[index] = { ...mockDb.phonebook[index]!, ...body } as (typeof mockDb.phonebook)[number];
    return HttpResponse.json(mockDb.phonebook[index]);
  }),
  http.post("*/compliance-dnc/check", () => HttpResponse.json({ blocked: false })),
  http.post("*/message/receive", async ({ request }) => {
    const message = (await request.json()) as { body?: { markdownText?: string } };
    return message.body?.markdownText === "Trigger failure"
      ? HttpResponse.json({ message: "Outbound service unavailable" }, { status: 503 })
      : HttpResponse.json({ accepted: true });
  }),
  http.get("*/customerSchema", () =>
    HttpResponse.json([
      { key: "firstName", label: "First name", type: "string", length: 80, isRequired: true, isPii: true },
      { key: "lastName", label: "Last name", type: "string", length: 80, isPii: true },
      { key: "email", label: "Email", type: "email", isChannelIdentifier: true, isPii: true },
      { key: "voice", label: "Phone number", type: "phoneNumber", isChannelIdentifier: true, isPii: true },
      {
        key: "whatsapp",
        label: "WhatsApp",
        type: "phoneNumber",
        isChannelIdentifier: true,
        isPii: true,
        channelTypes: ["WHATSAPP"],
      },
      {
        key: "facebook",
        label: "Facebook",
        type: "string",
        isChannelIdentifier: true,
        channelTypes: ["FACEBOOK"],
      },
      {
        key: "instagram",
        label: "Instagram",
        type: "string",
        isChannelIdentifier: true,
        channelTypes: ["INSTAGRAM"],
      },
      { key: "web", label: "Web", type: "string", isChannelIdentifier: true, channelTypes: ["WEB"] },
      { key: "labels", label: "Labels", type: "labels" },
    ]),
  ),
  http.get("*/label", () => HttpResponse.json(MOCK_LABELS)),
  http.post("*/label", async ({ request }) => {
    const body = (await request.json()) as { name: string; colorCode: string };
    return HttpResponse.json({ _id: `label-${body.name.toLowerCase()}`, ...body });
  }),
  http.get("*/attributeTypes", () =>
    HttpResponse.json([
      { type: "string", regex: ".*", valueType: "String" },
      { type: "email", regex: "[^ @]+@[^ @]+\\.[^ @]+", valueType: "String" },
      { type: "phoneNumber", regex: "[+0-9 ()-]+", valueType: "String" },
      { type: "integer", regex: "-?[0-9]+", valueType: "Number" },
      { type: "boolean", regex: "true|false", valueType: "Boolean" },
    ]),
  ),
  http.get("*/customer-topics/customer/:customerId/activities", ({ request, params }) => {
    const page = Number(new URL(request.url).searchParams.get("offset"));
    if (params.customerId === "history-long")
      return HttpResponse.json({
        docs:
          page < 2
            ? Array.from({ length: 50 }, (_, index) => {
                const n = (page === 0 ? 50 : 0) + index;
                return {
                  id: `long-event-${n}`,
                  name: "CUSTOMER_MESSAGE",
                  timestamp: n * 1000,
                  data: {
                    id: `long-message-${n}`,
                    header: { timestamp: n * 1000, sender: { type: "CUSTOMER" } },
                    body: {
                      type: "PLAIN",
                      markdownText: `Historical message ${n}. I am checking the status of my account and need an update from your team.`,
                    },
                  },
                };
              })
            : [],
      });
    return HttpResponse.json({
      docs:
        page === 0
          ? [
              // The demo customers also have recent conversations (see history.ts).
              ...(demoCustomerActivities(String(params.customerId)) ?? []),
              {
                id: "history-1",
                name: "CUSTOMER_MESSAGE",
                timestamp: 1000,
                data: {
                  id: "history-message-1",
                  header: { timestamp: 1000, sender: { type: "CUSTOMER" } },
                  body: { type: "PLAIN", markdownText: "Earlier account question" },
                },
              },
              {
                id: "history-voice",
                name: "VOICE_ACTIVITY",
                timestamp: 2000,
                data: {
                  duration: 63,
                  callLegs: [
                    {
                      sender: { id: "u-agent-1", senderName: "Sana" },
                      startDirection: "INBOUND",
                      duration: 63,
                      additionalDetail: {
                        dialog: {
                          queueName: "Customer support",
                          ani: "+923001234567",
                          wrapUpReason: "Resolved",
                        },
                      },
                    },
                  ],
                },
              },
            ]
          : page === 1
            ? [
                {
                  id: "history-older",
                  name: "CUSTOMER_MESSAGE",
                  timestamp: 500,
                  data: {
                    id: "history-message-older",
                    header: { timestamp: 500, sender: { type: "CUSTOMER" } },
                    body: { type: "PLAIN", markdownText: "Oldest account message" },
                  },
                },
              ]
            : [],
    });
  }),
  http.get("*/customer-topics/:conversationId/activities", () =>
    HttpResponse.json({
      docs: [
        {
          id: "recent-history",
          name: "CUSTOMER_MESSAGE",
          timestamp: 1000,
          data: {
            id: "recent-history-message",
            header: {
              timestamp: 1000,
              sender: { type: "CUSTOMER" },
              customer: { _id: "customer-a", firstName: "Amina" },
            },
            body: { type: "PLAIN", markdownText: "Archived conversation question" },
          },
        },
      ],
    }),
  ),
  http.post("*/graphql", async ({ request }) => {
    const body = (await request.json()) as { query?: string };
    if (body.query?.includes("searchConversations"))
      return HttpResponse.json({
        data: {
          searchConversations: {
            totalDocs: 1,
            docs: [
              {
                id: "past-a",
                state: "CLOSED",
                customer: { _id: "customer-a", firstName: "Amina" },
                conversationDirection: "INBOUND",
                creationTime: 1000,
                durationInSeconds: 63,
              },
            ],
          },
        },
      });
    if (body.query?.includes("VOICE_MAIL_ACTIVITY")) {
      const docs = voicemailDocs(body.query);
      return HttpResponse.json({ data: { searchActivities: { totalDocs: docs.length, docs } } });
    }
    return HttpResponse.json({ data: { searchActivities: { totalDocs: 0, docs: [] } } });
  }),
  http.put("*/activities/voice-mailbox-status", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const vm = mockDb.voicemails.find((v) => v.id === params.get("activityId"));
    if (vm) vm.status = params.get("status") ?? vm.status;
    return HttpResponse.json({ ok: true });
  }),
  http.get("*/api/downloadFileStream", ({ request }) => {
    const filename = new URL(request.url).searchParams.get("filename") ?? "";
    if (filename.startsWith("vm-"))
      return new HttpResponse(mockRecordingWav(), { headers: { "Content-Type": "audio/wav" } });
    // The demo's email attachments (history.ts).
    if (filename.startsWith("demo-")) {
      const file = mockDemoFile(filename);
      return new HttpResponse(file.body, { headers: { "Content-Type": file.type } });
    }
    return undefined;
  }),
  http.get("*/social-media-post", () =>
    HttpResponse.json({
      socialMediaPost: {
        username: "Support",
        text: "Account support update",
        permalinkUrl: "https://example.com/post",
        comments: [
          {
            id: "comment-1",
            username: "Amina",
            text: "I have a question",
            subComments: [{ username: "Support", text: "We are here to help" }],
          },
        ],
      },
    }),
  ),
  // Development fixtures use the source service contracts; no production fallbacks.
  http.get("*/vrs/recording/download/:id", ({ params }) =>
    params.id === "rec-2"
      ? HttpResponse.json({ message: "Recording media unavailable" }, { status: 503 })
      : new HttpResponse(mockRecordingWav(), { headers: { "Content-Type": "audio/wav" } }),
  ),
  http.post("*/vrs/recording/:id/logAction", () => new HttpResponse("ok")),
  http.get("*/vrs/recordings", () =>
    HttpResponse.json({
      totalRecords: 2,
      data: [
        {
          callId: "CX-1042",
          tagId: 1,
          sessions: [
            {
              id: "rec-1",
              agentId: "1001",
              agentName: "Sana Iqbal",
              customerNumber: "+923001234567",
              agentExtension: "1001",
              queueName: "Customer support",
              sessionStartTime: "2026-10-01 09:15:00",
              sessionEndTime: "2026-10-01 09:18:00",
              duration: 180,
              holdTime: 20,
              wrapupCode: "Resolved",
              direction: "INBOUND",
              callVariable1: "Case 1042",
              screenRecordingUrl: "/vrs/recording/screen/rec-1",
            },
            {
              id: "rec-2",
              agentId: "1002",
              agentName: "Omar Khan",
              customerNumber: "+923001234567",
              agentExtension: "1002",
              queueName: "Customer support",
              sessionStartTime: "2026-10-01 09:18:00",
              duration: 90,
              holdTime: 0,
              lastPlayedBy: "supervisor",
            },
          ],
        },
        {
          id: "rec-3",
          agentName: "Sana Iqbal",
          customerNumber: "+923009876543",
          agentExtension: "1001",
          duration: 60,
          isArchived: true,
        },
      ],
    }),
  ),
  http.get("*/vrs/archival-setting", ({ request }) => {
    const tenant = new URL(request.url).searchParams.get("tenantId") ?? "singleton";
    const setting = mockDb.archival.get(tenant);
    return setting
      ? HttpResponse.json(setting)
      : HttpResponse.json({ message: "Setting not found" }, { status: 404 });
  }),
  http.post("*/vrs/archival-setting", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const setting = { ...body, id: mockDb.archival.size + 1 };
    mockDb.archival.set(String(body.tenantId ?? "singleton"), setting);
    return HttpResponse.json(setting);
  }),
  http.put("*/vrs/archival-setting/:id", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    mockDb.archival.set(String(body.tenantId ?? "singleton"), { ...body, id: Number(params.id) });
    return new HttpResponse("ok");
  }),
  // Like cim-customer: a user without a saved layout gets 404 NOT_FOUND.
  http.get("*/dashboard/layout/:id", ({ params }) => {
    const layout = mockDb.dashboards.get(String(params.id));
    return layout
      ? HttpResponse.json({ layout })
      : HttpResponse.json(
          { error: { code: "NOT_FOUND", msg: "No dashboard layout saved for this user" } },
          { status: 404 },
        );
  }),
  http.post("*/dashboard/layout", async ({ request }) => {
    const body = (await request.json()) as { user_Id: string; layout: unknown };
    mockDb.dashboards.set(body.user_Id, body.layout);
    return HttpResponse.json(body);
  }),
  http.get("*/queue-stats/queues", () =>
    HttpResponse.json([{ queueId: "q-1", queueName: "Customer support" }]),
  ),
  http.get("*/mrd-stats", () => HttpResponse.json([{ mrdId: "mrd-1", mrdName: "Chat", ready: 3, busy: 5 }])),
  http.get("*/media-routing-domains", () =>
    HttpResponse.json([
      { id: "mrd-chat", name: "Chat" },
      { id: "mrd-voice", name: "CX Voice" },
    ]),
  ),
  http.post("*/agent-activity/detail", () =>
    HttpResponse.json({
      agents: [
        {
          id: "u-agent-1",
          name: "Sana Iqbal",
          state: "READY",
          activeChatsCount: 2,
          mrds: [
            { id: "mrd-chat", state: "READY" },
            { id: "mrd-voice", state: "NOT_READY" },
          ],
        },
        {
          id: "u-agent-2",
          name: "Hamza Ali",
          state: "NOT_READY",
          activeChatsCount: 0,
          mrds: [
            { id: "mrd-chat", state: "NOT_READY" },
            { id: "mrd-voice", state: "NOT_READY" },
          ],
        },
        {
          id: "u-agent-3",
          name: "Zara Noor",
          state: "READY",
          activeChatsCount: 1,
          mrds: [
            { id: "mrd-chat", state: "RESERVED" },
            { id: "mrd-voice", state: "READY" },
          ],
        },
      ],
    }),
  ),
  http.get("*/bot-active-chats/detail", () =>
    HttpResponse.json([{ botId: "bot-1", botName: "Help assistant" }]),
  ),
  http.post("*/historical-stats/queue/sla/average", () => HttpResponse.json({ data: { sla: 87.5 } })),
  http.get("*/historical-stats/agent/agent-metric-summary", () =>
    HttpResponse.json({
      agentName: "Sana Iqbal",
      callsHandled: 14,
      rona: 1,
      slaBreach: 0,
      averageWrapUpTime: 32,
    }),
  ),
  // Like realtime-reports: "no data yet" is a 404 with an empty body.
  http.post("*/historical-stats/queue/abandoned-ratio-summary", () => HttpResponse.json([], { status: 404 })),
  // --- agent-manager auth
  http.post("*/agent/login", async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username ?? "agent";
    if (body.password === "wrong") {
      return HttpResponse.json({ error: { error_message: "Invalid user credentials" } }, { status: 401 });
    }
    if (body.password === "expired") {
      return HttpResponse.json(
        {
          error: {
            error_message: "Password update required",
            error_detail: { reason: "Password update required" },
          },
        },
        { status: 400 },
      );
    }
    const entry = MOCK_USERS[username];
    if (entry?.twoFA) {
      return HttpResponse.json({
        data: {
          ...loginResponse(username).data,
          is2FAEnabled: true,
          twoFAChannel: entry.twoFA.toUpperCase(),
          is2FARegistered: true,
        },
      });
    }
    return HttpResponse.json(loginResponse(username));
  }),
  http.post("*/agent/validate-otp", async ({ request }) => {
    const body = (await request.json()) as { username: string; otpToValidate: string };
    if (body.otpToValidate !== "123456") return HttpResponse.json({ error: "Invalid OTP" }, { status: 401 });
    return HttpResponse.json({ statusCode: 200, ...loginResponse(body.username) });
  }),
  http.post("*/agent/register-2FA", () => HttpResponse.json({ statusCode: 200 })),
  http.post("*/agent/resendOTP", () => HttpResponse.json({ statusCode: 200 })),
  http.post("*/agent/refresh-token", async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string };
    const username = refreshToken?.replace(/^refresh-/, "") ?? "agent";
    return HttpResponse.json({ data: { access_token: mockUserJwt(username) } });
  }),
  http.get("*/agent/pswd-policies", () =>
    HttpResponse.json({
      data: {
        policies: [
          { type: "length", value: "8" },
          { type: "upperCase", value: "1" },
          { type: "digits", value: "1" },
          { type: "specialChars", value: "1" },
          { type: "notUsername", value: "" },
          { type: "passwordHistory", value: "3" },
        ],
      },
    }),
  ),
  http.post("*/agent/reset-pswd", () => new HttpResponse("ok", { status: 200 })),

  // --- unified-admin
  http.get("*/agent-desk-settings", () => HttpResponse.json([mockDb.deskSettings])),
  http.put("*/agent-desk-settings", async ({ request }) => {
    const body = (await request.json()) as typeof mockDb.deskSettings;
    mockDb.deskSettings = { ...mockDb.deskSettings, ...body };
    return HttpResponse.json(mockDb.deskSettings);
  }),
  http.get("*/locale-setting", () => HttpResponse.json([mockDb.localeSetting])),
  http.post("*/locale-setting", async ({ request }) => {
    mockDb.localeSetting = { ...((await request.json()) as typeof mockDb.localeSetting), id: "loc-new" };
    return HttpResponse.json(mockDb.localeSetting);
  }),
  http.put("*/locale-setting", async ({ request }) => {
    mockDb.localeSetting = { ...mockDb.localeSetting, ...((await request.json()) as object) };
    return HttpResponse.json(mockDb.localeSetting);
  }),

  // --- unified-admin teams and QM questionnaires (forms)
  http.get("*/users/:role", ({ params, request }) => {
    const role = String(params.role);
    const username = new URL(request.url).searchParams.get("username")?.toLowerCase() ?? "";
    const docs = mockDb.directory.filter((user) => {
      const matches =
        role === "agent"
          ? user.roles.some((item) => item === "agent" || item === "supervisor")
          : user.roles.includes(role);
      return matches && user.username.toLowerCase().includes(username);
    });
    return HttpResponse.json({ docs, totalDocs: docs.length, totalPages: 1 });
  }),
  http.get("*/team/:teamId/member", ({ params, request }) => {
    const type = new URL(request.url).searchParams.get("type");
    const docs = mockDb.teamMembers
      .filter((member) => member.teamId === params.teamId && (!type || member.type === type))
      .flatMap((member) => {
        const user = mockDb.directory.find((person) => person.username === member.username);
        return user ? [{ type: member.type, user }] : [];
      });
    return HttpResponse.json({ docs, totalDocs: docs.length, totalPages: 1 });
  }),
  http.post("*/team/:teamId/member", async ({ params, request }) => {
    const body = (await request.json()) as { type: "agent" | "secondary-supervisor"; usernames: string[] };
    for (const username of body.usernames) {
      if (
        !mockDb.teamMembers.some(
          (member) =>
            member.teamId === params.teamId && member.username === username && member.type === body.type,
        )
      ) {
        mockDb.teamMembers.push({ teamId: String(params.teamId), type: body.type, username });
      }
    }
    return HttpResponse.json({ ok: true });
  }),
  http.delete("*/team/:teamId/member", ({ params, request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const usernames = new Set((url.searchParams.get("usernames") ?? "").split(",").filter(Boolean));
    mockDb.teamMembers = mockDb.teamMembers.filter(
      (member) => member.teamId !== params.teamId || member.type !== type || !usernames.has(member.username),
    );
    return HttpResponse.json({ ok: true });
  }),
  http.get("*/team", ({ request }) => {
    const ids = new URL(request.url).searchParams.get("ids");
    const allowed = ids ? new Set(ids.split(",")) : null;
    return HttpResponse.json(
      mockDb.teams.filter((team) => !team.isDeleted && (!allowed || allowed.has(team.team_Id))),
    );
  }),
  http.post("*/team", async ({ request }) => {
    const body = (await request.json()) as {
      team_name: string;
      description?: string;
      supervisor_Id?: string | null;
      source?: string;
      created_by?: string;
    };
    if (
      mockDb.teams.some(
        (team) => !team.isDeleted && team.team_name.toLowerCase() === body.team_name.trim().toLowerCase(),
      )
    ) {
      return HttpResponse.json({ message: "Team name already exists" }, { status: 409 });
    }
    const team = {
      team_Id: `team-${mockDb.teams.length + 1}`,
      team_name: body.team_name.trim(),
      description: body.description ?? "",
      supervisor_Id: body.supervisor_Id || null,
      supervisor: mockDb.directory.find((user) => user.id === body.supervisor_Id) ?? null,
      source: body.source ?? "CX",
      created_by: body.created_by,
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };
    mockDb.teams.push(team);
    return HttpResponse.json(team);
  }),
  http.put("*/team/:teamId", async ({ params, request }) => {
    const body = (await request.json()) as {
      team_name: string;
      description?: string;
      supervisor_Id?: string | null;
    };
    const team = mockDb.teams.find((row) => row.team_Id === params.teamId);
    if (!team) return HttpResponse.json({ message: "Team not found" }, { status: 404 });
    team.team_name = body.team_name.trim();
    team.description = body.description ?? "";
    team.supervisor_Id = body.supervisor_Id || null;
    team.supervisor = mockDb.directory.find((user) => user.id === body.supervisor_Id) ?? null;
    return HttpResponse.json(team);
  }),
  http.delete("*/team/:teamId", ({ params }) => {
    mockDb.teams = mockDb.teams.filter((team) => team.team_Id !== params.teamId);
    mockDb.teamMembers = mockDb.teamMembers.filter((member) => member.teamId !== params.teamId);
    return HttpResponse.json({ ok: true });
  }),
  http.get("*/forms/:id", ({ params }) => {
    const form = mockDb.qmModels.find((row) => row.id === params.id && !row.isDeleted);
    return form ? HttpResponse.json(form) : HttpResponse.json({ message: "Not Found" }, { status: 404 });
  }),
  http.get("*/forms", () =>
    HttpResponse.json(
      mockDb.qmModels
        .filter((row) => !row.isDeleted)
        .map((row) => ({
          id: row.id,
          formTitle: row.formTitle,
          formDescription: row.formDescription,
          state: row.state,
          enableWeightage: row.enableWeightage,
          updatedAt: row.updatedAt,
        })),
    ),
  ),
  http.post("*/forms", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const title = String(body.formTitle ?? "");
    if (
      mockDb.qmModels.some((row) => !row.isDeleted && row.formTitle.toLowerCase() === title.toLowerCase())
    ) {
      return HttpResponse.json({ message: "Form title already exists" }, { status: 409 });
    }
    const form = {
      ...body,
      id: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
      isDeleted: false,
      updatedAt: new Date().toISOString(),
    };
    mockDb.qmModels.push(form as (typeof mockDb.qmModels)[number]);
    return HttpResponse.json(form);
  }),
  http.put("*/forms", async ({ request }) => {
    const body = (await request.json()) as { id?: string; formTitle?: string };
    const form = mockDb.qmModels.find((row) => row.id === body.id);
    if (!form) return HttpResponse.json({ message: "Not Found" }, { status: 404 });
    Object.assign(form, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(form);
  }),
  http.delete("*/forms/:id", ({ params }) => {
    const form = mockDb.qmModels.find((row) => row.id === params.id);
    if (form) form.isDeleted = true;
    return HttpResponse.json({ ok: true });
  }),

  // --- file engine
  http.get("*/api/getTenantLogo", () => new HttpResponse(null, { status: 404 })),
  http.get("*/api/i18n/translations", ({ request }) => {
    // The agent app asks with ?locale=… and gets bundled files as fallback; the admin
    // Translations screen asks without a locale and edits mockDb.translations.
    if (new URL(request.url).searchParams.get("locale")) return HttpResponse.json({ translations: {} });
    return HttpResponse.json({ translations: mockDb.translations });
  }),
  http.put("*/api/i18n/translations", async ({ request }) => {
    const body = (await request.json()) as { locale: string; translations: Record<string, unknown> };
    mockDb.translations[body.locale] = body.translations;
    return HttpResponse.json({ ok: true });
  }),
  http.get("*/api/i18n/reference-translations", () =>
    HttpResponse.json({ translations: { en: MOCK_TRANSLATIONS.en } }),
  ),
  http.get("*/api/i18n/backup-translations", () => HttpResponse.json({ translations: MOCK_TRANSLATIONS })),
  http.post("*/api/i18n/backup-translations/restore", async ({ request }) => {
    const { locale } = (await request.json()) as { locale: string };
    mockDb.translations[locale] = structuredClone(MOCK_TRANSLATIONS[locale] ?? {});
    return HttpResponse.json({ ok: true });
  }),

  // --- unified-admin reason codes: why an agent goes Not Ready or logs out
  http.get("*/reasons", () =>
    HttpResponse.json([
      { id: "reason-break", name: "Break", type: "NOT_READY", code: 1 },
      { id: "reason-lunch", name: "Lunch", type: "NOT_READY", code: 2 },
      { id: "reason-meeting", name: "Meeting", type: "NOT_READY", code: 3 },
      { id: "reason-training", name: "Training", type: "NOT_READY", code: 4 },
      { id: "reason-shift-end", name: "End of shift", type: "LOGOUT", code: 11 },
      { id: "reason-tech", name: "Technical issue", type: "LOGOUT", code: 12 },
    ]),
  ),

  // --- knowledge base (the URL in the mock desk settings): a short answer, and a long one for returns
  http.post("https://kb.example.com/query", async ({ request }) => {
    const { query } = (await request.json()) as { query?: string };
    const asked = (query ?? "").toLowerCase();
    if (/refund|return|exchange/.test(asked))
      return HttpResponse.json({
        answer:
          "Customers can return most items within 30 days of delivery for a full refund.\n\nTo start a return:\n1. Ask for the order number and the email used at checkout.\n2. Confirm the item is unused and in its original packaging.\n3. Create a return label from the Orders page and email it to the customer.\n\nRefunds are issued to the original payment method within 5 to 7 business days of the parcel arriving at the warehouse. Gift purchases are refunded as store credit unless the buyer is the one asking.\n\nItems that cannot be returned: opened software, personalised products, perishable goods and gift cards. If the item arrived damaged, skip the 30 day check and offer a free replacement or a refund straight away, and ask for a photo of the damage for the claim.\n\nFor orders over 500 USD, a supervisor must approve the refund before the label is created.",
        sources: [
          {
            title: "Returns and refunds policy",
            url: "https://kb.example.com/articles/returns",
            score: 0.94,
          },
          {
            title: "Damaged items checklist",
            url: "https://kb.example.com/articles/damaged-items",
            score: 0.81,
          },
          {
            title: "Refund approval limits",
            url: "https://kb.example.com/articles/refund-approvals",
            score: 0.72,
          },
        ],
      });
    if (/deliver|shipping|track/.test(asked))
      return HttpResponse.json({
        answer:
          "Standard delivery takes 3 to 5 business days and express takes 1 to 2. The tracking link is in the dispatch email and under Orders in the customer's account.",
        sources: [{ title: "Delivery times", url: "https://kb.example.com/articles/delivery", score: 0.9 }],
      });
    return HttpResponse.json({
      answer: `Here is what the knowledge base says about "${query ?? ""}": check the customer's plan and account status first, then follow the standard troubleshooting steps before escalating.`,
      sources: [{ title: "Support handbook", url: "https://kb.example.com/articles/handbook", score: 0.6 }],
    });
  }),

  // --- composer helpers: AI text refine (LLM connector) and the agent's quick replies (cim-customer)
  http.post("*/refine-text", async ({ request }) => {
    const { text } = (await request.json()) as { text?: string };
    await delay(900);
    return HttpResponse.json({ status: 200, data: { text: refineDemoText(text ?? "") } });
  }),
  http.get("*/quick-replies", ({ request }) => {
    const userId = new URL(request.url).searchParams.get("user_Id") ?? "";
    // Every agent starts with the same demo set, kept for the rest of the session once saved.
    const doc = mockDb.quickReplies.get(userId) ?? {
      _id: `quick-replies-${userId}`,
      user_Id: userId,
      quickReplies: demoQuickReplies(),
    };
    mockDb.quickReplies.set(userId, doc);
    return HttpResponse.json([doc]);
  }),
  http.post("*/quick-replies", async ({ request }) => {
    const body = (await request.json()) as { user_Id: string; quickReplies: QuickReplyDoc[] };
    const doc = { _id: `quick-replies-${body.user_Id}`, ...body };
    mockDb.quickReplies.set(body.user_Id, doc);
    return HttpResponse.json(doc);
  }),
  http.put("*/quick-replies/:id", async ({ request, params }) => {
    const body = (await request.json()) as { user_Id: string; quickReplies: QuickReplyDoc[] };
    const doc = { _id: String(params.id), ...body };
    mockDb.quickReplies.set(body.user_Id, doc);
    return HttpResponse.json(doc);
  }),

  // --- cim-customer agent preferences
  http.get("*/agentSetting", ({ request }) => {
    const userId = new URL(request.url).searchParams.get("user_Id") ?? "";
    const prefs = mockDb.preferences.get(userId) ??
      readSavedPreferences(userId) ?? {
        _id: `pref-${userId}`,
        user_Id: userId,
        // A "system" default would follow a dark OS and override the light theme. The mock desk stays light.
        theme: "light",
        language: "en",
      };
    mockDb.preferences.set(userId, prefs);
    return HttpResponse.json(prefs);
  }),
  http.put("*/agentSetting/:id", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.user_Id === "string") {
      mockDb.preferences.set(body.user_Id, body);
      savePreferences(body.user_Id, body);
    }
    return HttpResponse.json(body);
  }),
];
