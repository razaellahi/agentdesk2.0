import { escapeEmailText, type InlineEmailImage } from "./email";

const tags = new Set(
  "P DIV BR B STRONG I EM U S STRIKE SUB SUP SPAN FONT UL OL LI BLOCKQUOTE PRE CODE H1 H2 H3 H4 HR A IMG TABLE THEAD TBODY TR TD TH".split(
    " ",
  ),
);
const forbidden = new Set(
  "SCRIPT STYLE IFRAME OBJECT EMBED SVG MATH FORM INPUT BUTTON TEXTAREA SELECT LINK META BASE".split(" "),
);
const styles = new Set([
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-align",
  "line-height",
  "vertical-align",
  "border",
  "border-collapse",
  "padding",
  "width",
  "max-width",
  "height",
]);

/** Pasted HTML never enters the live editor before this allow-list is applied. */
export function sanitizeEmailHtml(html: string, images: readonly InlineEmailImage[] = []) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const element of [...doc.body.querySelectorAll("*")]) {
    if (forbidden.has(element.tagName)) {
      element.remove();
      continue;
    }
    if (!tags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    const safeStyles: [string, string][] = [];
    const css = (element as HTMLElement).style;
    for (const property of Array.from(css)) {
      const value = css.getPropertyValue(property);
      if (styles.has(property) && !/url\s*\(|expression\s*\(|[<>\\]/i.test(value))
        safeStyles.push([property, value]);
    }
    const href = element.getAttribute("href") ?? "";
    const image = images.find((item) => item.id === element.getAttribute("data-inline-id"));
    const alt = element.getAttribute("alt") ?? "";
    const color = element.getAttribute("color");
    const face = element.getAttribute("face");
    const size = element.getAttribute("size");
    const span = element.getAttribute("colspan");
    for (const attr of [...element.attributes]) element.removeAttribute(attr.name);
    for (const [property, value] of safeStyles) css.setProperty(property, value);
    if (element.tagName === "A" && /^(https?:\/\/|mailto:)[^\s]+$/i.test(href)) {
      element.setAttribute("href", href);
      element.setAttribute("rel", "noopener noreferrer");
    }
    if (element.tagName === "IMG") {
      if (!image) {
        element.remove();
        continue;
      }
      element.setAttribute("src", image.url);
      element.setAttribute("data-inline-id", image.id);
      element.setAttribute("alt", alt || image.file.name);
      css.setProperty("max-width", "100%");
    }
    if (element.tagName === "FONT") {
      if (color && /^(#[\da-f]{3,8}|[a-z]+|rgb\([\d\s,.%]+\))$/i.test(color))
        element.setAttribute("color", color);
      if (face && /^[\w\s,-]+$/.test(face)) element.setAttribute("face", face);
      if (size && /^[1-7]$/.test(size)) element.setAttribute("size", size);
    }
    if (["TD", "TH"].includes(element.tagName) && span && /^[1-9]\d?$/.test(span))
      element.setAttribute("colspan", span);
  }
  return doc.body.innerHTML;
}
export function emailPlainText(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const br of doc.body.querySelectorAll("br")) br.replaceWith("\n");
  for (const block of doc.body.querySelectorAll("p,div,li,tr,h1,h2,h3,blockquote,pre")) block.append("\n");
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trimEnd();
}
export const plainEmailHtml = (text: string) => escapeEmailText(text).replaceAll("\n", "<br>");
export function revokeInlineImages(images: readonly InlineEmailImage[]) {
  for (const image of images) URL.revokeObjectURL(image.url);
}
