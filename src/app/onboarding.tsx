import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/PageHeader";
import { setAdhkarReminder } from "@/features/adhkar/adhkarReminders";
import { IntroCarousel } from "@/features/onboarding/IntroCarousel";
import { LocationStep } from "@/features/onboarding/LocationStep";
import { onboarding } from "@/features/onboarding/onboardingStore";
import { previousStep, type OnboardingStepId } from "@/features/onboarding/steps";
import { ensureAdhanPermission } from "@/features/prayer/adhanScheduler";
import { writeAdhanSettings } from "@/features/prayer/adhanSettings";
import { snoozeSetupPrompt } from "@/features/settings/SetupPrompt";
import { track } from "@/lib/telemetry";

/**
 * First run: three picture cards of a line each, then the city for the prayer times. Everything else
 * (reciter, daily wird, account) waits for the "complete your settings" invitation on Home.
 */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<OnboardingStepId>("intro");
  const [busy, setBusy] = useState(false);
  // State lags a render behind, so two quick taps would both pass `busy`.
  const finishing = useRef(false);

  // Android back walks back to the intro before leaving the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const back = previousStep(step);
      if (!back) return false;
      setStep(back);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    // The adhan is on from the start; it schedules as soon as notifications are allowed
    // (useAdhanSchedule retries on every return to the app). One permission dialog covers the adhan and
    // the morning/evening adhkar reminders.
    writeAdhanSettings({ enabled: true });
    try {
      if (await ensureAdhanPermission()) {
        await setAdhkarReminder("morning", true);
        await setAdhkarReminder("evening", true);
      }
    } catch {
      // Shown on the settings screen (الإعدادات) instead.
    }
    onboarding.finish();
    // The essentials are set: the "complete your settings" invitation waits a day.
    snoozeSetupPrompt(24 * 60 * 60 * 1000);
    track("onboarding_finished", { adhan: true });
    setBusy(false);
    router.replace("/");
  }

  function skipAll() {
    track("onboarding_skipped", { step });
    onboarding.finish();
    router.replace("/");
  }

  if (step === "intro") {
    return (
      <Animated.View key="intro" exiting={reduceMotion ? undefined : FadeOut.duration(250)} style={{ flex: 1 }}>
        <IntroCarousel reduceMotion={reduceMotion} onDone={() => setStep("location")} onSkip={skipAll} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      key="location"
      entering={reduceMotion ? undefined : FadeIn.duration(400)}
      className="bg-bg"
      style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      <View className="flex-row items-center justify-between px-4">
        <IconButton icon={ChevronRight} label="رجوع" onPress={() => setStep("intro")} />
        <Pressable accessibilityRole="button" accessibilityLabel="تخطَّ" onPress={skipAll} hitSlop={10} className="px-1 py-2">
          <Text className="font-sans-bold text-sm text-fg-muted">تخطَّ</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, minHeight: 0 }} className="mt-4 px-5">
        <LocationStep />
      </View>
      <View className="px-5 pt-4">
        <Button size="lg" disabled={busy} onPress={finish}>
          {busy ? "لحظة…" : "ابدأ"}
        </Button>
      </View>
    </Animated.View>
  );
}
