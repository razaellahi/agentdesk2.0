export interface AttributeRule {
  key?: string;
  label?: string;
  type?: string;
  valueType?: string;
  length?: number | string;
  isRequired?: boolean;
  isChannelIdentifier?: boolean;
  defaultValue?: unknown;
}
export interface AttributeType {
  type: string;
  regex?: string;
  valueType?: string;
}
export function attributeLength(field: AttributeRule) {
  const n = Number(field.length);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}
export function isNumericAttribute(field: AttributeRule, types: AttributeType[]) {
  return (
    ["number", "integer"].includes(field.type?.toLowerCase() ?? "") ||
    (
      field.valueType ??
      types.find((type) => type.type.toLowerCase() === field.type?.toLowerCase())?.valueType
    )?.toLowerCase() === "number"
  );
}
/** Source regex, string length, required and signed-32-bit number limits. */
export function validateAttribute(field: AttributeRule, value: unknown, types: AttributeType[]) {
  const values = Array.isArray(value) ? value : [value];
  const nonEmpty = values.filter((item) => item != null && item !== "");
  const label = field.label || field.key || "Field";
  if (field.isRequired && !nonEmpty.length) return `${label} is required.`;
  const type = types.find((item) => item.type.toLowerCase() === field.type?.toLowerCase());
  let pattern: RegExp | undefined;
  if (type?.regex) {
    try {
      pattern = new RegExp(`^(?:${type.regex})$`);
    } catch {
      return `${label} has an invalid schema validation rule.`;
    }
  }
  for (const item of nonEmpty) {
    const text = String(item);
    if (
      field.type?.toLowerCase() === "string" &&
      attributeLength(field) &&
      text.length > attributeLength(field)!
    )
      return `${label} must contain at most ${attributeLength(field)} characters.`;
    if (pattern && !pattern.test(text)) return `${label} has an invalid format.`;
    if (isNumericAttribute(field, types)) {
      const n = Number(item);
      if (
        !Number.isFinite(n) ||
        n < -2147483647 ||
        n > 2147483647 ||
        (field.type?.toLowerCase() === "integer" && !Number.isInteger(n))
      )
        return `${label} must be a valid number between -2147483647 and 2147483647.`;
    }
  }
  return null;
}
