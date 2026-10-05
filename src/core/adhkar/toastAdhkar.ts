// Ported from eslam-platform/src/features/adhkar/toastAdhkar.ts — keep in sync by hand.
export interface ToastDhikr {
  id: string;
  text: string;
  source: string;
}

// Short, widely attested adhkar and Quranic duas only (low transcription risk), each with its
// source. Same review convention as duasData.ts: verify with a qualified reviewer before launch.
export const TOAST_ADHKAR: readonly ToastDhikr[] = [
  { id: "subhan-bihamdih", text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ", source: "متفق عليه" },
  { id: "hawqala", text: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", source: "متفق عليه" },
  { id: "baqiyat", text: "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ", source: "رواه مسلم" },
  { id: "istighfar", text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ", source: "رواه البخاري" },
  { id: "salat-nabi", text: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ", source: "الصلاة على النبي ﷺ — الأحزاب: ٥٦" },
  {
    id: "dunya-akhira",
    text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    source: "البقرة: ٢٠١",
  },
  { id: "zidni-ilma", text: "رَبِّ زِدْنِي عِلْمًا", source: "طه: ١١٤" },
  { id: "hasbuna", text: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", source: "آل عمران: ١٧٣" },
  { id: "yunus", text: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", source: "الأنبياء: ٨٧" },
  { id: "tahlil", text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ", source: "متفق عليه" },
];
