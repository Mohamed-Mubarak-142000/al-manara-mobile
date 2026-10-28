# Seerah content provenance

`seerahContent.ts`, `seerahEvidence.json` and `arabiaMap.json` are byte-for-byte copies of
eslam-platform/src/features/seerah/. The website builds both JSON files with
`node scripts/build-seerah.mjs`. Never edit any of the three here: change them on the website, rebuild
there, and copy them over.

The website's `CONTENT.md` says where everything comes from and who has reviewed each chapter:

- **The narration:** our own words, following «الرحيق المختوم».
- **The hadiths:** HadeethEnc, with their grades.
- **The verses:** quran.com's reader text.
- **The map:** Natural Earth (public domain). The routes are approximate.
- **The pictures:** the rule for who may be drawn, and with or without a face.
- **The quizzes, choices and tap notes:** part of the review too.

In the app:

- **Drawings:** `src/features/seerah/parts.tsx` draws the panoramas' parts.
- **Sounds:** `scripts/build-seerah-sfx.mjs` renders the sounds into `assets/audio/seerah-*.wav`. They are
  synthesized, with no recordings and no music, the same sounds the website makes live.
