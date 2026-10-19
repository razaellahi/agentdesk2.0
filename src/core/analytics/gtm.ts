/**
 * Google Tag Manager, loaded only when config.json sets GTM_ID.
 * Events match unified-agent: `{ event, data }` pushed onto `dataLayer`.
 */
export function installGtm(id: string | undefined): void {
  const container = id?.trim();
  if (!container || document.getElementById("ad2-gtm")) return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = "ad2-gtm";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(container)}`;
  document.head.appendChild(script);
}

export function track(event: string, data: Record<string, unknown>): void {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, data });
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
