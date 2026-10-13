# Ruqyah content provenance

`ruqyahContent.json` is a byte-for-byte copy of eslam-platform/src/features/ruqyah/ruqyahContent.json,
which the website generates with `node scripts/build-ruqyah.mjs`. Never edit it here: change the
passage and hadith lists in that script, rebuild on the website, and copy the JSON over.

- **Verses:** quran.com's Hafs text, the encoding the Uthmanic Hafs font is drawn for (api.alquran.cloud's
  text drops the tatweel before a dagger alif, which the font then draws as a dotted circle). Audio
  is Mishary Alafasy's ayah-by-ayah recitation, by global ayah number (the app's `alafasy` voice, so
  a saved ayah pack plays from the device).
- **Which verses:** passages the Sunnah names for protection or healing carry a `sunnah` note with
  its source (al-Fatiha, Ayat al-Kursi, the end of al-Baqarah, al-Ikhlas and the Mu'awwidhatayn).
  The others are the selection reciters customarily use; the screen says so.
- **Hadiths:** text, grade and attribution from HadeethEnc's ruqyah category; each card links to
  its explanation there. The words to say are the quoted part of the hadith, cut by the markers
  in the website's script.

This documents provenance, not an independent review by a scholar.
