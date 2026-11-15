/**
 * The written "تفاصيل الحدث" of a chapter, read after its animated story: plain data, copied unchanged into the
 * app with seerahContent.ts. Same rules as the narration (see CONTENT.md): our own words following «الرحيق
 * المختوم», only what the sources agree on, no verse or hadith quoted by hand.
 */
export interface SeerahDetails {
  /** A short table at the top: الزمان، المكان، ... (4–6 rows). */
  facts: { label: string; value: string }[];
  /** In order: الخلفية، ما جرى، شخصيات في الحدث، دروس وعبر. */
  sections: { title: string; paragraphs: string[] }[];
}
