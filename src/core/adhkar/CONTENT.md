# Adhkar content provenance

The local `adhkarContent.json` snapshot was retrieved on 2026-10-05 from
[Hisn al-Muslim's Arabic index](https://www.hisnmuslim.com/api/ar/husn_ar.json)
and each of its 132 chapter endpoints. Each card links to the corresponding
numbered entry at Sunnah.com for its references. No runtime request is required.

Morning and evening formulas are separated using the source's evening instructions.
Morning-only entries 93–95 and evening-only entry 97 appear in their respective sections.
Entry 96 retains its daily, rather than per-session, repetition instruction.
Composite entries 66, 69 and 106 are split into individual counters; the concluding
invocation in entry 69 is read once. Other source instructions and alternate formulas
are retained in the text rather than inferred as additional repetitions.

Corrections verified against Sunnah.com:

- Entry 83: seven repetitions, correcting the API's REPEAT=1.
- Chapter 86: entry 197, “وَلَكَ”, correcting the API's duplicated entry 198.
- Entry 70: includes the source instruction to repeat three times after Fajr/Maghrib.
- Entries 254, 255 and 258: do not apply a counter to the full explanatory hadith.

Run `node scripts/check-adhkar.mjs` to check coverage and counter/content regressions.
This documents source provenance, not an independent hadith authentication review.
