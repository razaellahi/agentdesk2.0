import { demoLabelsOf } from "./demoLabels";
import { minutesAgo } from "./demoTime";

interface Agent {
  id: string;
  username: string;
}

type Who = "C" | "A" | "B" | "W";
type Body = Record<string, unknown>;

/** One thing said in a chat: C customer, A the agent, B a bot, W a supervisor whispering to the agent. */
interface Line {
  who: Who;
  /** Minutes ago. */
  ago: number;
  body: Body;
  /** Lets a later line refer to this one (a reply, an edit, a delivery receipt). */
  id?: string;
  header?: Body;
}

/** Something that happens around the conversation rather than in it. */
interface Happening {
  ago: number;
  name: string;
  data: unknown;
  id?: string;
}

interface Chat {
  id: string;
  channelType: string;
  channelName: string;
  /** What the customer is known by on this channel (number, handle, visitor id). */
  identifier: string;
  customer: Record<string, unknown>;
  name: string;
  lines: Line[];
  happenings?: Happening[];
  /** Other agents in the conversation, besides the demo agent. */
  agents?: { role: string; id: string; username: string; firstName: string; lastName: string }[];
  additionalAttributes?: { key?: string; type?: string; value?: unknown }[];
}

const text = (markdownText: string): Body => ({ type: "PLAIN", markdownText });

/** A file the mock file endpoint serves (see demoFiles.ts). */
const fileUrl = (filename: string) => `https://files.mock.test/api/downloadFileStream?filename=${filename}`;
const attachment = (
  filename: string,
  mimeType: string,
  size: number,
  name: string,
  caption?: string,
): Body => ({
  attachment: { mediaUrl: fileUrl(filename), mimeType, size },
  additionalDetails: { fileName: name },
  ...(caption ? { caption } : {}),
});

const sessionStarted = (ago: number, session: unknown): Happening => ({
  ago,
  name: "CHANNEL_SESSION_STARTED",
  data: session,
});

/** The same people as the mock phonebook, so Customer Info and their cases line up. */
const CHATS: Chat[] = [
  {
    id: "live-amina",
    channelType: "WHATSAPP",
    channelName: "WhatsApp Support",
    identifier: "+923001112233",
    name: "Amina",
    customer: {
      _id: "customer-amina",
      firstName: "Amina",
      lastName: "Raza",
      voice: "+923001112233",
      whatsapp: "+923001112233",
      email: "amina@example.com",
      facebook: "amina.raza.official",
      instagram: "@amina.raza",
      web: "visitor-9c41",
      labels: demoLabelsOf("customer-amina"),
    },
    lines: [
      { who: "C", ago: 20, body: text("Hi, I bought a blender two weeks ago and the jar arrived cracked.") },
      {
        who: "C",
        ago: 19,
        id: "amina-photo",
        body: {
          type: "IMAGE",
          ...attachment(
            "demo-cracked-jar.svg",
            "image/svg+xml",
            18_400,
            "cracked-jar.svg",
            "This is how it arrived",
          ),
        },
      },
      {
        who: "A",
        ago: 18,
        id: "amina-typo",
        body: text("Hello Amina, I am sorry about that. Let me chek your order."),
      },
      {
        who: "A",
        ago: 17.5,
        header: { intent: "UPDATE", originalMessageId: "amina-typo" },
        body: text("Hello Amina, I am sorry about that. Let me check your order."),
      },
      {
        who: "C",
        ago: 16,
        body: {
          type: "FILE",
          ...attachment("demo-invoice-1042.pdf", "application/pdf", 86_016, "Invoice-1042.pdf"),
        },
      },
      {
        who: "A",
        ago: 15.6,
        body: {
          type: "FILE",
          ...attachment(
            "demo-return-form.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            31_744,
            "Return-form.docx",
          ),
        },
      },
      {
        who: "C",
        ago: 15.3,
        body: {
          type: "FILE",
          ...attachment(
            "demo-order-history.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            218_112,
            "Order-history.xlsx",
          ),
        },
      },
      {
        who: "C",
        ago: 15.1,
        body: {
          type: "FILE",
          ...attachment("demo-damage-photos.zip", "application/zip", 4_718_592, "Damage-photos.zip"),
        },
      },
      {
        who: "C",
        ago: 15,
        body: { type: "AUDIO", ...attachment("vm-demo-note.wav", "audio/wav", 64_000, "Voice message") },
      },
      {
        who: "A",
        ago: 14,
        id: "amina-reply",
        header: { intent: "REPLY_TO", originalMessageId: "amina-photo" },
        body: text("Thanks for the photo, that is clearly damaged. Your order was *delivered* on the 3rd."),
      },
      {
        who: "C",
        ago: 12,
        body: {
          type: "LOCATION",
          location: { name: "Delivery address, Gulberg III, Lahore", latitude: 31.5204, longitude: 74.3587 },
        },
      },
      {
        who: "C",
        ago: 11,
        body: {
          type: "CONTACT",
          contact: { name: "Zainab Raza", phone: "+923001119999" },
          markdownText: "My sister can collect the replacement",
        },
      },
      {
        who: "A",
        ago: 10,
        id: "amina-label",
        body: text("Here is your prepaid return label, please print it."),
      },
      {
        who: "C",
        ago: 9,
        id: "amina-last",
        body: text("Can I still return it for a refund? And how long will the refund take?"),
      },
    ],
    happenings: [
      sessionStarted(20.5, "session"),
      // The customer has read the agent's reply; the return label never reached her.
      {
        ago: 13,
        name: "MESSAGE_DELIVERY_NOTIFICATION",
        data: {
          header: { sender: { type: "CUSTOMER", id: "customer-amina" } },
          body: { status: "READ", messageId: "amina-reply" },
        },
      },
      {
        ago: 9.8,
        name: "MESSAGE_DELIVERY_NOTIFICATION",
        data: {
          header: { sender: { type: "SYSTEM" } },
          body: { status: "FAILED", messageId: "amina-label" },
        },
      },
      {
        ago: 8.9,
        name: "BOT_SUGGESTION",
        data: {
          requestedMessage: { id: "amina-last" },
          suggestions: [
            {
              confidenceLevel: 0.94,
              messageBody: {
                markdownText:
                  "Yes, you can return it within 30 days of delivery for a full refund. Refunds reach the original payment method within 5 to 7 business days.",
              },
            },
            {
              confidenceLevel: 0.81,
              messageBody: {
                markdownText:
                  "Because the jar arrived damaged, I can also send a free replacement. Which would you prefer?",
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: "live-bilal",
    channelType: "WEB",
    channelName: "Website chat",
    identifier: "visitor-bilal-31",
    agents: [{ role: "WHISPER", id: "u-sup-1", username: "supervisor", firstName: "Omar", lastName: "Khan" }],
    name: "Bilal",
    customer: {
      _id: "customer-bilal",
      firstName: "Bilal",
      lastName: "Ahmed",
      voice: "+923004445566",
      whatsapp: "+923009998877",
      facebook: "bilal.ahmed.77",
      labels: demoLabelsOf("customer-bilal"),
    },
    additionalAttributes: [
      {
        type: "webChannelData",
        value: {
          browserDeviceInfo: { deviceType: "desktop", browserName: "Chrome" },
          locale: { country: "Pakistan", language: "en-GB" },
          formData: { attributes: [{ key: "Order number", value: "A-1042" }] },
        },
      },
    ],
    lines: [
      {
        who: "B",
        ago: 8,
        body: text("Hi! I'm Aria, the virtual assistant. What can I help you with today?"),
      },
      {
        who: "B",
        ago: 7.9,
        body: {
          type: "BUTTON",
          markdownText: "Choose an option",
          buttons: [
            { id: "b1", title: "Track my order", type: "postback", payload: "track", isSelected: true },
            { id: "b2", title: "Returns and refunds", type: "postback", payload: "returns" },
            { id: "b3", title: "Talk to an agent", type: "postback", payload: "agent" },
          ],
        },
      },
      { who: "C", ago: 7.8, body: text("Track my order") },
      {
        who: "C",
        ago: 7.6,
        body: {
          type: "FORM_DATA",
          formTitle: "Order details",
          formDescription: "Pre-chat form",
          sections: [
            {
              sectionName: "Order",
              attributes: [
                { label: "Order number", attributeType: "TEXT", valueType: "string", answer: ["A-1042"] },
                { label: "Email", attributeType: "TEXT", valueType: "string", answer: ["bilal@example.com"] },
                {
                  label: "Issue type",
                  attributeType: "OPTIONS",
                  answer: [
                    { label: "Delivery delay", isSelected: true },
                    { label: "Damaged item", isSelected: false },
                  ],
                },
                {
                  label: "Preferred contact",
                  attributeType: "TEXT",
                  valueType: "string",
                  answer: ["WhatsApp"],
                },
              ],
            },
          ],
        },
      },
      {
        who: "B",
        ago: 7.3,
        body: {
          type: "LIST",
          markdownText: "I found your order. What would you like to see?",
          additionalDetails: {
            interactive: {
              header: { text: "Order A-1042" },
              body: { text: "I found your order. What would you like to see?" },
              footer: { text: "Choose one to continue" },
              action: {
                sections: [
                  {
                    title: "Order",
                    rows: [
                      { id: "r1", title: "Tracking status", description: "Where your parcel is now" },
                      { id: "r2", title: "Delivery address", description: "Change where it goes" },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        who: "C",
        ago: 7,
        body: {
          type: "URL",
          markdownText: "This is the tracking page I am looking at",
          mediaUrl: "https://track.example.com/orders/A-1042",
        },
      },
      {
        who: "W",
        ago: 6.5,
        body: text(
          "Supervisor: offer free express shipping if he asks again, the parcel is already 3 days late.",
        ),
      },
      {
        who: "C",
        ago: 6,
        body: text("Hello, where is my order A-1042? The tracking page has not changed since Monday."),
      },
      { who: "C", ago: 5, body: text("How many days does delivery usually take?") },
    ],
    happenings: [
      sessionStarted(8.2, "session"),
      {
        ago: 8.1,
        name: "AGENT_SUBSCRIBED",
        data: "agent",
      },
      {
        ago: 6.8,
        name: "CONVERSATION_DATA_CHANGED",
        data: [
          { key: "CUSTOMER_SENTIMENTS", value: "negative" },
          { key: "ORDER_ID", value: "A-1042" },
          {
            key: "CONVERSATION_SUMMARY",
            value: JSON.stringify({
              heading: "Summary",
              content: "Customer is waiting on order A-1042, which has not moved for three days.",
            }),
          },
        ],
      },
    ],
  },
  {
    id: "live-fatima",
    channelType: "FACEBOOK",
    channelName: "Facebook Page",
    identifier: "fatima.noor.9",
    name: "Fatima",
    customer: {
      _id: "customer-fatima",
      firstName: "Fatima",
      lastName: "Noor",
      voice: "+971501234567",
      email: "fatima.noor@example.com",
      facebook: "fatima.noor.9",
      instagram: "@fatima.noor",
      labels: demoLabelsOf("customer-fatima"),
    },
    lines: [
      {
        who: "C",
        ago: 4,
        body: {
          type: "STICKER",
          ...attachment("demo-sticker-thanks.svg", "image/svg+xml", 2_400, "sticker"),
        },
      },
      {
        who: "B",
        ago: 3.6,
        body: {
          type: "CAROUSEL",
          markdownText: "Here is our blender range",
          elements: [
            ["blender-pro", "Blender Pro", "1200 W, 2 L jar, 8 speeds"],
            ["blender-mini", "Blender Mini", "Personal size, 600 W, 2 cups"],
            ["blender-max", "Blender Max", "1800 W, 3 L jar, self-cleaning"],
          ].map(([slug, title, detail]) => ({
            text: detail,
            additionalCarouselElementDetails: {
              id: slug,
              title,
              image_url: fileUrl(`demo-${slug}.svg`),
            },
            buttons: [
              {
                id: `${slug}-view`,
                title: "View details",
                type: "linkButton",
                url: `https://shop.example.com/${slug}`,
              },
              {
                id: `${slug}-warranty`,
                title: "Warranty terms",
                type: "postback",
                payload: `warranty-${slug}`,
              },
            ],
          })),
        },
      },
      { who: "C", ago: 3, body: text("Hi! Do you have the warranty terms for the blender range?") },
    ],
    happenings: [sessionStarted(4.2, "session")],
  },
];

/** What the agent-manager sends on login: three chats already assigned to the agent. */
export function demoLiveConversations(agent: Agent): Record<string, unknown>[] {
  return CHATS.map((chat) => {
    const session = {
      id: `${chat.id}-session`,
      channel: {
        id: `${chat.channelType.toLowerCase()}-channel`,
        name: chat.channelName,
        channelType: { name: chat.channelType },
      },
      channelData: {
        channelCustomerIdentifier: chat.identifier,
        serviceIdentifier: "support",
        ...(chat.additionalAttributes ? { additionalAttributes: chat.additionalAttributes } : {}),
      },
    };
    const customerRef = { _id: chat.customer._id as string, firstName: chat.name };
    const senders: Record<Who, Body> = {
      C: { id: customerRef._id, type: "CUSTOMER", senderName: chat.name },
      A: { id: agent.id, type: "AGENT", senderName: agent.username },
      B: { id: "bot-aria", type: "BOT", senderName: "Aria" },
      W: { id: "u-sup-1", type: "AGENT", senderName: "Omar Khan" },
    };
    const eventNames: Record<Who, string> = {
      C: "CUSTOMER_MESSAGE",
      A: "AGENT_MESSAGE",
      B: "BOT_MESSAGE",
      W: "WHISPER_MESSAGE",
    };
    const messages = chat.lines.map((line, index) => {
      const timestamp = minutesAgo(line.ago);
      return {
        id: `${chat.id}-event-${index}`,
        name: eventNames[line.who],
        timestamp,
        channelSession: session,
        data: {
          id: line.id ?? `${chat.id}-message-${index}`,
          header: {
            timestamp,
            sender: senders[line.who],
            customer: customerRef,
            ...line.header,
          },
          body: line.body,
        },
      };
    });
    const around = (chat.happenings ?? []).map((happening, index) => ({
      id: `${chat.id}-happening-${index}`,
      name: happening.name,
      timestamp: minutesAgo(happening.ago),
      channelSession: session,
      // A session event carries the session itself, and an agent event the logged-in agent.
      data:
        happening.data === "session"
          ? session
          : happening.data === "agent"
            ? {
                agentParticipant: {
                  role: "PRIMARY",
                  participant: { keycloakUser: { id: agent.id, username: agent.username } },
                },
              }
            : happening.data,
    }));
    const topicEvents = [...messages, ...around].sort((a, b) => a.timestamp - b.timestamp);
    return {
      conversationId: chat.id,
      roomInfo: { id: `room-${chat.id}` },
      taskId: `task-${chat.id}`,
      topicData: {
        customer: chat.customer,
        channelSession: session,
        topicEvents,
        participants: [
          { type: "CUSTOMER", participant: session },
          ...(chat.agents ?? []).map((other) => ({
            type: "AGENT",
            role: other.role,
            participant: {
              id: other.id,
              keycloakUser: {
                id: other.id,
                username: other.username,
                firstName: other.firstName,
                lastName: other.lastName,
              },
            },
          })),
        ],
        topicParticipant: {
          id: `participant-${chat.id}`,
          type: "AGENT",
          participant: {
            id: agent.id,
            participantType: "CCUser",
            keycloakUser: { id: agent.id, username: agent.username },
          },
          token: null,
          conversationId: chat.id,
          role: "PRIMARY",
          userCredentials: null,
          state: "SUBSCRIBED",
        },
      },
    };
  });
}
