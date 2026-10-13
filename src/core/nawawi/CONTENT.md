# Forty Nawawi content provenance

`nawawiContent.json` is a byte-for-byte copy of eslam-platform/src/features/nawawi/nawawiContent.json,
which the website generates with `node scripts/build-nawawi.mjs`. Never edit it here: change the list
in that script, rebuild on the website, and copy the JSON over.

- **Source:** HadeethEnc. Most of the 42 come from its set of Ibn Rajab's _Jami' al-'Ulum
  wal-Hikam_ (ids 66510–66540), which holds al-Nawawi's 42; #2, 8, 12, 14–16, 18, 24, 25, 31, 34–36,
  39, 40 and 42 from its general collection. Each entry keeps HadeethEnc's text, grade, attribution,
  explanation and lessons, and links back to it.
- **Check:** the website's script names each hadith's narrator and fails unless the hadith's own
  opening names him, so a wrong id can't slip in. Zero-width non-joiners in the source text are removed.
- **Exams:** generated and graded on the website's server from the Prophet's quoted words
  (`sayings`); the app starts and submits them through `/api/v1/nawawi` and reads the attempt's
  questions (never the answer key) with the learner's own session. Four parts (1–10, 11–20, 21–30,
  31–42) and a final over all 42; the final's pass issues the certificate (`nawawi_certificates`).
- **Certificate quote:** the first sentence of HadeethEnc #5518, «من يرد الله به خيرًا يفقهه في الدين».

This documents provenance, not an independent review by a scholar.
