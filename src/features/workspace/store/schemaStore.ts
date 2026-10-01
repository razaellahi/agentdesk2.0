import { create } from "zustand";
import type { SchemaAttribute } from "../api";
import type { ChannelType } from "../model/types";

interface SchemaState {
  schema: SchemaAttribute[];
  channelTypes: ChannelType[];
  setSchema(schema: SchemaAttribute[]): void;
  setChannelTypes(types: ChannelType[]): void;
  reset(): void;
}

/** Customer schema (CIM) and channel types (socket onChannelTypes), cached for the session. */
export const useSchemaStore = create<SchemaState>()((set) => ({
  schema: [],
  channelTypes: [],
  setSchema: (schema) => set({ schema }),
  setChannelTypes: (channelTypes) => set({ channelTypes }),
  reset: () => set({ schema: [], channelTypes: [] }),
}));

export const schemaByKey = (key: string) =>
  useSchemaStore.getState().schema.find((a) => a.key.toLowerCase() === key.toLowerCase()) ?? null;
