/** SMS normalization follows Unified Agent's configured prefix; voice dial strings remain untouched. */
export function formatSmsNumber(value: string, prefix: string): string {
  const raw = value.trim();
  if (!raw || raw === prefix) return prefix;
  let number = raw;
  if (prefix && number.startsWith(prefix)) number = number.slice(prefix.length);
  else if (prefix.startsWith("+") && number.startsWith(prefix.slice(1)))
    number = number.slice(prefix.length - 1);
  else if (prefix && !/^[0+*]/.test(number)) number = `0${number}`;
  number = number.replace(/^0{2,}/, "+"); // source convertZerosToPlus
  const international = number.startsWith("+");
  number = `${international ? "+" : ""}${number.replace(/\D/g, "")}`;
  if (!international && prefix) number = `${prefix}${number.replace(/^0/, "")}`;
  return number;
}

/** WhatsApp numbers: leading zeros become "+", then only digits (source formatWhatsAppNumber). */
export function formatWhatsAppNumber(value: string): string {
  const number = value.trim().replace(/^0{2,}/, "+");
  return `${number.startsWith("+") ? "+" : ""}${number.replace(/\D/g, "")}`;
}

export function validSmsNumber(value: string, prefix: string) {
  return value !== prefix && /^\+?\d{3,15}$/.test(value);
}
