// Ported from eslam-platform/src/features/adhkar/duasData.ts — keep in sync by hand.
export type DuaCategory = "morning" | "evening" | "sleep" | "after-prayer" | "general";

export const DUA_CATEGORY_LABELS: Record<DuaCategory, string> = {
  morning: "أذكار الصباح",
  evening: "أذكار المساء",
  sleep: "أذكار النوم",
  "after-prayer": "بعد الصلاة",
  general: "أدعية يومية",
};

export interface Dua {
  id: string;
  title: string;
  text: string;
  source: string;
  category: DuaCategory;
  /** Repetitions established by the source, when known. Left unset rather than guessed. */
  repeat?: number;
}

// Seed content: short, widely-known adhkar chosen for low transcription risk, each with its source.
// A qualified religious reviewer should verify wording and sourcing before this list is treated
// as production-ready content.
export const DUAS: Dua[] = [
  {
    id: "m-bismillah-la-yadur",
    title: "الحفظ من كل ضر",
    text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    source: "رواه أبو داود والترمذي",
    category: "morning",
    repeat: 3,
  },
  {
    id: "m-raditu",
    title: "الرضا بالله",
    text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا",
    source: "رواه أبو داود",
    category: "morning",
    repeat: 3,
  },
  {
    id: "m-subhan-bihamdih",
    title: "التسبيح",
    text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    source: "رواه مسلم",
    category: "morning",
    repeat: 100,
  },
  {
    id: "waking-up",
    title: "عند الاستيقاظ",
    text: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
    source: "رواه البخاري",
    category: "morning",
  },

  {
    id: "e-bismillah-la-yadur",
    title: "الحفظ من كل ضر",
    text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    source: "رواه أبو داود والترمذي",
    category: "evening",
    repeat: 3,
  },
  {
    id: "e-audhu",
    title: "الاستعاذة",
    text: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    source: "رواه مسلم",
    category: "evening",
    repeat: 3,
  },
  {
    id: "e-raditu",
    title: "الرضا بالله",
    text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا",
    source: "رواه أبو داود",
    category: "evening",
    repeat: 3,
  },
  {
    id: "e-subhan-bihamdih",
    title: "التسبيح",
    text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    source: "رواه مسلم",
    category: "evening",
    repeat: 100,
  },

  { id: "sleeping", title: "عند النوم", text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", source: "رواه البخاري", category: "sleep" },
  { id: "s-tasbih", title: "التسبيح قبل النوم", text: "سُبْحَانَ اللَّهِ", source: "متفق عليه", category: "sleep", repeat: 33 },
  { id: "s-tahmid", title: "التحميد قبل النوم", text: "الْحَمْدُ لِلَّهِ", source: "متفق عليه", category: "sleep", repeat: 33 },
  { id: "s-takbir", title: "التكبير قبل النوم", text: "اللَّهُ أَكْبَرُ", source: "متفق عليه", category: "sleep", repeat: 34 },

  { id: "p-istighfar", title: "الاستغفار", text: "أَسْتَغْفِرُ اللَّهَ", source: "رواه مسلم", category: "after-prayer", repeat: 3 },
  {
    id: "p-salam",
    title: "بعد السلام",
    text: "اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ",
    source: "رواه مسلم",
    category: "after-prayer",
  },
  { id: "p-tasbih", title: "التسبيح", text: "سُبْحَانَ اللَّهِ", source: "رواه مسلم", category: "after-prayer", repeat: 33 },
  { id: "p-tahmid", title: "التحميد", text: "الْحَمْدُ لِلَّهِ", source: "رواه مسلم", category: "after-prayer", repeat: 33 },
  { id: "p-takbir", title: "التكبير", text: "اللَّهُ أَكْبَرُ", source: "رواه مسلم", category: "after-prayer", repeat: 33 },

  { id: "before-meal", title: "قبل الطعام", text: "بِسْمِ اللَّهِ", source: "حديث نبوي", category: "general" },
  {
    id: "after-meal",
    title: "بعد الطعام",
    text: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ",
    source: "حديث نبوي",
    category: "general",
  },
  {
    id: "leaving-home",
    title: "عند الخروج من المنزل",
    text: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
    source: "رواه أبو داود والترمذي",
    category: "general",
  },
  {
    id: "travel",
    title: "عند الركوب والسفر",
    text: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ",
    source: "القرآن الكريم — سورة الزخرف",
    category: "general",
  },
  {
    id: "for-parents",
    title: "دعاء للوالدين",
    text: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    source: "القرآن الكريم — سورة الإسراء",
    category: "general",
  },
];
