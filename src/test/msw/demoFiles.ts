/**
 * Small stand-in files for the demo's email attachments, served by the mock file endpoint.
 * Never used outside mock mode.
 */
export function mockDemoFile(filename: string) {
  if (filename.endsWith(".svg")) return { body: demoSvg(filename), type: "image/svg+xml" };
  if (filename.endsWith(".pdf")) return { body: demoPdf(filename), type: "application/pdf" };
  if (/\.(docx|xlsx|zip|pptx)$/.test(filename)) {
    // Only the download is exercised: the card draws its own preview for these.
    const types: Record<string, string> = {
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      zip: "application/zip",
    };
    return { body: "demo file", type: types[filename.split(".").pop() ?? ""] ?? "application/octet-stream" };
  }
  // A 1x1 PNG: the demo only needs a real file to download.
  const png = Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
    (char) => char.charCodeAt(0),
  );
  return { body: png, type: "image/png" };
}

const svg = (width: number, height: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="Helvetica, Arial, sans-serif">${inner}</svg>`;

const PRODUCTS: Record<string, [string, string, string]> = {
  "blender-pro": ["Blender Pro", "#6366f1", "#a855f7"],
  "blender-mini": ["Blender Mini", "#0ea5e9", "#22d3ee"],
  "blender-max": ["Blender Max", "#f97316", "#facc15"],
};

/** Pictures for the demo chats: a damaged jar photo, a sticker and the blender range, drawn as SVG. */
function demoSvg(filename: string): string {
  if (filename.includes("jar"))
    return svg(
      480,
      320,
      `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs>
      <rect width="480" height="320" fill="url(#bg)"/>
      <rect x="0" y="250" width="480" height="70" fill="#64748b" opacity=".35"/>
      <rect x="170" y="70" width="140" height="180" rx="22" fill="#ffffff" fill-opacity=".55" stroke="#475569" stroke-width="4"/>
      <rect x="160" y="52" width="160" height="26" rx="8" fill="#334155"/>
      <path d="M244 78 L226 128 L254 150 L232 196 L262 222 L248 250" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M254 150 L290 140 M232 196 L196 206" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
      <text x="240" y="292" text-anchor="middle" font-size="18" fill="#1e293b">Cracked blender jar</text>`,
    );
  if (filename.includes("sticker"))
    return svg(
      220,
      220,
      `<circle cx="110" cy="96" r="82" fill="#facc15" stroke="#eab308" stroke-width="6"/>
      <circle cx="82" cy="82" r="10" fill="#422006"/><circle cx="138" cy="82" r="10" fill="#422006"/>
      <path d="M72 116 Q110 156 148 116" fill="none" stroke="#422006" stroke-width="9" stroke-linecap="round"/>
      <text x="110" y="206" text-anchor="middle" font-size="26" font-weight="700" fill="#422006">Thanks!</text>`,
    );
  const key = Object.keys(PRODUCTS).find((name) => filename.includes(name)) ?? "blender-pro";
  const [title, from, to] = PRODUCTS[key]!;
  return svg(
    480,
    260,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="480" height="260" fill="url(#g)"/>
    <rect x="196" y="40" width="88" height="110" rx="14" fill="#ffffff" fill-opacity=".6" stroke="#ffffff" stroke-width="3"/>
    <rect x="188" y="28" width="104" height="18" rx="6" fill="#ffffff"/>
    <rect x="176" y="150" width="128" height="62" rx="12" fill="#0f172a" fill-opacity=".85"/>
    <circle cx="240" cy="181" r="12" fill="#ffffff"/>
    <text x="240" y="244" text-anchor="middle" font-size="20" font-weight="700" fill="#ffffff">${title}</text>`,
  );
}

/** A one page PDF with real text, so its preview in the transcript is a page and not a blank. */
function demoPdf(filename: string): string {
  const title = filename.includes("invoice") ? "INVOICE 1042" : "DOCUMENT";
  const lines = [
    ["F1", 22, 48, 190, title],
    ["F2", 10, 48, 166, "Expertflow Demo Store"],
    ["F2", 10, 48, 150, "Billed to: Amina Raza"],
    ["F2", 10, 48, 120, "Blender Pro 1200 W ............ 1 x 89.00"],
    ["F2", 10, 48, 106, "Shipping ........................ 6.00"],
    ["F1", 12, 48, 78, "Total ........................... 95.00 USD"],
    ["F2", 9, 48, 40, "Thank you for your order."],
  ];
  const stream = lines
    .map(([font, size, x, y, text]) => `BT /${font} ${size} Tf ${x} ${y} Td (${text}) Tj ET`)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 340 230] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}
