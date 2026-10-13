// Ported from eslam-platform/src/features/kids/games/matchGameLogic.ts — keep in sync by hand.
import type { TajweedAyah } from "@/core/quran/tajweedApi";

export interface TajweedMatchTarget {
  id: string;
  text: string;
  ruleClass: string;
}

export interface TajweedMatchDisplaySegment {
  text: string;
  targetId: string | null;
}

export interface TajweedMatchRound {
  ayahNumberInSurah: number;
  displaySegments: TajweedMatchDisplaySegment[];
  targets: TajweedMatchTarget[];
}

const MIN_TARGETS_PER_ROUND = 2;

export function buildTajweedMatchRound(ayah: TajweedAyah): TajweedMatchRound | null {
  const targets: TajweedMatchTarget[] = [];
  const displaySegments: TajweedMatchDisplaySegment[] = ayah.segments.map((segment, index) => {
    if (!segment.ruleClass) return { text: segment.text, targetId: null };
    const id = `t-${index}`;
    targets.push({ id, text: segment.text, ruleClass: segment.ruleClass });
    return { text: segment.text, targetId: id };
  });

  if (targets.length < MIN_TARGETS_PER_ROUND) return null;
  return { ayahNumberInSurah: ayah.numberInSurah, displaySegments, targets };
}

export function pickTajweedRound(ayahs: TajweedAyah[], rng: () => number = Math.random): TajweedMatchRound | null {
  const candidates = ayahs.map(buildTajweedMatchRound).filter((round): round is TajweedMatchRound => round !== null);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)] ?? null;
}

export function checkTajweedMatch(target: TajweedMatchTarget, chosenRuleClass: string): boolean {
  return target.ruleClass === chosenRuleClass;
}
