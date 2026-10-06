import { toArabicDigits } from "@/core/text/arabic";

/** First-run steps, in order. Pure helpers only: no React Native imports, so they run in plain Jest. */
export const ONBOARDING_STEPS = ["welcome", "location", "reciter", "wird", "support"] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];
export const STEP_COUNT = ONBOARDING_STEPS.length;

/** +1 moves forward (towards "support"), -1 moves back, 0 stays. */
export type StepDelta = -1 | 0 | 1;

export function clampStep(step: number, count: number = STEP_COUNT): number {
  if (!Number.isFinite(step)) return 0;
  return Math.min(count - 1, Math.max(0, Math.trunc(step)));
}

export function nextStep(step: number, count: number = STEP_COUNT): number {
  return clampStep(step + 1, count);
}

export function prevStep(step: number, count: number = STEP_COUNT): number {
  return clampStep(step - 1, count);
}

export function canGoNext(step: number, count: number = STEP_COUNT): boolean {
  return clampStep(step, count) < count - 1;
}

export function canGoBack(step: number, count: number = STEP_COUNT): boolean {
  return clampStep(step, count) > 0;
}

/** 0…1 filled share of the progress bar: the first step is already 1/count, the last one is full. */
export function progressFraction(step: number, count: number = STEP_COUNT): number {
  return (clampStep(step, count) + 1) / count;
}

/** "٢ من ٥" */
export function stepCounter(step: number, count: number = STEP_COUNT): string {
  return `${toArabicDigits(clampStep(step, count) + 1)} من ${toArabicDigits(count)}`;
}

/**
 * Maps a finished horizontal swipe to a step change. In RTL the next step sits to the left, so pulling
 * the content to the right (positive translationX) goes forward, like turning a page in an Arabic book.
 * LTR is the mirror image. A short drag still counts when it is a quick flick.
 */
export function swipeDelta(
  translationX: number,
  velocityX: number,
  isRTL: boolean,
  { distance = 60, velocity = 600 }: { distance?: number; velocity?: number } = {},
): StepDelta {
  const far = Math.abs(translationX) >= distance;
  const quick = Math.abs(velocityX) >= velocity && Math.abs(translationX) >= distance / 3;
  if (!far && !quick) return 0;
  const towardsRight = (far ? translationX : velocityX) > 0;
  return towardsRight === isRTL ? 1 : -1;
}

/** Applies a delta within bounds; returns the same step when the move is not possible. */
export function applyDelta(step: number, delta: StepDelta, count: number = STEP_COUNT): number {
  if (delta === 1) return nextStep(step, count);
  if (delta === -1) return prevStep(step, count);
  return clampStep(step, count);
}

/**
 * Which physical edges a step transition uses. Going forward in RTL, the new step slides in from the left
 * and the old one leaves to the right; going back (or in LTR) it is mirrored.
 */
export function slideEdges(direction: 1 | -1, isRTL: boolean): { enterFrom: "left" | "right"; exitTo: "left" | "right" } {
  const fromLeft = (direction === 1) === isRTL;
  return fromLeft ? { enterFrom: "left", exitTo: "right" } : { enterFrom: "right", exitTo: "left" };
}

/** Days to finish the 604-page mushaf at a daily amount of pages. */
export function khatmaDays(pagesPerDay: number, totalPages = 604): number {
  return Math.ceil(totalPages / Math.max(1, pagesPerDay));
}
