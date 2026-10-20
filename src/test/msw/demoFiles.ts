/**
 * Small stand-in files for the demo's email attachments, served by the mock file endpoint.
 * Never used outside mock mode.
 */
export function mockDemoFile(filename: string) {
  if (filename.endsWith(".pdf")) {
    const pdf =
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 240 120]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
    return { body: pdf, type: "application/pdf" };
  }
  // A 1x1 PNG: the demo only needs a real file to download.
  const png = Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
    (char) => char.charCodeAt(0),
  );
  return { body: png, type: "image/png" };
}
