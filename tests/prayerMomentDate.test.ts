import { prayerMomentDate } from "@/features/prayer/prayerMomentDate";

describe("prayer timestamps", () => {
  it("uses the selected city's timezone rather than the phone's", () => {
    expect(prayerMomentDate(2026, 1, 15, "05:30", "Africa/Cairo").toISOString()).toBe("2026-01-15T03:30:00.000Z");
    expect(prayerMomentDate(2026, 1, 15, "05:30", "Asia/Riyadh").toISOString()).toBe("2026-01-15T02:30:00.000Z");
  });
  it("handles Cairo daylight saving across the saved schedule", () => {
    expect(prayerMomentDate(2026, 7, 15, "05:30", "Africa/Cairo").toISOString()).toBe("2026-07-15T02:30:00.000Z");
    expect(prayerMomentDate(2026, 11, 15, "05:30", "Africa/Cairo").toISOString()).toBe("2026-11-15T03:30:00.000Z");
  });
  it("rejects malformed times before changing scheduled alarms", () => {
    expect(() => prayerMomentDate(2026, 1, 15, "25:00", "Africa/Cairo")).toThrow();
    expect(() => prayerMomentDate(2026, 1, 15, "broken", "Africa/Cairo")).toThrow();
  });
});
