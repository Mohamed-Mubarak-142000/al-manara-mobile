/// <reference types="jest" />
import { CONTACT_EMAIL, PRIVACY, TERMS, missionText, splitEmails } from "@/core/legal/legalContent";

describe("legal content", () => {
  it("keeps the website's section counts and dates", () => {
    expect(PRIVACY.sections).toHaveLength(10);
    expect(TERMS.sections).toHaveLength(9);
    expect(PRIVACY.updated).toBe("28 سبتمبر 2026");
    expect(TERMS.updated).toBe("28 سبتمبر 2026");
  });

  it("gives every section a title and either a paragraph or bullets", () => {
    for (const section of [...PRIVACY.sections, ...TERMS.sections]) {
      expect(section.title.trim()).not.toBe("");
      expect(Boolean(section.body?.length) || Boolean(section.bullets?.length)).toBe(true);
    }
  });

  it("links the terms to the native privacy page", () => {
    const runs = TERMS.sections.find((section) => section.title === "الخصوصية")?.body ?? [];
    expect(runs).toContainEqual({ text: "سياسة الخصوصية", route: "/privacy" });
  });

  it("takes the mission line from the privacy policy's first section", () => {
    expect(missionText()).toBe(
      "المنارة منصة عربية مجانية لقراءة القرآن الكريم والاستماع إليه وحفظه، مع مساحة تعليمية للأطفال.",
    );
  });

  it("splits emails out of text without the sentence's final period", () => {
    expect(splitEmails(`راسلنا على ${CONTACT_EMAIL}.`)).toEqual([
      { kind: "text", text: "راسلنا على " },
      { kind: "email", text: CONTACT_EMAIL },
      { kind: "text", text: "." },
    ]);
    expect(splitEmails("بلا بريد")).toEqual([{ kind: "text", text: "بلا بريد" }]);
  });
});
