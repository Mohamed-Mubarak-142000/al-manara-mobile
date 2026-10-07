import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { HandHeart } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, I18nManager, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  type ExitAnimationsValues,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ALL_DAYS } from "@/core/plan/schedule";
import { Button } from "@/components/ui/Button";
import { useAccount } from "@/features/account/accountStore";
import { khatma } from "@/features/khatma/khatmaStore";
import { AccountStep } from "@/features/onboarding/AccountStep";
import { DonationStep } from "@/features/onboarding/DonationStep";
import { StepTopBar } from "@/features/onboarding/OnboardingStep";
import { LocationStep, ReciterStep, WirdStep } from "@/features/onboarding/SetupSteps";
import { WelcomeStep } from "@/features/onboarding/WelcomeStep";
import { onboarding } from "@/features/onboarding/onboardingStore";
import {
  applyDelta,
  canGoNext,
  progressFraction,
  onboardingSteps,
  slideEdges,
  stepCounter,
  swipeDelta,
  type StepDelta,
} from "@/features/onboarding/steps";
import { ensureAdhanPermission } from "@/features/prayer/adhanScheduler";
import { writeAdhanSettings } from "@/features/prayer/adhanSettings";
import { track } from "@/lib/telemetry";

const SLIDE_MS = 320;

/**
 * First run: a welcome screen, then sign-in (or continue as a guest), city, favourite reciter, daily
 * wird + adhan, and an optional "support" step. Swipe or the buttons move between steps; everything but
 * the account step can be skipped, so sign-in is never passed over by accident.
 */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const isRTL = I18nManager.isRTL;
  const [{ step, direction }, setNav] = useState<{ step: number; direction: 1 | -1 }>({ step: 0, direction: 1 });
  // Nothing preselected: a khatma is only created when the user picks a daily amount.
  const [wird, setWird] = useState<number | null>(null);
  const [adhan, setAdhan] = useState(true);
  const [busy, setBusy] = useState(false);
  // State lags a render behind, so two quick taps would both pass `busy` and create two khatmas.
  const finishing = useRef(false);
  const accountState = useAccount();
  // Decided once: the step list must not change under the user while the session loads.
  const [steps] = useState(() => onboardingSteps(accountState.status !== "guest" || accountState.configured));
  const count = steps.length;
  const id = steps[step];
  const signedIn = accountState.status === "signed-in";

  // The leaving step keeps the props of its last render, so its exit side is read from a shared value set
  // before the step changes; otherwise going back right after going forward would exit the wrong way.
  const exitRight = useSharedValue(1);
  const exitSlide = useCallback(
    (values: ExitAnimationsValues) => {
      "worklet";
      const offset = exitRight.get() === 1 ? values.windowWidth : -values.windowWidth;
      return {
        initialValues: { originX: values.currentOriginX, opacity: 1 },
        animations: {
          originX: withTiming(values.currentOriginX + offset, { duration: SLIDE_MS }),
          opacity: withTiming(0.3, { duration: SLIDE_MS }),
        },
      };
    },
    [exitRight],
  );

  const move = useCallback(
    (delta: StepDelta) => {
      if (delta === 0) return;
      exitRight.set(slideEdges(delta, isRTL).exitTo === "right" ? 1 : 0);
      setNav((current) => {
        const target = applyDelta(current.step, delta, count);
        return target === current.step ? current : { step: target, direction: delta };
      });
    },
    [count, exitRight, isRTL],
  );
  const next = useCallback(() => move(1), [move]);

  // Android back walks back through the steps before leaving the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === 0) return false;
      move(-1);
      return true;
    });
    return () => sub.remove();
  }, [move, step]);

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-24, 24])
        .failOffsetY([-16, 16])
        .onEnd((event) => {
          if (busy) return;
          move(swipeDelta(event.translationX, event.velocityX, isRTL));
        }),
    [busy, isRTL, move],
  );

  // The scene stays bright behind the welcome text and dims under the setup cards.
  const dim = useSharedValue(step === 0 ? 0 : 1);
  useEffect(() => {
    const target = step === 0 ? 0 : 1;
    dim.set(reduceMotion ? target : withTiming(target, { duration: 500 }));
  }, [dim, reduceMotion, step]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.get() }));

  async function finish(then?: "support") {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    try {
      if (wird) await khatma.create({ mode: "amount", unit: "pages", perSession: wird, targetDay: "", days: [...ALL_DAYS] });
      if (adhan && (await ensureAdhanPermission())) writeAdhanSettings({ enabled: true });
    } catch {
      // Both can be set up later from their own screens; never trap the user on the first run.
    }
    onboarding.finish();
    track("onboarding_finished", { wird: wird ?? 0, adhan, support: then === "support" });
    setBusy(false);
    router.replace("/");
    if (then === "support") router.push("/support");
  }

  function skipAll() {
    track("onboarding_skipped", { step: id });
    onboarding.finish();
    router.replace("/");
  }

  const edges = slideEdges(direction, isRTL);
  const entering = reduceMotion
    ? FadeIn.duration(150)
    : (edges.enterFrom === "left" ? SlideInLeft : SlideInRight).duration(SLIDE_MS);
  const exiting = reduceMotion ? FadeOut.duration(120) : exitSlide;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipe}>
        <View className="flex-1 bg-emerald-night">
          <Image source={require("@/assets/images/scenes/quran-terrace.webp")} contentFit="cover" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={["rgba(1,42,34,0.15)", "rgba(1,42,34,0.7)", "#012a22"]}
            locations={[0, 0.42, 0.8]}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, dimStyle]}>
            <LinearGradient
              colors={["rgba(1,42,34,0.55)", "rgba(1,42,34,0.94)", "#012a22"]}
              locations={[0, 0.3, 0.6]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {id === "welcome" ? (
            <Animated.View key="welcome" exiting={reduceMotion ? undefined : FadeOut.duration(250)} style={StyleSheet.absoluteFill}>
              <WelcomeStep reduceMotion={reduceMotion} onStart={() => move(1)} onSkip={skipAll} />
            </Animated.View>
          ) : (
            <Animated.View
              key="setup"
              entering={reduceMotion ? undefined : FadeIn.duration(400)}
              style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
            >
              <StepTopBar
                fraction={progressFraction(step, count)}
                counter={stepCounter(step, count)}
                reduceMotion={reduceMotion}
                onBack={() => move(-1)}
                onSkip={id === "support" || id === "account" ? undefined : skipAll}
              />

              {/* Steps are layered absolutely so the leaving one can slide out while the next slides in. */}
              <View style={{ flex: 1, minHeight: 0 }} className="mt-4 overflow-hidden">
                <Animated.View key={id} entering={entering} exiting={exiting} style={StyleSheet.absoluteFill} className="px-5">
                  {id === "account" && <AccountStep onSignedIn={next} />}
                  {id === "location" && <LocationStep />}
                  {id === "reciter" && <ReciterStep />}
                  {id === "wird" && <WirdStep wird={wird} onWird={setWird} adhan={adhan} onAdhan={setAdhan} />}
                  {id === "support" && <DonationStep onDonate={() => finish("support")} />}
                </Animated.View>
              </View>

              <View className="gap-2 px-5 pt-4">
                {id === "support" ? (
                  <>
                    <Button variant="gold" size="lg" icon={HandHeart} disabled={busy} onPress={() => finish("support")}>
                      {busy ? "لحظة…" : "ادعم الآن"}
                    </Button>
                    <Button variant="light" size="lg" disabled={busy} onPress={() => finish()}>
                      ربما لاحقًا
                    </Button>
                  </>
                ) : id === "account" && !signedIn ? (
                  // While a fresh sign-in loads the account, "continue as guest" would be the wrong button.
                  <Button variant="light" size="lg" disabled={accountState.status === "loading"} onPress={next}>
                    {accountState.status === "loading" ? "لحظة…" : "متابعة كضيف"}
                  </Button>
                ) : (
                  <Button variant="gold" size="lg" disabled={busy || !canGoNext(step, count)} onPress={next}>
                    {id === "wird" ? "متابعة" : "التالي"}
                  </Button>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
