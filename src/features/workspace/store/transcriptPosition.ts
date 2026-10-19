import type { StateSnapshot } from "react-virtuoso";
const positions = new Map<string, StateSnapshot>();
let generation = 0;
export const transcriptPosition = {
  get: (key: string) => positions.get(key),
  generation: () => generation,
  save: (key: string, snapshot: StateSnapshot, ownerGeneration: number) => {
    if (ownerGeneration === generation) positions.set(key, snapshot);
  },
  reset: () => {
    generation++;
    positions.clear();
  },
};
