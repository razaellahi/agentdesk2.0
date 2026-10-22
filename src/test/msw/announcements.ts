import { DEMO_DATA } from "./demoLabels";

/** Team announcements and QM notifications for `pnpm mock`; e2e starts with none. */
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const announcements = DEMO_DATA
  ? [
      {
        id: "announcement-holiday",
        announcementText:
          "Public holiday on Friday: the queue closes at 4 pm. Please wrap up open chats by then.",
        scheduledTime: minutesAgo(45),
        status: "active",
        supervisorId: "u-supervisor-1",
        seenBy: [] as string[],
      },
      {
        id: "announcement-kb",
        announcementText: "The refund policy article in the knowledge base was updated this morning.",
        scheduledTime: minutesAgo(240),
        status: "active",
        supervisorId: "u-supervisor-1",
        seenBy: [] as string[],
      },
    ]
  : [];

/** A review of a past conversation with Hassan Mirza, as the QM service reports it. */
export const QM_DEMO_CONVERSATION = "qm-conversation-hassan";

const qmNotifications = DEMO_DATA
  ? [
      {
        id: "qm-review-hassan",
        message: "Your conversation with Hassan Mirza was evaluated: 92% on the Service quality form.",
        created_at: minutesAgo(20),
        is_read: false,
        type: "EVALUATION",
        metadata: { conversationId: QM_DEMO_CONVERSATION },
      },
    ]
  : [];

export function listAnnouncements() {
  return announcements;
}

export function markAnnouncementSeen(id: string, userId: string) {
  const row = announcements.find((item) => item.id === id);
  if (row && !row.seenBy.includes(userId)) row.seenBy.push(userId);
  return { result: row ?? null };
}

export function qmNotificationPage() {
  return { docs: qmNotifications, page: 1, totalPages: 1 };
}

export function markQmNotificationRead(id: string) {
  const row = qmNotifications.find((item) => item.id === id);
  if (row) row.is_read = true;
  return { status: 200 };
}

/** The reviewed conversation's activities: its channel session ended with the customer on it. */
export function qmConversationActivities() {
  const customer = { _id: "customer-hassan", firstName: "Hassan", lastName: "Mirza" };
  return {
    docs: [
      {
        id: "qm-hassan-ended",
        name: "CHANNEL_SESSION_ENDED",
        timestamp: Date.now() - 3 * 86_400_000,
        channelSession: { id: "qm-hassan-session", customer, channel: { channelType: { name: "WHATSAPP" } } },
        data: {},
      },
    ],
  };
}
