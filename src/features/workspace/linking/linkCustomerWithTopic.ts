import { cimCustomerApi } from "@/core/api";
import { getConversation, useConversationStore } from "../store/conversationStore";
import { useSchemaStore } from "../store/schemaStore";
import { linkConversationCustomer } from "../api";
import { updateCustomer } from "@/features/customers";
import type { Conversation } from "../model/types";
import { isFakeConversation, linkingChannelSession } from "./session";

/** Fill every schema key so update-customer doesn't wipe fields (UA phonebook linkCustomer). */
export function schemaCompleteCustomer(selected: Record<string, unknown>): Record<string, unknown> {
  const complete: Record<string, unknown> = {};
  for (const attr of useSchemaStore.getState().schema) {
    const key = attr.key;
    if (!key) continue;
    if (Object.prototype.hasOwnProperty.call(selected, key)) {
      complete[key] = selected[key];
    } else {
      complete[key] = attr.isChannelIdentifier ? [] : "";
    }
  }
  if (selected._id) complete._id = selected._id;
  return complete;
}

export function channelIdentifierAttr(channelTypeName: string | undefined) {
  if (!channelTypeName) return null;
  const type = channelTypeName.toLowerCase();
  for (const attr of useSchemaStore.getState().schema) {
    if (!attr.isChannelIdentifier || !attr.key) continue;
    const types = (attr.channelTypes ?? []).map((item) =>
      typeof item === "string"
        ? item.toLowerCase()
        : String((item as { name?: string }).name ?? "").toLowerCase(),
    );
    if (types.includes(type)) return { key: attr.key, label: attr.label || attr.key };
  }
  return null;
}

function asIdList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null || value === "") return [];
  return [String(value)];
}

export interface LinkDialogRequest {
  customerName: string;
  channelIdentifier: string | null;
  attributeLabel: string | null;
  offerMerge: boolean;
}

export interface LinkDialogResult {
  confirmed: boolean;
  merge: boolean;
}

/**
 * Link a phonebook customer onto an active conversation (UA linkCustomerWithTopic).
 * Caller supplies the confirm dialog (merge checkbox when offerMerge).
 */
export async function linkCustomerWithTopic(input: {
  conversationId: string;
  selected: Record<string, unknown>;
  confirm: (req: LinkDialogRequest) => Promise<LinkDialogResult>;
}) {
  const conversation = getConversation(input.conversationId);
  if (!conversation?.customer) {
    throw new Error("Unable to link customer");
  }
  if (isFakeConversation(conversation)) {
    throw new Error("Unable to link customer");
  }

  if (useSchemaStore.getState().schema.length === 0) {
    await loadCustomerSchemaIntoStore();
  }

  const topicCustomer = conversation.customer;
  const session = linkingChannelSession(conversation);
  const channelType = session?.channel.channelType.name;
  const channelIdentifier = session?.channelData.channelCustomerIdentifier ?? "";
  const attr = channelIdentifierAttr(channelType);

  let selected = schemaCompleteCustomer(input.selected);
  const selectedId = String(selected._id ?? "");
  if (!selectedId) throw new Error("Unable to link customer");

  let needUpdate = false;

  if (attr && channelIdentifier) {
    const existing = asIdList(selected[attr.key]);
    const alreadyHas = existing.includes(channelIdentifier);
    const result = await input.confirm({
      customerName: String(selected.firstName ?? selectedId),
      channelIdentifier: alreadyHas ? null : channelIdentifier,
      attributeLabel: alreadyHas ? null : attr.label,
      offerMerge: !alreadyHas,
    });
    if (!result.confirmed) return { linked: false as const };
    if (result.merge && !alreadyHas) {
      if (existing.length > 9) {
        throw new Error("space-unavailable");
      }
      selected = { ...selected, [attr.key]: [...existing, channelIdentifier] };
      needUpdate = true;
    }
  } else {
    const result = await input.confirm({
      customerName: String(selected.firstName ?? selectedId),
      channelIdentifier: null,
      attributeLabel: null,
      offerMerge: false,
    });
    if (!result.confirmed) return { linked: false as const };
  }

  if (needUpdate) {
    const body = { ...selected };
    delete body._id;
    delete body.__v;
    await updateCustomer(selectedId, body);
    selected = { ...selected, _id: selectedId };
  }

  await linkConversationCustomer(input.conversationId, selected);
  useConversationStore.getState().setCustomer(input.conversationId, {
    ...topicCustomer,
    ...selected,
    _id: selectedId,
  } as Conversation["customer"]);

  return { linked: true as const, customerId: selectedId };
}

export async function loadCustomerSchemaIntoStore() {
  const schema = await cimCustomerApi.get("/customerSchema");
  const list = Array.isArray(schema)
    ? schema
    : schema && typeof schema === "object" && Array.isArray((schema as { docs?: unknown[] }).docs)
      ? (schema as { docs: unknown[] }).docs
      : [];
  useSchemaStore.getState().setSchema(list as never);
}
