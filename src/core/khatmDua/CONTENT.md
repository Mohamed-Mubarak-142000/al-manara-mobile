# Khatm dua content provenance

`khatmDuaContent.json` is a byte-for-byte copy of eslam-platform/src/features/khatmDua/khatmDuaContent.json,
which the website generates with `node scripts/build-khatm-dua.mjs`. Never edit it here: change the
verse and hadith lists in that script, rebuild on the website, and copy the JSON over.

No dua specific to completing the Quran is established from the Prophet ﷺ; Anas ibn Malik's
practice of gathering his family to make dua at a khatma is reported with an authentic chain
(al-Darimi, Ibn Abi Shaybah). The widely circulated "دعاء ختم القرآن" attributed to Ibn Taymiyya is
not established from him. The screen says both, then lists general duas:

- **Quranic duas:** quran.com's `uthmani_tajweed` text with the colouring removed (the reader's
  own text). When a dua begins mid-verse, the script keeps the verse from the dua's first word
  (matched by its letters, ignoring diacritics) and the screen marks it with an ellipsis.
- **Prophetic duas:** text, grade and attribution from HadeethEnc. HadeethEnc #3057 carries a stray
  kasra in this dua, so #3596 (the same hadith in Muslim) is used.

This documents provenance, not an independent review by a scholar.
