# Umrah guide content provenance

`umrahEvidence.json` is a byte-for-byte copy of eslam-platform/src/features/umrah/umrahEvidence.json,
which the website generates with `node scripts/build-umrah.mjs`. Never edit it here: change the lists
in that script, rebuild on the website, and copy the JSON over. `umrahGuide.ts` is ported by hand.

- **Duas:** Hisn al-Muslim entries from the adhkar snapshot (`src/core/adhkar/adhkarContent.json`),
  played from hisnmuslim.com's recordings: travel (206–208, 211–217), the mosque (20), the talbiya
  (233), the Black Stone (234), between the Yemeni corner and the Stone (235), Safa and Marwa (236),
  and visiting graves (165).
- **Evidence:** hadiths from HadeethEnc with their grade and attribution (each checked to mention what
  it is cited for), and 2:125 (from «وَٱتَّخِذُوا۟» to «مُصَلًّى») and 2:158 from quran.com's reader
  text. The verses play in Alafasy's ayah-by-ayah recitation.
- **Instructions** (`umrahGuide.ts`) are kept to what the scholars agree on. Where common practice
  isn't established, the guide says so: no per-round duas in tawaf, no specific dua on first seeing
  the Kaaba, no special dua for Quba. Rulings with real disagreement (fidya details) are referred to
  scholars rather than decided.
- The two rak'ahs' surahs (al-Kafirun, al-Ikhlas) are from Jabir's hadith in Sahih Muslim, which
  HadeethEnc doesn't carry; the guide names its source in the text.

This documents provenance, not an independent review by a scholar.
