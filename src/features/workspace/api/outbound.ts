import { getConfig } from "@/config";
import { ccmApi, cimCustomerApi, unifiedAdminApi } from "@/core/api";
import { can, getSession } from "@/core/auth";
import { getDeskSettings } from "@/core/agent-settings";
import { formatSmsNumber, validSmsNumber } from "../model/outbound";
import { sendOutboundSms } from "../api";
import { useSchemaStore } from "../store/schemaStore";

const OPT_OUT_ID = "opt-out";

export interface OutboundChannel {
  id?: string;
  serviceIdentifier?: string;
  channelType?: { id?: string; name?: string };
  name?: string;
  defaultOutbound?: boolean;
}

export async function getDefaultOutboundChannel(channelTypeId: string) {
  return ccmApi.get<OutboundChannel>("/channels/defaultoutbound", {
    searchParams: { channelTypeId },
  });
}

export async function getConfiguredChannels(channelTypeName: string) {
  const teamId = getSession().user?.userTeam?.teamId;
  const body = await ccmApi.get<OutboundChannel[] | { docs?: OutboundChannel[] }>("/channels", {
    searchParams: {
      channelTypeName,
      ...(teamId ? { teamId } : {}),
    },
  });
  return Array.isArray(body) ? body : (body?.docs ?? []);
}

/** Channels for a type plus the default From identifier (UA ChannelSelectionService). */
export async function getOutboundFromChannels(channelTypeName: string) {
  const types = useSchemaStore.getState().channelTypes;
  const type = types.find((item) => item.name?.toUpperCase() === channelTypeName.toUpperCase()) ?? {
    id: channelTypeName.toLowerCase(),
    name: channelTypeName,
  };
  const [channels, defaultChannel] = await Promise.all([
    getConfiguredChannels(type.name).catch(() => [] as OutboundChannel[]),
    type.id ? getDefaultOutboundChannel(type.id).catch(() => null) : Promise.resolve(null),
  ]);
  const filtered = channels.filter((channel) => {
    const name = channel.channelType?.name ?? "";
    return (
      Boolean(channel.serviceIdentifier?.trim()) && (!name || name.toUpperCase() === type.name.toUpperCase())
    );
  });
  const defaultFromApi = defaultChannel?.serviceIdentifier ?? "";
  const flagged = filtered.find((channel) => channel.defaultOutbound);
  const selected =
    flagged?.serviceIdentifier ||
    (defaultFromApi && filtered.some((c) => c.serviceIdentifier === defaultFromApi) ? defaultFromApi : "") ||
    filtered[0]?.serviceIdentifier ||
    "";
  return {
    channels: filtered,
    selected,
    defaultId: flagged?.serviceIdentifier || defaultFromApi,
  };
}

export function channelDisplayLabel(channel: OutboundChannel) {
  const identifier = channel.serviceIdentifier || "";
  const name = channel.name?.trim();
  if (name && name !== identifier) return `${name} (${identifier})`;
  return identifier || name || "";
}

export async function checkDnc(payload: {
  identifierType: "PHONE" | "EMAIL";
  value: string;
  channel?: string;
}) {
  return unifiedAdminApi.post<{ blocked?: boolean; reason?: string }>("/compliance-dnc/check", payload);
}

/** Customer labels as a list: the server sends an array, but a lone label or nothing is tolerated. */
function labelList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === null || value === undefined || value === "" ? [] : [value];
}

export function hasOptOutLabel(customer: { labels?: unknown } | null | undefined) {
  return labelList(customer?.labels).some((label) => {
    if (typeof label === "string") return label.toLowerCase() === OPT_OUT_ID;
    if (label && typeof label === "object") {
      const row = label as { _id?: string; id?: string; name?: string };
      const id = String(row._id ?? row.id ?? "").toLowerCase();
      const name = String(row.name ?? "").toLowerCase();
      return id === OPT_OUT_ID || name === "opt out" || name === "opt-out";
    }
    return false;
  });
}

/** Opt-out label first, then unified-admin DNC list (UA OutboundComplianceService). */
export async function shouldBlockOutbound(input: {
  customer?: { labels?: unknown[] } | null;
  value: string;
  channel?: string;
  complianceEnabled?: boolean;
}) {
  if (hasOptOutLabel(input.customer)) return { blocked: true, reason: "OPT_OUT" as const };
  if (!input.complianceEnabled && !getConfig().isCallingComplianceEnabled) {
    return { blocked: false as const };
  }
  const value = input.value.trim();
  if (!value) return { blocked: false as const };
  const channel = (input.channel ?? "").toUpperCase();
  const map: Record<string, string> = {
    CX_VOICE: "VOICE",
    VOICE: "VOICE",
    PHONE: "PHONE",
    SMS: "SMS",
    WHATSAPP: "WHATSAPP",
    EMAIL: "EMAIL",
  };
  try {
    const result = await checkDnc({
      identifierType: channel === "EMAIL" ? "EMAIL" : "PHONE",
      value,
      ...(map[channel] ? { channel: map[channel] } : {}),
    });
    if (result?.blocked) return { blocked: true as const, reason: "DNC" as const };
    return { blocked: false as const };
  } catch {
    return { blocked: true as const, reason: "DNC_CHECK_FAILED" as const };
  }
}

export { sendOutboundSms };

/** Current develop outbound SMS contract; checks suppression, configured From and session ownership. */
export async function startOutboundSms(input: {
  destination: string;
  from: string;
  text: string;
  customer?: { labels?: unknown[]; [key: string]: unknown } | null;
}) {
  const user = getSession().user;
  const settings = getDeskSettings();
  if (!user || !can("agentSession") || !settings.outboundSms) throw new Error("Outbound SMS is unavailable.");
  const destination = formatSmsNumber(input.destination, settings.smsPrefixCode);
  if (!validSmsNumber(destination, settings.smsPrefixCode) || !input.text.trim())
    throw new Error("Enter a valid destination and message.");
  const channels = await getOutboundFromChannels("SMS");
  if (!input.from || !channels.channels.some((channel) => channel.serviceIdentifier === input.from))
    throw new Error("Choose a configured outbound From channel.");
  let customer = input.customer;
  if (!customer) {
    const page = await cimCustomerApi.get<{ docs?: { labels?: unknown[]; [key: string]: unknown }[] }>(
      "/customers",
      { searchParams: { paginateQuery: `phoneNumber:${destination}`, limit: 25, offset: 0 } },
    );
    if ((page.docs?.length ?? 0) > 1) throw new Error("Choose a matching customer before sending.");
    customer = page.docs?.[0];
  }
  const compliance = await shouldBlockOutbound({
    customer,
    value: destination,
    channel: "SMS",
    complianceEnabled: settings.callingCompliance,
  });
  if (compliance.blocked) throw new Error(`Outbound message blocked: ${compliance.reason}`);
  if (getSession().user?.id !== user.id || !can("agentSession") || !getDeskSettings().outboundSms)
    throw new Error("Your session changed. Try again.");
  return ccmApi.post("/message/receive", {
    id: crypto.randomUUID(),
    header: {
      channelData: {
        channelCustomerIdentifier: destination,
        serviceIdentifier: input.from,
        additionalAttributes: [{ key: "agentId", type: "String100", value: user.id }],
      },
      sender: { id: user.id, senderName: user.firstName ?? user.username, type: "AGENT" },
      language: {},
      timestamp: Date.now(),
      securityInfo: {},
      stamps: [],
      intent: "AGENT_OUTBOUND",
      entities: {},
      customer: customer ?? null,
    },
    body: { type: "PLAIN", markdownText: input.text.trim() },
  });
}

export class OutboundStartError extends Error {
  constructor(
    readonly code:
      "NO_IDENTIFIER" | "NO_CHANNEL_TYPE" | "NO_DEFAULT_CHANNEL" | "OPT_OUT" | "DNC" | "DNC_CHECK_FAILED",
  ) {
    super(code);
    this.name = "OutboundStartError";
  }
}

/**
 * Starts an empty AGENT_OUTBOUND conversation on a customer identifier through the
 * channel type's default outbound channel (unified-agent customer-info
 * startOutBoundConversation): compliance first, then CCM /message/receive.
 */
export async function startIdentifierConversation(input: {
  identifier: string;
  channelTypeName: string;
  customer?: { _id?: string; labels?: unknown[]; [key: string]: unknown } | null;
}) {
  const user = getSession().user;
  const identifier = input.identifier.trim();
  if (!user || !can("agentSession") || !can("initiateChat")) throw new Error("Not permitted");
  if (!identifier) throw new OutboundStartError("NO_IDENTIFIER");
  const compliance = await shouldBlockOutbound({
    customer: input.customer,
    value: identifier,
    channel: input.channelTypeName,
    complianceEnabled: getDeskSettings().callingCompliance,
  });
  if (compliance.blocked) throw new OutboundStartError(compliance.reason);
  const type = useSchemaStore
    .getState()
    .channelTypes.find((item) => item.name?.toUpperCase() === input.channelTypeName.toUpperCase());
  if (!type?.id) throw new OutboundStartError("NO_CHANNEL_TYPE");
  const channel = await getDefaultOutboundChannel(type.id).catch(() => null);
  if (!channel?.serviceIdentifier) throw new OutboundStartError("NO_DEFAULT_CHANNEL");
  return ccmApi.post("/message/receive", {
    id: crypto.randomUUID(),
    header: {
      channelData: {
        channelCustomerIdentifier: identifier,
        serviceIdentifier: channel.serviceIdentifier,
        additionalAttributes: [{ key: "agentId", type: "String100", value: user.id }],
      },
      sender: { id: user.id, senderName: user.firstName ?? user.username, type: "AGENT" },
      language: {},
      timestamp: "",
      securityInfo: {},
      stamps: [],
      intent: "AGENT_OUTBOUND",
      entities: {},
      customer: input.customer ?? null,
    },
    body: { type: "PLAIN", markdownText: "" },
  });
}
