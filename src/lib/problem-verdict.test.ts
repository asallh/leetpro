import { describe, expect, it } from "vitest";
import { buildVerdict } from "./problem-verdict";

// Local-time dates at midday, so calendar-day counts don't depend on the runner's timezone.
const now = new Date(2026, 10, 18, 12, 0);
const at = (days: number, hour = 12) => new Date(2026, 10, 18 + days, hour, 0);
const tracked = (nextReviewDate: Date | null, status = "review", totalAttempts = 2) => ({
  status,
  totalAttempts,
  nextReviewDate,
});

describe("buildVerdict", () => {
  it("prompts a first attempt when nothing is logged", () => {
    expect(buildVerdict(null, null, now)).toBe("You haven't logged an attempt on this one yet.");
    expect(buildVerdict(tracked(null), null, now)).toBe("You haven't logged an attempt on this one yet.");
  });

  it("gives recall alone when there is no review date", () => {
    expect(buildVerdict(tracked(null), 0.834, now)).toBe("Recall is about 83%.");
  });

  it("says how overdue a review is, measured from the given now", () => {
    expect(buildVerdict(tracked(at(-3)), 0.55, now)).toBe(
      "Recall is about 55%. It came due 3 days ago, so solve it again before it slips further."
    );
  });

  it("says later today for a review due before midnight", () => {
    expect(buildVerdict(tracked(at(0, 20)), 0.72, now)).toBe("Recall is about 72%. The next review is later today.");
  });

  it("says tomorrow for a review due on the next calendar day, even under 24 hours away", () => {
    expect(buildVerdict(tracked(at(1, 8)), 0.75, now)).toBe("Recall is about 75%. The next review is tomorrow.");
  });

  it("gives the date and day count for later reviews", () => {
    expect(buildVerdict(tracked(at(5)), 0.9, now)).toBe("Recall is about 90%. The next review is on Nov 23, in 5 days.");
  });

  it("adds the mastered note only for mastered problems with an upcoming review", () => {
    expect(buildVerdict(tracked(at(26), "mastered", 3), 0.97, now)).toBe(
      "Recall is about 97%. The next review is on Dec 14, in 26 days. Mastered after 3 tries."
    );
    expect(buildVerdict(tracked(at(-1), "mastered", 3), 0.6, now)).not.toContain("Mastered");
  });
});
