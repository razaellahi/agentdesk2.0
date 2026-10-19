import { createContext, useContext } from "react";
/** Overlays follow their window while sharing the authenticated React root. */
export const PortalContainerContext = createContext<HTMLElement | undefined>(undefined);
export const usePortalContainer = () => useContext(PortalContainerContext);
const externalDocuments = new Set<Document>();
export function registerOverlayDocument(document: Document) {
  externalDocuments.add(document);
  return () => {
    externalDocuments.delete(document);
  };
}
export function focusedOverlayContainer(): HTMLElement | undefined {
  for (const document of externalDocuments) if (document.hasFocus()) return document.body;
  return undefined;
}
