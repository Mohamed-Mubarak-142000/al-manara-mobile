/// <reference types="jest" />
import { buildExpected } from "@/core/tasmee/recitation";
import { clampRange, countsAsReview, describeMistake, heardInAyah, overrideTarget, shownCount } from "@/core/tasmee/session";

describe("tasmee session rules (the website's)", () => {
  it("clamps the range like the website's page: whole surah by default", () => {
    expect(clampRange(undefined, undefined, 7)).toEqual({ from: 1, to: 7 });
    expect(clampRange("3", "2", 7)).toEqual({ from: 3, to: 3 });
    expect(clampRange("0", "99", 7)).toEqual({ from: 1, to: 7 });
    expect(clampRange("9", undefined, 7)).toEqual({ from: 7, to: 7 });
    expect(clampRange("abc", "5", 7)).toEqual({ from: 1, to: 5 });
  });

  it("shows revealed, heard, or the hint's first word", () => {
    expect(shownCount({ revealed: 0, words: 5, heard: 0, hint: false })).toBe(0);
    expect(shownCount({ revealed: 0, words: 5, heard: 0, hint: true })).toBe(1);
    expect(shownCount({ revealed: 2, words: 5, heard: 3, hint: true })).toBe(3);
    expect(shownCount({ revealed: 9, words: 5, heard: 0, hint: false })).toBe(5);
    expect(heardInAyah(7, 4, 5)).toBe(3);
    expect(heardInAyah(2, 4, 5)).toBe(0);
    expect(heardInAyah(20, 4, 5)).toBe(5);
  });

  it("moves past a misheard word but never overrides a skipped ayah", () => {
    expect(overrideTarget({ kind: "wrong", at: 4, heard: "x" })).toBe(5);
    expect(overrideTarget({ kind: "missed", at: 4, count: 2 })).toBe(6);
    expect(overrideTarget({ kind: "skipped-ayah", at: 4, resumeAt: 9 })).toBeNull();
  });

  it("words the mistake dialog like the website", () => {
    const expected = buildExpected([
      ["قل", "هو", "الله", "أحد"],
      ["الله", "الصمد"],
    ]);
    const wrong = describeMistake({ kind: "wrong", at: 2, heard: "الرحمن" }, expected, "١");
    expect(wrong.title).toBe("خطأ في الآية ١");
    expect(wrong.highlight).toEqual([2]);
    expect(wrong.canOverride).toBe(true);
    const missed = describeMistake({ kind: "missed", at: 2, count: 3 }, expected, "١");
    expect(missed.title).toBe("نقصت كلمة في الآية ١");
    // Only the words of the ayah where the gap starts.
    expect(missed.missed).toEqual(["الله", "أحد"]);
    const skipped = describeMistake({ kind: "skipped-ayah", at: 0, resumeAt: 4 }, expected, "١");
    expect(skipped.skippedToAyah).toBe(1);
    expect(skipped.canOverride).toBe(false);
    expect(skipped.instruction).toContain("اقرأ هذه الآية الآن.");
  });

  it("counts a whole, due, mistake-free surah as today's review", () => {
    const now = new Date("2026-10-07T12:00:00Z");
    const base = { ayahFrom: 1, ayahTo: 7, ayahCount: 7, mistakes: 0, dueAt: "2026-10-07T00:00:00Z", now };
    expect(countsAsReview(base)).toBe(true);
    expect(countsAsReview({ ...base, mistakes: 1 })).toBe(false);
    expect(countsAsReview({ ...base, ayahTo: 6 })).toBe(false);
    expect(countsAsReview({ ...base, dueAt: "2026-10-08T00:00:00Z" })).toBe(false);
    expect(countsAsReview({ ...base, dueAt: null })).toBe(false);
  });
});
