import type { SchemaAttribute } from "../api";
import type { ChannelSession } from "./types";

/**
 * What an agent can do to reach the customer of an open conversation, per channel.
 * Pure so the decision rules are testable; the hook adds masking and actions.
 *
 * Rules (source outbound panel + customer-info, made explicit):
 *  - an opted-out customer cannot be contacted on any channel;
 *  - a channel the customer is already on in this conversation is continued in the
 *    composer instead of opening a second conversation;
 *  - otherwise the channel needs a permission, a destination on the profile, a
 *    configured outbound channel and, for voice, a connected idle phone.
 */
export type OutboundKind = "voice" | "sms" | "whatsapp" | "email" | "twitter";

export type OutboundReason =
  "OPT_OUT" | "NO_PERMISSION" | "NO_DESTINATION" | "NOT_CONFIGURED" | "PHONE_OFFLINE" | "ON_CALL";

export interface OutboundTarget {
  value: string;
  /** Profile attribute the value came from, for PII masking. */
  attrKey: string;
}

export interface OutboundOption {
  kind: OutboundKind;
  targets: OutboundTarget[];
  state: "ready" | "continue" | "checking" | "unavailable";
  reason?: OutboundReason;
  /** Active session in this conversation to continue on (state "continue"). */
  sessionId?: string;
}

export interface OutboundPlan {
  optedOut: boolean;
  options: OutboundOption[];
}

const SPEC: Record<OutboundKind, { channelTypes: string[]; profileKeys: string[] }> = {
  voice: { channelTypes: ["CX_VOICE", "CISCO_CC"], profileKeys: ["phoneNumber", "phone", "voice"] },
  sms: { channelTypes: ["SMS"], profileKeys: ["phoneNumber", "phone"] },
  whatsapp: { channelTypes: ["WHATSAPP"], profileKeys: ["whatsapp"] },
  email: { channelTypes: ["EMAIL"], profileKeys: ["email"] },
  twitter: { channelTypes: ["TWITTER"], profileKeys: ["twitter"] },
};

export const OUTBOUND_ORDER: OutboundKind[] = ["voice", "sms", "whatsapp", "email", "twitter"];

const PHONE_KINDS: OutboundKind[] = ["voice", "sms", "whatsapp"];

/** Same destination regardless of formatting: "+92 300-1234567" equals "0092300 1234567". */
export function destinationKey(kind: OutboundKind, value: string) {
  if (!PHONE_KINDS.includes(kind)) return value.trim().toLowerCase();
  return value
    .trim()
    .replace(/^0{2,}/, "+")
    .replace(/[^\d]/g, "");
}

function values(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  return list.map((item) => String(item).trim()).filter(Boolean);
}

export function kindOfChannelType(name: string | undefined): OutboundKind | null {
  const upper = (name ?? "").toUpperCase();
  return OUTBOUND_ORDER.find((kind) => SPEC[kind].channelTypes.includes(upper)) ?? null;
}

/** Destinations for a channel: profile fields, schema identifiers of that channel type, then live sessions. */
export function outboundTargets(
  kind: OutboundKind,
  customer: Record<string, unknown>,
  schema: SchemaAttribute[],
  sessions: ChannelSession[],
): OutboundTarget[] {
  const out: OutboundTarget[] = [];
  const seen = new Set<string>();
  const add = (value: string, attrKey: string) => {
    const key = destinationKey(kind, value);
    if (!key || seen.has(key)) return;
    if (kind === "email" && !value.includes("@")) return;
    if (PHONE_KINDS.includes(kind) && key.length < 3) return;
    seen.add(key);
    out.push({ value, attrKey });
  };
  for (const key of SPEC[kind].profileKeys) values(customer[key]).forEach((v) => add(v, key));
  for (const attr of schema) {
    if (!attr.isChannelIdentifier || !attr.key) continue;
    if (!(attr.channelTypes ?? []).some((type) => SPEC[kind].channelTypes.includes(type.toUpperCase())))
      continue;
    values(customer[attr.key]).forEach((v) => add(v, attr.key));
  }
  for (const session of sessions) {
    if (kindOfChannelType(session.channel.channelType.name) !== kind) continue;
    const id = session.channelData?.channelCustomerIdentifier;
    if (id) add(id, SPEC[kind].profileKeys[0]!);
  }
  // WhatsApp numbers are usually the customer's phone numbers: offer them after explicit ones.
  if (kind === "whatsapp")
    for (const key of SPEC.voice.profileKeys) values(customer[key]).forEach((v) => add(v, key));
  return out;
}

export interface PlanInput {
  customer: Record<string, unknown>;
  sessions: ChannelSession[];
  schema: SchemaAttribute[];
  /** Channel switched on in settings / deployment. */
  enabled: Record<OutboundKind, boolean>;
  /** An outbound channel is configured; undefined while still loading. */
  configured: Partial<Record<OutboundKind, boolean | undefined>>;
  permitted: boolean;
  optedOut: boolean;
  phone: { registered: boolean; idle: boolean };
}

export function planOutbound(input: PlanInput): OutboundPlan {
  const options = OUTBOUND_ORDER.filter((kind) => input.enabled[kind]).map((kind): OutboundOption => {
    const targets = outboundTargets(kind, input.customer, input.schema, input.sessions);
    const unavailable = (reason: OutboundReason): OutboundOption => ({
      kind,
      targets,
      state: "unavailable",
      reason,
    });
    if (input.optedOut) return unavailable("OPT_OUT");
    if (!input.permitted) return unavailable("NO_PERMISSION");
    if (kind === "voice") {
      if (!input.phone.idle) return unavailable("ON_CALL");
      if (!input.phone.registered) return unavailable("PHONE_OFFLINE");
    } else {
      const live = input.sessions.find(
        (session) => !session.isDisabled && kindOfChannelType(session.channel.channelType.name) === kind,
      );
      if (live) return { kind, targets, state: "continue", sessionId: live.id };
    }
    if (!targets.length) return unavailable("NO_DESTINATION");
    const configured = input.configured[kind];
    if (configured === undefined) return { kind, targets, state: "checking" };
    if (!configured) return unavailable("NOT_CONFIGURED");
    return { kind, targets, state: "ready" };
  });
  return { optedOut: input.optedOut, options };
}
