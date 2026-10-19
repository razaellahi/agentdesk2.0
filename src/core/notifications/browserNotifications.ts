/** Desktop notification (asks for permission on first use, as unified-agent did). */
export async function notify(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  try {
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission !== "granted") return;
    const n = new Notification(title, {
      body,
      icon: `${import.meta.env.BASE_URL}images/icon-192.png`,
      tag: title,
    });
    n.onclick = () => {
      globalThis.focus();
      n.close();
    };
  } catch {
    /* blocked or unsupported: ignore */
  }
}
