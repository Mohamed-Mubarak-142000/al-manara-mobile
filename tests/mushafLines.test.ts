import { getAllAyahs, getPage } from "@/features/mushaf/mushaf";
import { LINES_PER_PAGE, getPageLines, type LineWord } from "@/features/mushaf/mushafLines";

const words = (page: number): LineWord[] => getPageLines(page).flatMap((line) => (line.kind === "text" ? line.words : []));

describe("mushaf line layout", () => {
  it("has 15 lines on every page, and the words carry the ayahs the page holds", () => {
    const ids = getAllAyahs().map((ayah) => ayah.id);
    const seen: number[] = [];
    for (let page = 1; page <= 604; page += 1) {
      expect(getPageLines(page)).toHaveLength(LINES_PER_PAGE);
      const pageWords = words(page);
      const expected = getPage(page).map((ayah) => ayah.id);
      expect([...new Set(pageWords.map((word) => word.ayahId))]).toEqual(expected);
      // Every ayah ends on its page with its own number.
      for (const word of pageWords.filter((entry) => entry.end)) seen.push(word.ayahId);
    }
    expect(seen).toEqual(ids);
  });

  it("joins the tajweed colours of a word, so Android doesn't break it apart", () => {
    const zwj = String.fromCodePoint(0x200d);
    // Page 1's ٱلرَّحۡمَٰنِ: its madd segment opens on a tatweel ("ـٰ").
    const madd = words(1)
      .flatMap((word) => word.tajweed ?? [])
      .find((segment) => segment.ruleClass === "madda_normal" && segment.text.includes("ـ"));
    expect(madd?.text).toBe(`${zwj}ـٰ${zwj}`);
  });

  it("opens surahs with their frame and basmala", () => {
    const page2 = getPageLines(2);
    expect(page2[0]).toEqual({ kind: "surah", surah: 2 });
    expect(page2[1]).toEqual({ kind: "basmala" });
    // At-Tawba has no basmala.
    const tawba = getPageLines(187);
    const frame = tawba.findIndex((line) => line.kind === "surah" && line.surah === 9);
    expect(frame).toBeGreaterThanOrEqual(0);
    expect(tawba[frame + 1]?.kind).toBe("text");
  });

  it("marks Allah's name with its particles, and nothing else", () => {
    const page3 = words(3).filter((word) => word.jalala).map((word) => word.text);
    expect(page3.length).toBeGreaterThan(0);
    const letters = (text: string) => text.replace(/[ً-ٰٟۖ-ۭ]/g, "").replace(/ٱ/g, "ا");
    for (const text of page3) expect(letters(text)).toMatch(/لله/);
    // 2:7 "خَتَمَ ٱللَّهُ" is on page 3; "لَّهُۥ" (to him) never counts.
    expect(words(3).some((word) => letters(word.text) === "الله" && word.jalala)).toBe(true);
    const all = Array.from({ length: 604 }, (_, index) => words(index + 1)).flat();
    const forms = [...new Set(all.filter((word) => word.jalala).map((word) => letters(word.text)))].sort();
    // Only particles before the name: الله، لله، بالله، والله، تالله، وتالله، أبالله، ءالله، اللهم…
    expect(forms).toEqual(expect.arrayContaining(["الله", "لله", "بالله", "والله", "تالله", "اللهم"]));
    for (const form of forms) expect(form).toMatch(/^[وفبتأءٔ]{0,3}ا?لله(م)?$/);
    expect(forms.length).toBeLessThan(15);
  });

  it("parses tajweed into coloured segments that spell the word", () => {
    const coloured = words(3).find((word) => word.tajweed?.some((segment) => segment.ruleClass));
    expect(coloured).toBeDefined();
    expect(coloured!.tajweed!.every((segment) => !/[-]/.test(segment.text))).toBe(true);
  });
});
