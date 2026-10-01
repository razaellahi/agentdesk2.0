import type { SchemaAttribute } from "../api";

/**
 * PII masking (unified-agent maskPIIAttribute pipe). Values are shown in full
 * when the user holds `permission` on `customer`; masked when they only hold
 * `masked_pii`; otherwise shown as-is.
 */
export function maskString(value: string) {
  return value
    .split(",")
    .map((part) => part.slice(0, 3) + part.slice(3).replace(/./g, "*"))
    .join(",");
}

export function maskNumber(value: string) {
  return value
    .split(",")
    .map((seg) => {
      const s = seg.trim();
      return s.slice(0, -2).replace(/./g, "*") + s.slice(-2);
    })
    .join(",");
}

export function maskEmail(value: string) {
  const [first = "", domain = ""] = value.split("@");
  const second = `@${domain}`;
  const a = first.length <= 4 ? first : first.slice(0, 4) + "*".repeat(first.length - 4);
  const b = second.length <= 4 ? second : "*".repeat(second.length - 4) + second.slice(-4);
  return a + b;
}

export function maskBySchema(value: string, attr: SchemaAttribute | null) {
  if (!attr?.isPii || !attr.key) return value;
  const type = attr.type.toLowerCase();
  if (type === "phonenumber") return maskNumber(value);
  if (type === "email") return maskEmail(value);
  if (attr.key.toLowerCase() !== "labels") return maskString(value);
  return value;
}

export function maskPii(
  value: unknown,
  attr: SchemaAttribute | null,
  can: { full: boolean; masked: boolean },
): string {
  if (value === null || value === undefined || value === "")
    return value === undefined || value === null ? "" : String(value);
  const text = String(value);
  if (can.full) return text;
  if (can.masked) return maskBySchema(text, attr);
  return text;
}
