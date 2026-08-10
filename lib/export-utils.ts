/**
 * lib/export-utils.ts
 * Tiny, dependency-free CSV builder + browser download helper for the admin
 * tables (inventory / borrow history). Kept generic so it works for either.
 */

type Cell = string | number | null | undefined;

/** UTF-8 byte-order mark so Excel detects the encoding and shows Thai correctly. */
const BOM = "﻿";

/** Escape a single CSV cell (quote when it contains a comma, quote, or newline). */
function escapeCell(value: Cell): string {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Build a CSV string from a header row and data rows. Prepends a UTF-8 BOM so
 * Excel opens Thai text correctly, and uses CRLF line endings for the same.
 */
export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return BOM + lines.join("\r\n");
}

/** Trigger a client-side download of `csv` as `filename`. Browser only. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
