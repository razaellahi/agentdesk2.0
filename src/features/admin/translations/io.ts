import { flatten, invalidValuePath, type Flat, type Tree } from "./tools";

/** Import/export in the formats unified-admin supported: JSON (nested), CSV and Excel (Key/Translation). */

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const rowsOf = (flat: Flat) => Object.entries(flat).map(([Key, Translation]) => ({ Key, Translation }));

export function exportJson(tree: Tree, filename: string) {
  download(new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" }), filename);
}

export async function exportCsv(flat: Flat, filename: string) {
  const Papa = (await import("papaparse")).default;
  download(new Blob([Papa.unparse(rowsOf(flat))], { type: "text/csv;charset=utf-8;" }), filename);
}

export async function exportExcel(flat: Flat, filename: string, sheet = "Translations") {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rowsOf(flat));
  ws["!cols"] = [{ wch: 50 }, { wch: 80 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, filename);
}

export class ImportError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
  }
}

function fromRows(rows: Record<string, unknown>[], format: "CSV" | "Excel"): Flat {
  if (!rows.length || !("Key" in rows[0]!))
    throw new ImportError(`${format} must have 'Key' and 'Translation' columns`);
  const flat: Flat = {};
  for (const row of rows) {
    if (!row.Key || typeof row.Key !== "string") continue;
    flat[row.Key.trim()] = String(row.Translation ?? "");
  }
  return flat;
}

/**
 * Parses an import file into a flat map. The locale comes from the file name
 * (`fr.json` -> "fr"), or null to target the currently selected language.
 */
export async function parseImport(file: File): Promise<{ flat: Flat; locale: string | null }> {
  const parts = file.name.split(".");
  const ext = parts.pop()?.toLowerCase();
  const locale = parts.join(".").toLowerCase() || null;

  if (ext === "json") {
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      throw new ImportError("Invalid JSON syntax");
    }
    if (!json || typeof json !== "object" || Array.isArray(json))
      throw new ImportError("Invalid structure: root must be a JSON object");
    const bad = invalidValuePath(json as Tree);
    if (bad) throw new ImportError(`Validation failed: ${bad}`);
    return { flat: flatten(json as Tree), locale };
  }
  if (ext === "csv") {
    const Papa = (await import("papaparse")).default;
    const result = Papa.parse<Record<string, unknown>>(await file.text(), {
      header: true,
      skipEmptyLines: true,
    });
    if (result.errors.length) throw new ImportError(`CSV parse error: ${result.errors[0]!.message}`);
    return { flat: fromRows(result.data, "CSV"), locale };
  }
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    let rows: Record<string, unknown>[];
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!]!);
    } catch {
      throw new ImportError("Invalid Excel file");
    }
    return { flat: fromRows(rows, "Excel"), locale };
  }
  throw new ImportError("Unsupported format. Use JSON, CSV or Excel.");
}
