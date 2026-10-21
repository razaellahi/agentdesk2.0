import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export interface FileKind {
  /** Upper-case extension for the label ("PDF"), empty when the name has none. */
  ext: string;
  icon: LucideIcon;
  /** The icon tile's colours, and the matching text colour for the preview sheet. */
  tile: string;
  band: string;
}

const kind = (icon: LucideIcon, tile: string, band: string) => ({ icon, tile, band });

const RED = kind(FileText, "bg-red-500/12 text-red-600 dark:text-red-400", "bg-red-500");
const BLUE = kind(FileText, "bg-blue-500/12 text-blue-600 dark:text-blue-400", "bg-blue-500");
const GREEN = kind(
  FileSpreadsheet,
  "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  "bg-emerald-500",
);
const ORANGE = kind(Presentation, "bg-orange-500/12 text-orange-600 dark:text-orange-400", "bg-orange-500");
const AMBER = kind(FileArchive, "bg-amber-500/14 text-amber-700 dark:text-amber-400", "bg-amber-500");
const SLATE = kind(FileText, "bg-slate-500/12 text-slate-600 dark:text-slate-400", "bg-slate-500");
const PURPLE = kind(FileImage, "bg-violet-500/12 text-violet-600 dark:text-violet-400", "bg-violet-500");
const PINK = kind(FileAudio, "bg-pink-500/12 text-pink-600 dark:text-pink-400", "bg-pink-500");
const CYAN = kind(FileVideo, "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400", "bg-cyan-500");
const TEAL = kind(FileCode, "bg-teal-500/12 text-teal-600 dark:text-teal-400", "bg-teal-500");
const GREY = kind(File, "bg-slate-500/12 text-slate-600 dark:text-slate-400", "bg-slate-500");

const BY_EXTENSION: Record<string, ReturnType<typeof kind>> = {
  pdf: RED,
  doc: BLUE,
  docx: BLUE,
  rtf: BLUE,
  odt: BLUE,
  xls: GREEN,
  xlsx: GREEN,
  csv: GREEN,
  ods: GREEN,
  ppt: ORANGE,
  pptx: ORANGE,
  odp: ORANGE,
  zip: AMBER,
  rar: AMBER,
  "7z": AMBER,
  tar: AMBER,
  gz: AMBER,
  txt: SLATE,
  md: SLATE,
  log: SLATE,
  png: PURPLE,
  jpg: PURPLE,
  jpeg: PURPLE,
  gif: PURPLE,
  webp: PURPLE,
  svg: PURPLE,
  mp3: PINK,
  wav: PINK,
  ogg: PINK,
  m4a: PINK,
  mp4: CYAN,
  mov: CYAN,
  webm: CYAN,
  json: TEAL,
  xml: TEAL,
  html: TEAL,
};

/** What a file is, from its name: the extension to label it with and the icon and colours to draw it in. */
export function fileKind(name: string | undefined): FileKind {
  const dot = (name ?? "").lastIndexOf(".");
  const ext = dot > 0 ? (name ?? "").slice(dot + 1).toLowerCase() : "";
  const found = BY_EXTENSION[ext] ?? GREY;
  return { ext: ext.toUpperCase(), ...found };
}

/** "84 KB", "1.2 MB": a file's size for people. */
export function fileSize(bytes: number | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
