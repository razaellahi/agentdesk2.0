/** Matches unified-agent encryptionService (AES-CBC, key bluecorp96__678u). */
export async function encryptSecret(value: string): Promise<string> {
  const keyBytes = new TextEncoder().encode("bluecorp96__678u");
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["encrypt"]);
  const cipher = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, new TextEncoder().encode(value));
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  let binary = "";
  for (const byte of combined) binary += String.fromCharCode(byte);
  return btoa(binary);
}
