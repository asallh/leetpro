import { describe, expect, it } from "vitest";
import { attemptsToCsv, csvField, exportFilename, type ExportAttempt } from "./account-export";

const attempt: ExportAttempt = {
  date: new Date("2026-11-20T18:30:00Z"),
  problem: { title: "Two Sum", slug: "two-sum", difficulty: "easy", url: "https://leetcode.com/problems/two-sum/" },
  attemptNumber: 2,
  result: "solved_independently",
  confidence: 4,
  helpUsed: "none",
  timeMinutes: 12,
  language: "python",
  patterns: ["hash map", "array"],
  approach: "One pass, store complements",
  notes: 'Watch for "same index", twice',
  solution: "def twoSum(): ...",
};

describe("csvField", () => {
  it("leaves plain values alone and blanks nulls", () => {
    expect(csvField("Two Sum")).toBe("Two Sum");
    expect(csvField(4)).toBe("4");
    expect(csvField(null)).toBe("");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvField('a, "b"')).toBe('"a, ""b"""');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
  });

  it("stops spreadsheets running a note as a formula", () => {
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField("@sum")).toBe("'@sum");
  });
});

describe("attemptsToCsv", () => {
  it("writes a header and one row per attempt", () => {
    const lines = attemptsToCsv([attempt]).trimEnd().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      "date,problem,slug,difficulty,attempt,result,confidence,help_used,time_minutes,language,patterns,approach,notes,url",
    );
    expect(lines[1]).toBe(
      '2026-11-20T18:30:00.000Z,Two Sum,two-sum,easy,2,solved_independently,4,none,12,python,hash map; array,"One pass, store complements","Watch for ""same index"", twice",https://leetcode.com/problems/two-sum/',
    );
  });

  it("leaves the solution out of the spreadsheet", () => {
    expect(attemptsToCsv([attempt])).not.toContain("twoSum");
  });

  it("is just the header with no attempts", () => {
    expect(attemptsToCsv([]).trimEnd().split("\r\n")).toHaveLength(1);
  });
});

describe("exportFilename", () => {
  it("dates the file", () => {
    expect(exportFilename("attempts", "csv", new Date("2026-11-25T10:00:00Z"))).toBe("leetpro-attempts-2026-11-25.csv");
  });
});
