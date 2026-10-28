/** First-run steps, in order. Pure helpers only: no React Native imports, so they run in plain Jest. */
export const ONBOARDING_STEPS = ["intro", "account", "location", "reciter", "wird", "notifications"] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];
/** The numbered setup steps after the intro cards. */
export type SetupStepId = Exclude<OnboardingStepId, "intro">;

/** The stepper's label under each number. */
export const SETUP_LABELS: Record<SetupStepId, string> = {
  account: "الحساب",
  location: "المدينة",
  reciter: "القارئ",
  wird: "الورد",
  notifications: "التنبيهات",
};

/** The steps this build shows: "account" is left out when sign-in isn't configured. */
export function onboardingSteps(accountsEnabled: boolean): readonly OnboardingStepId[] {
  return accountsEnabled ? ONBOARDING_STEPS : ONBOARDING_STEPS.filter((step) => step !== "account");
}

/** The step after `step`, or null on the last one. */
export function nextStep(steps: readonly OnboardingStepId[], step: OnboardingStepId): OnboardingStepId | null {
  const index = steps.indexOf(step);
  return index >= 0 && index < steps.length - 1 ? steps[index + 1] : null;
}

/** The step before `step`, or null on the first one (Android back then leaves the screen). */
export function previousStep(steps: readonly OnboardingStepId[], step: OnboardingStepId): OnboardingStepId | null {
  const index = steps.indexOf(step);
  return index > 0 ? steps[index - 1] : null;
}

/**
 * Where a first run reopens: the step it was on when the app went away (Android may end the app while
 * Google's sign-in is open in the browser), if this build still shows it; otherwise the start.
 */
export function resumeStep(saved: unknown, steps: readonly OnboardingStepId[]): OnboardingStepId {
  return steps.find((step) => step === saved) ?? steps[0] ?? "intro";
}

/** The intro's main button: "التالي" through the cards, "ابدأ" on the last one. */
export function introButtonLabel(slide: number, count: number): "التالي" | "ابدأ" {
  return slide >= count - 1 ? "ابدأ" : "التالي";
}

/** Days to finish the 604-page mushaf at a daily amount of pages. */
export function khatmaDays(pagesPerDay: number, totalPages = 604): number {
  return Math.ceil(totalPages / Math.max(1, pagesPerDay));
}
