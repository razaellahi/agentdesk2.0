/**
 * Asks a conversation's composer to take focus (e.g. after "Reply here" switches
 * the reply channel). The composer may live in a pop-out window, so this is an
 * in-app bus rather than a DOM query.
 */
const bus = new EventTarget();

export function requestComposerFocus(conversationId: string) {
  bus.dispatchEvent(new CustomEvent("focus", { detail: conversationId }));
}

export function onComposerFocusRequest(conversationId: string, focus: () => void): () => void {
  const listener = (event: Event) => {
    if ((event as CustomEvent<string>).detail === conversationId) focus();
  };
  bus.addEventListener("focus", listener);
  return () => bus.removeEventListener("focus", listener);
}
