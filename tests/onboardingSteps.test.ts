/// <reference types="jest" />
import { ONBOARDING_STEPS, introButtonLabel, previousStep } from "@/features/onboarding/steps";

describe("onboarding steps", () => {
  it("is the intro, then the city", () => {
    expect(ONBOARDING_STEPS).toEqual(["intro", "location"]);
  });

  it("walks back from the city to the intro, and leaves from the intro", () => {
    expect(previousStep("location")).toBe("intro");
    expect(previousStep("intro")).toBeNull();
  });

  it("says ابدأ on the last intro card only", () => {
    expect(introButtonLabel(0, 3)).toBe("التالي");
    expect(introButtonLabel(1, 3)).toBe("التالي");
    expect(introButtonLabel(2, 3)).toBe("ابدأ");
  });
});
