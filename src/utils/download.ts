// Saving files from the browser: CSV building and a download that works across browsers

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

// Cells starting with these are run as formulas by spreadsheet apps; a leading quote keeps typed names as plain text
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

// The link must be in the page for Firefox, and the URL kept alive until the click has started the download
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// The byte-order mark makes Excel read the file as UTF-8, so ₦ and accented names survive
export function downloadCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string): void {
  downloadBlob(new Blob(['﻿', toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' }), filename);
}

// e.g. "production-2026-10-21.csv"
export function datedFilename(prefix: string, extension: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}
