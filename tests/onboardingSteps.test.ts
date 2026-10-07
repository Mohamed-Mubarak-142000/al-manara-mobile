/// <reference types="jest" />
import {
  STEP_COUNT,
  applyDelta,
  canGoBack,
  canGoNext,
  clampStep,
  khatmaDays,
  nextStep,
  onboardingSteps,
  prevStep,
  progressFraction,
  slideEdges,
  stepCounter,
  swipeDelta,
} from "@/features/onboarding/steps";

describe("onboarding step navigation", () => {
  it("keeps steps inside bounds", () => {
    expect(STEP_COUNT).toBe(6);
    expect(clampStep(-3)).toBe(0);
    expect(clampStep(9)).toBe(5);
    expect(clampStep(Number.NaN)).toBe(0);
    expect(nextStep(0)).toBe(1);
    expect(nextStep(5)).toBe(5);
    expect(prevStep(0)).toBe(0);
    expect(prevStep(3)).toBe(2);
    expect(canGoNext(5)).toBe(false);
    expect(canGoNext(4)).toBe(true);
    expect(canGoBack(0)).toBe(false);
    expect(canGoBack(1)).toBe(true);
  });

  it("reports progress and an Arabic counter", () => {
    expect(progressFraction(0)).toBeCloseTo(1 / 6);
    expect(progressFraction(5)).toBe(1);
    expect(progressFraction(99)).toBe(1);
    expect(stepCounter(1)).toBe("٢ من ٦");
    expect(stepCounter(1, 3)).toBe("٢ من ٣");
  });

  it("maps swipes by reading direction", () => {
    // RTL: dragging to the right reveals the next step.
    expect(swipeDelta(120, 0, true)).toBe(1);
    expect(swipeDelta(-120, 0, true)).toBe(-1);
    // LTR is mirrored.
    expect(swipeDelta(120, 0, false)).toBe(-1);
    expect(swipeDelta(-120, 0, false)).toBe(1);
    // Too short and slow: nothing.
    expect(swipeDelta(20, 100, true)).toBe(0);
    // A quick flick counts even when short.
    expect(swipeDelta(25, 900, true)).toBe(1);
    expect(swipeDelta(-25, -900, true)).toBe(-1);
  });

  it("applies deltas within bounds", () => {
    expect(applyDelta(2, 1)).toBe(3);
    expect(applyDelta(5, 1)).toBe(5);
    expect(applyDelta(3, 1, 4)).toBe(3);
    expect(applyDelta(0, -1)).toBe(0);
    expect(applyDelta(2, 0)).toBe(2);
  });

  it("asks for an account right after the welcome, only when sign-in is configured", () => {
    expect(onboardingSteps(true)).toEqual(["welcome", "account", "location", "reciter", "wird", "support"]);
    expect(onboardingSteps(false)).toEqual(["welcome", "location", "reciter", "wird", "support"]);
  });

  it("slides from the reading direction", () => {
    expect(slideEdges(1, true)).toEqual({ enterFrom: "left", exitTo: "right" });
    expect(slideEdges(-1, true)).toEqual({ enterFrom: "right", exitTo: "left" });
    expect(slideEdges(1, false)).toEqual({ enterFrom: "right", exitTo: "left" });
  });

  it("estimates khatma length", () => {
    expect(khatmaDays(20)).toBe(31);
    expect(khatmaDays(1)).toBe(604);
    expect(khatmaDays(0)).toBe(604);
  });
});
