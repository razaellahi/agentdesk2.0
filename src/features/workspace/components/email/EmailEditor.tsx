import { useEffect, useId, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link,
  ImagePlus,
  Undo2,
  Redo2,
  Table2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { emailPlainText, plainEmailHtml, sanitizeEmailHtml } from "../../model/emailEditor";
import type { InlineEmailImage } from "../../model/email";

interface Props {
  html: string;
  text: string;
  images: InlineEmailImage[];
  onChange: (value: { html: string; text: string; images: InlineEmailImage[] }) => void;
  disabled?: boolean;
  spellCheck?: boolean;
  allowImages?: boolean;
  label?: string;
  onSend?: () => void;
}
/** Each editor owns its DOM and selection, including editors hosted in a pop-out document. */
export function EmailEditor({
  html,
  text,
  images,
  onChange,
  disabled = false,
  spellCheck = true,
  allowImages = true,
  label = "Email message",
  onSend,
}: Props) {
  const editor = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const currentImages = useRef(images);
  const lastEmission = useRef("");
  const id = useId();
  const [link, setLink] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [rows, setRows] = useState(2);
  const [columns, setColumns] = useState(2);
  useEffect(() => {
    currentImages.current = images;
  }, [images]);
  useEffect(() => {
    const el = editor.current;
    const value = html || plainEmailHtml(text);
    if (el && el.innerHTML !== value && value !== lastEmission.current) {
      el.innerHTML = sanitizeEmailHtml(value, images);
      selection.current = null;
    }
  }, [html, text, images]);
  const remember = () => {
    const el = editor.current,
      range = el?.ownerDocument.getSelection();
    if (el && range?.rangeCount && el.contains(range.anchorNode) && el.contains(range.focusNode))
      selection.current = range.getRangeAt(0).cloneRange();
  };
  const restore = () => {
    const el = editor.current;
    if (!el || disabled) return null;
    el.focus();
    const selected = el.ownerDocument.getSelection();
    const range = selection.current;
    if (selected && range && el.contains(range.commonAncestorContainer)) {
      selected.removeAllRanges();
      selected.addRange(range);
    } else {
      const end = el.ownerDocument.createRange();
      end.selectNodeContents(el);
      end.collapse(false);
      selected?.removeAllRanges();
      selected?.addRange(end);
    }
    return el;
  };
  const emit = () => {
    const el = editor.current;
    if (!el) return;
    lastEmission.current = el.innerHTML;
    onChange({ html: el.innerHTML, text: emailPlainText(el.innerHTML), images: currentImages.current });
    remember();
  };
  const command = (name: string, value?: string) => {
    const el = restore();
    if (!el) return;
    // The browser editing buffer preserves typing, formatting and paste undo as one history.
    if (!el.ownerDocument.execCommand(name, false, value))
      toast.error("This formatting action is unavailable in your browser.");
    emit();
  };
  const insertImages = (files: File[]) => {
    const accepted = files.filter((file) => /^image\/(png|jpeg|gif|webp)$/.test(file.type));
    if (accepted.length !== files.length) toast.error("Inline images support PNG, JPEG, GIF and WebP.");
    if (!accepted.length || disabled || !allowImages) return;
    const added = accepted.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
    currentImages.current = [...currentImages.current, ...added];
    const doc = editor.current!.ownerDocument;
    const markup = added
      .map((image) => {
        const img = doc.createElement("img");
        img.src = image.url;
        img.alt = image.file.name;
        img.dataset.inlineId = image.id;
        img.style.maxWidth = "100%";
        return img.outerHTML;
      })
      .join("<br>");
    command("insertHTML", markup);
  };
  const actions = [
    ["Bold", "bold", Bold],
    ["Italic", "italic", Italic],
    ["Underline", "underline", Underline],
    ["Strikethrough", "strikeThrough", Strikethrough],
    ["Bulleted list", "insertUnorderedList", List],
    ["Numbered list", "insertOrderedList", ListOrdered],
    ["Align left", "justifyLeft", AlignLeft],
    ["Align center", "justifyCenter", AlignCenter],
    ["Align right", "justifyRight", AlignRight],
    ["Clear formatting", "removeFormat", Eraser],
    ["Undo", "undo", Undo2],
    ["Redo", "redo", Redo2],
  ] as const;
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-background">
      <div
        className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1"
        role="group"
        aria-label="Email formatting"
      >
        {actions.map(([name, action, Icon]) => (
          <Button
            key={name}
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={name}
            title={name}
            disabled={disabled}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => command(action)}
          >
            <Icon className="size-3.5" />
          </Button>
        ))}
        <select
          className="h-7 max-w-24 rounded border bg-background px-1 text-xs"
          aria-label="Text style"
          disabled={disabled}
          defaultValue="p"
          onFocus={remember}
          onChange={(event) => command("formatBlock", event.target.value)}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="blockquote">Quote</option>
          <option value="pre">Code block</option>
        </select>
        <select
          className="h-7 max-w-24 rounded border bg-background px-1 text-xs"
          aria-label="Font"
          disabled={disabled}
          defaultValue="Arial"
          onFocus={remember}
          onChange={(event) => command("fontName", event.target.value)}
        >
          {["Arial", "Verdana", "Georgia", "Times New Roman", "Courier New"].map((font) => (
            <option key={font}>{font}</option>
          ))}
        </select>
        <select
          className="h-7 rounded border bg-background px-1 text-xs"
          aria-label="Font size"
          disabled={disabled}
          defaultValue="3"
          onFocus={remember}
          onChange={(event) => command("fontSize", event.target.value)}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((size) => (
            <option key={size} value={size}>
              {[10, 13, 16, 18, 24, 32, 48][size - 1]}
            </option>
          ))}
        </select>
        <input
          type="color"
          aria-label="Text color"
          title="Text color"
          className="size-7 rounded border bg-background p-1"
          disabled={disabled}
          onFocus={remember}
          onChange={(event) => command("foreColor", event.target.value)}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label="Code block"
          disabled={disabled}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => command("formatBlock", "pre")}
        >
          <Code className="size-3.5" />
        </Button>
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Insert link"
              disabled={disabled}
              onPointerDown={remember}
            >
              <Link className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2" align="start">
            <label htmlFor={`${id}-link`} className="text-sm">
              Link address
            </label>
            <Input
              id={`${id}-link`}
              value={link}
              placeholder="https://"
              onChange={(event) => setLink(event.target.value)}
            />
            <Button
              size="sm"
              disabled={!/^(https?:\/\/|mailto:)[^\s]+$/i.test(link)}
              onClick={() => {
                command("createLink", link);
                setLinkOpen(false);
                setLink("");
              }}
            >
              Insert link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                command("unlink");
                setLinkOpen(false);
              }}
            >
              Remove link
            </Button>
          </PopoverContent>
        </Popover>
        <Popover open={tableOpen} onOpenChange={setTableOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Insert table"
              disabled={disabled}
              onPointerDown={remember}
            >
              <Table2 className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 space-y-2" align="start">
            <label htmlFor={`${id}-rows`} className="flex items-center justify-between gap-2 text-sm">
              Rows
              <Input
                id={`${id}-rows`}
                type="number"
                min={1}
                max={10}
                value={rows}
                onChange={(event) => setRows(Number(event.target.value))}
                className="w-20"
              />
            </label>
            <label htmlFor={`${id}-columns`} className="flex items-center justify-between gap-2 text-sm">
              Columns
              <Input
                id={`${id}-columns`}
                type="number"
                min={1}
                max={6}
                value={columns}
                onChange={(event) => setColumns(Number(event.target.value))}
                className="w-20"
              />
            </label>
            <Button
              size="sm"
              disabled={
                !Number.isInteger(rows) ||
                rows < 1 ||
                rows > 10 ||
                !Number.isInteger(columns) ||
                columns < 1 ||
                columns > 6
              }
              onClick={() => {
                command(
                  "insertHTML",
                  `<table style="border-collapse:collapse;width:100%"><tbody>${Array.from({ length: rows }, () => `<tr>${Array.from({ length: columns }, () => '<td style="border:1px solid currentColor;padding:8px"><br></td>').join("")}</tr>`).join("")}</tbody></table><p><br></p>`,
                );
                setTableOpen(false);
              }}
            >
              Insert table
            </Button>
          </PopoverContent>
        </Popover>
        {allowImages && (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Insert inline image"
              disabled={disabled}
              onPointerDown={(event) => {
                remember();
                event.preventDefault();
              }}
              onClick={() => imageInput.current?.click()}
            >
              <ImagePlus className="size-3.5" />
            </Button>
            <input
              ref={imageInput}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/gif,image/webp"
              aria-label="Inline email images"
              className="hidden"
              onChange={(event) => {
                insertImages([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
          </>
        )}
      </div>
      <div
        ref={editor}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        aria-disabled={disabled}
        tabIndex={0}
        spellCheck={spellCheck}
        className="max-h-56 min-h-24 overflow-auto px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset [&_a]:text-primary [&_a]:underline [&_blockquote]:border-s-2 [&_blockquote]:ps-3 [&_h1]:text-2xl [&_h2]:text-xl [&_img]:max-w-full [&_li]:ms-5 [&_ol]:list-decimal [&_pre]:bg-muted [&_pre]:whitespace-pre-wrap [&_table]:max-w-full [&_td]:min-w-8 [&_ul]:list-disc"
        onInput={emit}
        onKeyUp={remember}
        onMouseUp={remember}
        onBlur={remember}
        onKeyDown={(event) => {
          if (
            onSend &&
            event.key === "Enter" &&
            (event.ctrlKey || event.metaKey) &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            onSend();
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          remember();
          if (disabled) return;
          const files = [...event.clipboardData.files];
          if (files.length && allowImages) insertImages(files);
          else {
            const pasted = event.clipboardData.getData("text/html");
            command(
              "insertHTML",
              pasted ? sanitizeEmailHtml(pasted) : plainEmailHtml(event.clipboardData.getData("text/plain")),
            );
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (allowImages) insertImages([...event.dataTransfer.files]);
        }}
        onDragOver={(event) => event.preventDefault()}
      />
      <p className="border-t px-3 py-1 text-[10px] text-muted-foreground">Ctrl / ⌘ + Enter to send</p>
    </div>
  );
}
