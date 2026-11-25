// Everything LeetPro stores about a user, as a JSON document or as a CSV of
// attempts (one row per attempt, the shape of the spreadsheet LeetPro
// replaces). Pure: the route loads the rows and passes them in.

export type ExportAttempt = {
  date: Date;
  problem: { title: string; slug: string; difficulty: string; url: string };
  attemptNumber: number;
  result: string;
  confidence: number;
  helpUsed: string;
  timeMinutes: number | null;
  language: string | null;
  patterns: string[];
  approach: string | null;
  notes: string | null;
  solution: string | null;
};

export const CSV_COLUMNS = [
  "date",
  "problem",
  "slug",
  "difficulty",
  "attempt",
  "result",
  "confidence",
  "help_used",
  "time_minutes",
  "language",
  "patterns",
  "approach",
  "notes",
  "url",
] as const;

/** Quotes a CSV field when it holds a comma, quote or line break. */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Spreadsheets run a cell that starts with = + - @ as a formula. Notes are
  // free text, so neutralise that before anyone opens the file.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function attemptsToCsv(attempts: ExportAttempt[]): string {
  const rows = attempts.map((a) =>
    [
      a.date.toISOString(),
      a.problem.title,
      a.problem.slug,
      a.problem.difficulty,
      a.attemptNumber,
      a.result,
      a.confidence,
      a.helpUsed,
      a.timeMinutes,
      a.language,
      a.patterns.join("; "),
      a.approach,
      a.notes,
      a.problem.url,
    ]
      .map(csvField)
      .join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}

/** A dated filename such as leetpro-attempts-2026-11-25.csv. */
export function exportFilename(kind: "attempts" | "data", ext: "csv" | "json", now: Date): string {
  return `leetpro-${kind}-${now.toISOString().slice(0, 10)}.${ext}`;
}
