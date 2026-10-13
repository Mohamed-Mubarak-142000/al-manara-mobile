/// <reference types="jest" />
import {
  FINAL_PART,
  NAWAWI,
  NAWAWI_PARTS,
  examSize,
  hadithsOfPart,
  narratorLine,
  parsePartSlug,
  partRange,
  partSlug,
  partTitle,
} from "@/core/nawawi/nawawiData";
import { partStatuses, partsPassed, type NawawiAttemptSummary } from "@/core/nawawi/overview";

describe("Forty Nawawi content", () => {
  it("has the 42 hadiths in order, each with its text, grade, explanation and HadeethEnc link", () => {
    expect(NAWAWI.map((hadith) => hadith.number)).toEqual(Array.from({ length: 42 }, (_, index) => index + 1));
    for (const hadith of NAWAWI) {
      expect(hadith.hadith.trim()).not.toBe("");
      expect(hadith.sayings.length).toBeGreaterThan(0);
      expect(hadith.grade).not.toBe("");
      expect(hadith.explanation.trim()).not.toBe("");
      expect(hadith.url).toMatch(/^https:\/\/hadeethenc\.com\//);
    }
  });

  it("splits the book into four stages that cover every hadith once", () => {
    expect(NAWAWI_PARTS.map((part) => [part.from, part.to])).toEqual([
      [1, 10],
      [11, 20],
      [21, 30],
      [31, 42],
    ]);
    expect(NAWAWI_PARTS.flatMap((part) => hadithsOfPart(part.id))).toHaveLength(42);
    expect(hadithsOfPart(FINAL_PART)).toHaveLength(42);
    expect(partTitle(1)).toBe("المرحلة الأولى");
    expect(partTitle(FINAL_PART)).toBe("الاختبار النهائي");
    expect(partRange(4)).toBe("الأحاديث ٣١–٤٢");
    expect(examSize(2)).toEqual({ questions: 10, minutes: 15 });
    expect(examSize(FINAL_PART)).toEqual({ questions: 20, minutes: 30 });
  });

  it("names the exam's URL segment both ways", () => {
    expect(partSlug(3)).toBe("3");
    expect(partSlug(FINAL_PART)).toBe("final");
    expect(parsePartSlug("final")).toBe(FINAL_PART);
    expect(parsePartSlug("4")).toBe(4);
    expect(parsePartSlug("5")).toBeNull();
    expect(parsePartSlug("x")).toBeNull();
  });

  it("blesses the narrator in the right gender and number", () => {
    expect(narratorLine({ narrator: "أبي هريرة" })).toBe("عن أبي هريرة رضي الله عنه");
    expect(narratorLine({ narrator: "عائشة أم المؤمنين" })).toBe("عن عائشة أم المؤمنين رضي الله عنها");
    expect(narratorLine({ narrator: "عبد الله بن عباس وأبي سعيد" })).toMatch(/عنهما$/);
  });
});

describe("Forty Nawawi progress", () => {
  const now = Date.parse("2026-10-13T12:00:00Z");
  const later = "2026-10-13T12:10:00Z";
  const earlier = "2026-10-13T11:00:00Z";
  const attempt = (part: number, status: string, score: number | null, expires_at = earlier): NawawiAttemptSummary => ({
    part,
    status,
    score,
    total: 10,
    expires_at,
  });

  it("keeps a stage passed by its best pass, even after a later failure", () => {
    const parts = partStatuses([attempt(1, "failed", 3), attempt(1, "passed", 8), attempt(1, "passed", 10)], now);
    expect(parts[1]).toEqual({ kind: "passed", score: 10, total: 10 });
  });

  it("shows a running attempt until it expires, then the last score", () => {
    expect(partStatuses([attempt(2, "in_progress", null, later)], now)[2]).toEqual({ kind: "in-progress" });
    expect(partStatuses([attempt(2, "in_progress", null, earlier), attempt(2, "failed", 4)], now)[2]).toEqual({
      kind: "available",
      lastScore: null,
      total: 10,
    });
    expect(partStatuses([], now)[FINAL_PART]).toEqual({ kind: "available", lastScore: null, total: null });
  });

  it("opens the final only when all four stages are passed", () => {
    const three = [1, 2, 3].map((part) => attempt(part, "passed", 9));
    expect(partsPassed(partStatuses(three, now))).toBe(3);
    expect(partsPassed(partStatuses([...three, attempt(4, "passed", 8)], now))).toBe(NAWAWI_PARTS.length);
  });
});
