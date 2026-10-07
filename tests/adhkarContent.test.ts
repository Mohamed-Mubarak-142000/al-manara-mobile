/// <reference types="jest" />
import { DUAS, DUA_CHAPTERS } from "@/core/adhkar/duasData";

/** The website's scripts/check-adhkar.mjs, so the ported Hisn al-Muslim snapshot keeps its fixes. */
describe("Hisn al-Muslim content", () => {
  const find = (id: string) => {
    const entry = DUAS.find((item) => item.id === id);
    if (!entry) throw new Error(`Missing ${id}`);
    return entry;
  };

  it("covers every source chapter and entry with unique ids", () => {
    expect(new Set(DUAS.map((entry) => entry.id)).size).toBe(DUAS.length);
    expect(new Set(DUAS.map((entry) => entry.chapter)).size).toBe(132);
    const sourceIds = new Set(DUAS.map((entry) => Number(entry.id.split("-")[1])));
    for (let id = 1; id <= 267; id++) expect(sourceIds.has(id)).toBe(true);
    expect(DUA_CHAPTERS.length).toBeGreaterThan(100);
  });

  it("has text, a sunnah.com source and valid counters", () => {
    for (const entry of DUAS) {
      expect(entry.text.trim()).not.toBe("");
      expect(entry.sourceUrl.startsWith("https://sunnah.com/hisn:")).toBe(true);
      if (entry.repeat !== undefined) expect(Number.isInteger(entry.repeat) && entry.repeat > 0).toBe(true);
    }
  });

  it("keeps the verified corrections", () => {
    for (const category of ["morning", "evening"]) {
      expect(find(`hisn-83-${category}`).repeat).toBe(7);
      for (const id of [75, 76, 79, 84, 85]) find(`hisn-${id}-${category}`);
    }
    expect(DUAS.some((entry) => entry.id === "hisn-97-morning")).toBe(false);
    for (const id of [93, 94, 95]) expect(DUAS.some((entry) => entry.id === `hisn-${id}-evening`)).toBe(false);
    expect(find("hisn-78-evening").text).toContain("الْمَصِيرُ");
    expect(find("hisn-77-evening").text).toContain("اللَّيْلَةِ");
    expect(find("hisn-106-sleep-2").repeat).toBe(34);
    expect(find("hisn-69-after-prayer-3").repeat).toBe(1);
    expect(find("hisn-66-after-prayer-0").repeat).toBe(3);
    expect(find("hisn-197-general").text).toBe("وَلَكَ");
  });
});
