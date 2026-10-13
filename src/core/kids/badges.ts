// Ported from eslam-platform/src/features/kids/progress/badges.ts — keep in sync by hand.
import type { KidsProgressState } from "./progressTypes";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import { completedDailyDays } from "./dailyChallenge";
import { isRegionComplete, JOURNEY_REGIONS } from "./journey";
import { countActiveWeeks } from "./rewards";

/** The website stores the lucide icon itself; core stays free of UI imports, so the app maps this name to an icon. */
export type BadgeIcon = "award" | "book-open-check" | "flame" | "headphones" | "map" | "mic" | "palette" | "sparkles" | "star" | "trophy";

export interface BadgeDefinition {
  id: string;
  label: string;
  description: string;
  icon: BadgeIcon;
  isUnlocked: (state: KidsProgressState) => boolean;
}

function countFullyMemorizedSurahs(state: KidsProgressState): number {
  let count = 0;
  for (const [surahId, ayahs] of Object.entries(state.memorizedAyahsBySurah)) {
    const total = getSurahAyahCount(Number(surahId));
    if (total > 0 && ayahs.length >= total) count += 1;
  }
  return count;
}

function hasAnyActivity(state: KidsProgressState): boolean {
  return (
    Object.keys(state.memorizedAyahsBySurah).length > 0 ||
    state.quizStats.attempts > 0 ||
    state.matchStats.tajweedGamesCompleted > 0 ||
    state.matchStats.letterGamesCompleted > 0 ||
    Object.values(state.gameCounts).some((count) => (count ?? 0) > 0) ||
    state.listenStats.surahsCompleted.length > 0
  );
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first-step",
    label: "أول خطوة",
    description: "ابدأ أي نشاط في منطقة الأطفال",
    icon: "sparkles",
    isUnlocked: hasAnyActivity,
  },
  {
    id: "first-surah",
    label: "أول سورة محفوظة",
    description: "احفظ سورة كاملة",
    icon: "book-open-check",
    isUnlocked: (state) => countFullyMemorizedSurahs(state) >= 1,
  },
  {
    id: "five-surahs",
    label: "٥ سور محفوظة",
    description: "احفظ خمس سور كاملة",
    icon: "award",
    isUnlocked: (state) => countFullyMemorizedSurahs(state) >= 5,
  },
  {
    id: "quiz-star",
    label: "نجم الاختبار",
    description: "احصل على العلامة الكاملة في الاختبار",
    icon: "star",
    isUnlocked: (state) => state.quizStats.bestScorePercent >= 100,
  },
  {
    id: "tajweed-artist",
    label: "فنان التجويد",
    description: "أكمل لعبة تلوين التجويد ٣ مرات",
    icon: "palette",
    isUnlocked: (state) => state.matchStats.tajweedGamesCompleted >= 3,
  },
  {
    id: "good-listener",
    label: "مستمع مميز",
    description: "أكمل الاستماع والترديد لثلاث سور",
    icon: "headphones",
    isUnlocked: (state) => state.listenStats.surahsCompleted.length >= 3,
  },
  {
    id: "week-of-quran",
    label: "أسبوع من القرآن",
    description: "تعلّم ٧ أيام متتالية",
    icon: "flame",
    isUnlocked: (state) => countActiveWeeks(state.activityDates) >= 1,
  },
  {
    id: "daily-champion",
    label: "بطل التحديات",
    description: "أكمل تحدي اليوم ٥ مرات",
    icon: "trophy",
    isUnlocked: (state) => completedDailyDays(state).length >= 5,
  },
  {
    id: "recite-star",
    label: "نجم التسميع",
    description: "سمّع بصوتك ٥ مرات",
    icon: "mic",
    isUnlocked: (state) => (state.gameCounts.kids_recite ?? 0) >= 5,
  },
  ...JOURNEY_REGIONS.map((region): BadgeDefinition => ({
    id: `region-${region.id}`,
    label: `${region.emoji} ${region.name}`,
    description: `احفظ كل سور ${region.name}`,
    icon: "map",
    isUnlocked: (state) => isRegionComplete(state, region),
  })),
];

export function computeUnlockedBadgeIds(state: KidsProgressState): string[] {
  return BADGE_DEFINITIONS.filter((badge) => badge.isUnlocked(state)).map((badge) => badge.id);
}
