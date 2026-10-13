/// <reference types="jest" />
import { APP_SECTIONS, HOME_SECTIONS, SECTION_GROUPS, sectionsFor } from "@/features/home/sections";

// The icons are ESM-only and irrelevant here: each one is just its name.
jest.mock("lucide-react-native", () => new Proxy({}, { get: (_, name) => (name === "__esModule" ? true : name) }));

describe("home sections", () => {
  it("lists every built section in exactly one group of كل الأقسام", () => {
    const grouped = SECTION_GROUPS.flatMap((group) => group.labels);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(new Set(grouped)).toEqual(new Set(APP_SECTIONS.filter((section) => section.href).map((section) => section.label)));
  });

  it("includes the tasbih, ruqyah and khatm dua screens", () => {
    expect(sectionsFor(["السبحة", "الرقية الشرعية", "دعاء ختم القرآن"]).map((section) => section.href)).toEqual([
      "/tasbih",
      "/ruqyah",
      "/khatm-dua",
    ]);
  });

  it("fills Home's three columns with built sections", () => {
    expect(sectionsFor(HOME_SECTIONS)).toHaveLength(HOME_SECTIONS.length);
    expect(HOME_SECTIONS.length % 3).toBe(0);
  });

  it("gives neighbouring tiles different colours", () => {
    for (const group of SECTION_GROUPS) {
      const tones = sectionsFor(group.labels).map((section) => section.tone);
      expect(new Set(tones).size).toBe(tones.length);
    }
    const home = sectionsFor(HOME_SECTIONS).map((section) => section.tone);
    home.forEach((tone, index) => {
      if (index % 3 !== 0) expect(tone).not.toBe(home[index - 1]);
      if (index >= 3) expect(tone).not.toBe(home[index - 3]);
    });
  });
});
