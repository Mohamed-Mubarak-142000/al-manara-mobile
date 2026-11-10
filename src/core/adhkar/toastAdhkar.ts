// Ported from eslam-platform/src/features/adhkar/toastAdhkar.ts — keep in sync by hand.
export interface ToastDhikr {
  id: string;
  text: string;
  source: string;
}

// Short, widely attested adhkar only (low transcription risk), each with its source. Every entry is a
// Hisn al-Muslim entry whose human recording, trimmed to the dhikr alone, is the voice of its outside
// notification (assets/audio/dhikr_*.wav, see assets/audio/README.md). Changing an entry means
// re-cutting its recording. Same review convention as duasData.ts: verify with a qualified reviewer.
export const TOAST_ADHKAR: readonly ToastDhikr[] = [
  { id: "istighfar", text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ", source: "رواه البخاري" },
  { id: "salat-nabi", text: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ", source: "الصلاة على النبي ﷺ — الأحزاب: ٥٦" },
  { id: "subhan-bihamdih", text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", source: "متفق عليه" },
  {
    id: "tahlil",
    text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    source: "حصن المسلم — أذكار الصباح والمساء",
  },
  { id: "hasbuna", text: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", source: "آل عمران: ١٧٣" },
  {
    id: "radeetu",
    text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا",
    source: "حصن المسلم — أذكار الصباح والمساء",
  },
  { id: "yunus", text: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", source: "الأنبياء: ٨٧" },
  {
    id: "subhanaka",
    text: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
    source: "حصن المسلم — الذكر بعد الوضوء",
  },
  { id: "aeni", text: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ", source: "حصن المسلم — الدعاء قبل السلام" },
  { id: "jannah", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ", source: "حصن المسلم — الدعاء قبل السلام" },
];
