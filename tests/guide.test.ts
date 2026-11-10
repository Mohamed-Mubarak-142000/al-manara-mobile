import { GUIDE, GUIDE_GROUPS } from "@/features/guide/catalog";
import { searchGuide } from "@/features/guide/search";
import { SECTION_ART } from "@/features/home/sectionArt";

describe("guide", () => {
  it("has unique, URL-safe ids", () => {
    const ids = GUIDE.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("puts every entry in a known group, with art, a path and steps", () => {
    const groups = new Set(GUIDE_GROUPS.map((group) => group.title));
    for (const entry of GUIDE) {
      expect(groups.has(entry.group)).toBe(true);
      expect(SECTION_ART[entry.art]).toBeDefined();
      expect(entry.path.length).toBeGreaterThan(0);
      expect(entry.steps.length).toBeGreaterThan(0);
      expect(new Set(entry.steps.map((step) => step.title)).size).toBe(entry.steps.length);
    }
  });

  it("names screenshots as plain file keys", () => {
    for (const step of GUIDE.flatMap((entry) => entry.steps)) {
      if (step.shot) expect(step.shot).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("searchGuide", () => {
  it("returns everything for an empty query", () => {
    expect(searchGuide(GUIDE, "  ")).toHaveLength(GUIDE.length);
  });

  it("matches inside steps, ignoring tashkeel", () => {
    expect(searchGuide(GUIDE, "مؤقت النوم").map((entry) => entry.id)).toContain("listen");
    expect(searchGuide(GUIDE, "القِبلة").map((entry) => entry.id)[0]).toBe("qibla");
  });
});
