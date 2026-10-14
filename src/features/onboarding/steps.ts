/** First-run steps, in order. Pure helpers only: no React Native imports, so they run in plain Jest. */
export const ONBOARDING_STEPS = ["intro", "location"] as const;
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

/** The step before `step`, or null on the first one (Android back then leaves the screen). */
export function previousStep(step: OnboardingStepId): OnboardingStepId | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  return index > 0 ? ONBOARDING_STEPS[index - 1] : null;
}

/** The intro's main button: "التالي" through the cards, "ابدأ" on the last one. */
export function introButtonLabel(slide: number, count: number): "التالي" | "ابدأ" {
  return slide >= count - 1 ? "ابدأ" : "التالي";
}
