"use client";

// CSV builder + browser-download trigger. Shared between the allocator and
// chatbot eval runners. Each cell is escaped per RFC 4180 — wrap in quotes if
// the value contains a comma, quote, or newline, and double-up any quotes.

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export type CsvRow = (string | number | boolean | null | undefined)[];

export function buildCsv(header: CsvRow, rows: CsvRow[]): string {
  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari finishes the navigation; otherwise the download silently fails.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function isoTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
}
