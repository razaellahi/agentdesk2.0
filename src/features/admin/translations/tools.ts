/**
 * Pure translation-tree helpers, ported from unified-admin TranslationsComponent
 * (flatten/unflatten, structure signature, reference & compare validation).
 */
export type Tree = Record<string, unknown>;
export type Flat = Record<string, string>;

export const REFERENCE_LOCALE = "__reference__";

export function flatten(obj: Tree, prefix = ""): Flat {
  const out: Flat = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v as Tree, key));
    else out[key] = String(v);
  }
  return out;
}

export function setNested(obj: Tree, path: string, value: string): void {
  const keys = path.split(".");
  let node: Tree = obj;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) node[key] = value;
    else {
      if (!node[key] || typeof node[key] !== "object") node[key] = {};
      node = node[key] as Tree;
    }
  });
}

export function unflatten(flat: Flat): Tree {
  const out: Tree = {};
  for (const [k, v] of Object.entries(flat)) setNested(out, k, v);
  return out;
}

type Signature = "leaf" | { [key: string]: Signature };

export function structureSignature(obj: unknown): Signature {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "leaf";
  const sig: Record<string, Signature> = {};
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b)))
    sig[key] = structureSignature((obj as Tree)[key]);
  return sig;
}

export function structuresEqual(a: Signature, b: Signature): boolean {
  if (a === "leaf" || b === "leaf") return a === b;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k) => k in b && structuresEqual(a[k]!, b[k]!));
}

/** Rejects null/undefined/non-scalar leaves (same rule as validateTranslationObject). */
export function invalidValuePath(obj: Tree, path = ""): string | null {
  for (const [key, val] of Object.entries(obj)) {
    const full = path ? `${path}.${key}` : key;
    if (val === null || val === undefined) return `Key "${full}" has null/undefined value`;
    if (typeof val === "object" && !Array.isArray(val)) {
      const nested = invalidValuePath(val as Tree, full);
      if (nested) return nested;
    } else if (!["string", "number", "boolean"].includes(typeof val)) {
      return `Key "${full}" has unsupported value type: ${typeof val}`;
    }
  }
  return null;
}

/** The reference endpoint answers either a tree or a locale map; take the tree. */
export function extractReferenceTemplate(res: unknown): Tree | null {
  const data = ((res as { translations?: unknown })?.translations ?? res) as Tree | null;
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const keys = Object.keys(data);
  if (!keys.length) return null;
  const looksLikeLocaleMap = keys.every(
    (k) =>
      data[k] &&
      typeof data[k] === "object" &&
      !Array.isArray(data[k]) &&
      (k.length <= 5 || /^[a-z]{2,3}(-[A-Z]{2})?$/i.test(k)),
  );
  if (looksLikeLocaleMap) return data[keys[0]!] as Tree;
  return data;
}

export type ValidationKind = "reference" | "compare";
export type ValidationReason = "structure" | "missing" | "extra" | "keys-mismatch" | "no-reference";

export interface ValidationDetails {
  kind: ValidationKind;
  reason: ValidationReason;
  structureMismatch: boolean;
  missingKeys: string[];
  extraKeys: string[];
  leftKeyCount: number;
  rightKeyCount: number;
  leftLabel: string;
  rightLabel: string;
}

const sortKeys = (flat: Flat) => Object.keys(flat).sort((a, b) => a.localeCompare(b));

export function validateAgainstReference(
  reference: Tree | null,
  data: Tree,
  labels: { left: string; right: string },
): ValidationDetails | null {
  const dataFlat = flatten(data);
  if (!reference) {
    return {
      kind: "reference",
      reason: "no-reference",
      structureMismatch: false,
      missingKeys: [],
      extraKeys: [],
      leftKeyCount: 0,
      rightKeyCount: Object.keys(dataFlat).length,
      leftLabel: labels.left,
      rightLabel: labels.right,
    };
  }
  const refFlat = flatten(reference);
  const structureMismatch = !structuresEqual(structureSignature(reference), structureSignature(data));
  const missingKeys = sortKeys(refFlat).filter((k) => !(k in dataFlat));
  const extraKeys = sortKeys(dataFlat).filter((k) => !(k in refFlat));
  if (!structureMismatch && !missingKeys.length && !extraKeys.length) return null;
  return {
    kind: "reference",
    reason: structureMismatch ? "structure" : missingKeys.length ? "missing" : "extra",
    structureMismatch,
    missingKeys,
    extraKeys,
    leftKeyCount: Object.keys(refFlat).length,
    rightKeyCount: Object.keys(dataFlat).length,
    leftLabel: labels.left,
    rightLabel: labels.right,
  };
}

export function validateCompare(
  left: Flat,
  right: Flat,
  labels: { left: string; right: string },
): ValidationDetails | null {
  const missingKeys = sortKeys(left).filter((k) => !(k in right));
  const extraKeys = sortKeys(right).filter((k) => !(k in left));
  const structureMismatch = !structuresEqual(
    structureSignature(unflatten(left)),
    structureSignature(unflatten(right)),
  );
  if (!structureMismatch && !missingKeys.length && !extraKeys.length) return null;
  return {
    kind: "compare",
    reason: "keys-mismatch",
    structureMismatch,
    missingKeys,
    extraKeys,
    leftKeyCount: Object.keys(left).length,
    rightKeyCount: Object.keys(right).length,
    leftLabel: labels.left,
    rightLabel: labels.right,
  };
}

export function flatEqual(a: Flat, b: Flat): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

export function countChanged(current: Flat, saved: Flat): number {
  let n = 0;
  const keys = new Set([...Object.keys(current), ...Object.keys(saved)]);
  for (const k of keys) if (current[k] !== saved[k]) n++;
  return n;
}
