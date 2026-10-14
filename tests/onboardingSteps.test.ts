/// <reference types="jest" />
import { SETUP_LABELS, introButtonLabel, khatmaDays, nextStep, onboardingSteps, previousStep } from "@/features/onboarding/steps";

describe("onboarding steps", () => {
  it("is the intro, the account, then the settings saved to it", () => {
    expect(onboardingSteps(true)).toEqual(["intro", "account", "location", "reciter", "wird", "notifications"]);
  });

  it("leaves the account out when sign-in isn't configured", () => {
    expect(onboardingSteps(false)).toEqual(["intro", "location", "reciter", "wird", "notifications"]);
  });

  it("walks forward and back within the list", () => {
    const steps = onboardingSteps(true);
    expect(nextStep(steps, "intro")).toBe("account");
    expect(nextStep(steps, "wird")).toBe("notifications");
    expect(nextStep(steps, "notifications")).toBeNull();
    expect(previousStep(steps, "location")).toBe("account");
    expect(previousStep(steps, "intro")).toBeNull();
    expect(previousStep(onboardingSteps(false), "location")).toBe("intro");
  });

  it("labels every setup step", () => {
    for (const step of onboardingSteps(true)) if (step !== "intro") expect(SETUP_LABELS[step]).toBeTruthy();
  });

  it("says ابدأ on the last intro card only", () => {
    expect(introButtonLabel(0, 3)).toBe("التالي");
    expect(introButtonLabel(2, 3)).toBe("ابدأ");
  });

  it("estimates khatma length", () => {
    expect(khatmaDays(20)).toBe(31);
    expect(khatmaDays(0)).toBe(604);
  });
});
