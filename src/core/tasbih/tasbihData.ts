// Ported from eslam-platform/src/features/tasbih/tasbihData.ts — keep in sync by hand. The website's
// radial-gradient stage backgrounds are kept as their three colour stops (the app draws them with
// expo-linear-gradient).

export interface Dhikr {
  id: string;
  text: string;
  /** The usual count for this dhikr; 0 means open counting with no target. */
  target: number;
  /** Where the count comes from, shown under the dhikr. */
  note?: string;
}

export const PRESET_ADHKAR: readonly Dhikr[] = [
  { id: "subhan", text: "سُبْحَانَ اللَّهِ", target: 33, note: "دبر كل صلاة — صحيح مسلم" },
  { id: "hamd", text: "الْحَمْدُ لِلَّهِ", target: 33, note: "دبر كل صلاة — صحيح مسلم" },
  { id: "takbir", text: "اللَّهُ أَكْبَرُ", target: 33, note: "دبر كل صلاة — صحيح مسلم" },
  { id: "subhan-bihamdih", text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", target: 100, note: "مئة مرة في اليوم — صحيح البخاري" },
  { id: "tahlil", text: "لَا إِلَهَ إِلَّا اللَّهُ", target: 100 },
  { id: "istighfar", text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ", target: 100, note: "مئة مرة في اليوم — صحيح مسلم" },
  { id: "salah", text: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ", target: 10 },
  { id: "hawqala", text: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", target: 100, note: "كنز من كنوز الجنة — متفق عليه" },
  {
    id: "subhan-azim",
    text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
    target: 100,
    note: "كلمتان حبيبتان إلى الرحمن — متفق عليه",
  },
  {
    id: "tawhid",
    text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    target: 100,
    note: "مئة مرة في اليوم — متفق عليه",
  },
];

export const TARGET_CHOICES = [33, 100, 1000, 0] as const;

export type TasbihThemeId = "emerald" | "oud" | "night" | "marble" | "turquoise" | "rose";

export interface TasbihTheme {
  id: TasbihThemeId;
  label: string;
  /** Stage background, top to bottom. */
  background: readonly [string, string, string];
  /** Text and icon color on the stage. */
  ink: string;
  /** Text color for secondary labels. */
  soft: string;
  /** Counter face, and the round buttons on the stage. */
  face: string;
  /** Unfilled ring and resting beads. */
  track: string;
  /** Filled ring and counted beads. */
  accent: string;
}

export const TASBIH_THEMES: readonly TasbihTheme[] = [
  {
    id: "emerald",
    label: "زمردي",
    background: ["#0b6b56", "#01382d", "#011f19"],
    ink: "#fbf8f1",
    soft: "rgba(251,248,241,0.7)",
    face: "#012a22",
    track: "rgba(232,215,166,0.22)",
    accent: "#cda23e",
  },
  {
    id: "oud",
    label: "عود",
    background: ["#8a5a2b", "#4a2c14", "#1f130a"],
    ink: "#fff6e8",
    soft: "rgba(255,246,232,0.72)",
    face: "#3a2618",
    track: "rgba(255,166,64,0.25)",
    accent: "#ff9f1c",
  },
  {
    id: "night",
    label: "ليلي",
    background: ["#22305e", "#0e1530", "#060914"],
    ink: "#eef2ff",
    soft: "rgba(238,242,255,0.68)",
    face: "#0b1126",
    track: "rgba(165,180,252,0.2)",
    accent: "#a5b4fc",
  },
  {
    id: "marble",
    label: "رخامي",
    background: ["#ffffff", "#f3ecdc", "#e6dcc4"],
    ink: "#183d34",
    soft: "#68766e",
    face: "#ffffff",
    track: "rgba(0,85,68,0.14)",
    accent: "#005544",
  },
  {
    id: "turquoise",
    label: "فيروزي",
    background: ["#1aa39a", "#0b5f63", "#06353b"],
    ink: "#f0fdfa",
    soft: "rgba(240,253,250,0.72)",
    face: "#073f45",
    track: "rgba(153,246,228,0.22)",
    accent: "#fcd34d",
  },
  {
    id: "rose",
    label: "ورد",
    background: ["#b24a63", "#6e2338", "#3a0f1d"],
    ink: "#fff1f4",
    soft: "rgba(255,241,244,0.72)",
    face: "#4a1526",
    track: "rgba(255,200,212,0.22)",
    accent: "#ffd6a0",
  },
];
