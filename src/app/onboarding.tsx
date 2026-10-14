import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ALL_DAYS } from "@/core/plan/schedule";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/PageHeader";
import { useAccount } from "@/features/account/accountStore";
import { setAdhkarReminder } from "@/features/adhkar/adhkarReminders";
import { khatma } from "@/features/khatma/khatmaStore";
import { IntroCarousel } from "@/features/onboarding/IntroCarousel";
import { LocationStep } from "@/features/onboarding/LocationStep";
import { onboarding } from "@/features/onboarding/onboardingStore";
import { SetupStepper } from "@/features/onboarding/SetupStepper";
import { AccountStep, NotificationsStep, ReciterStep, WirdStep, type NotificationChoices } from "@/features/onboarding/SetupSteps";
import { nextStep, onboardingSteps, previousStep, type OnboardingStepId, type SetupStepId } from "@/features/onboarding/steps";
import { ensureAdhanPermission } from "@/features/prayer/adhanScheduler";
import { writeAdhanSettings } from "@/features/prayer/adhanSettings";
import { savePreferences, useSetupComplete } from "@/features/settings/preferences";
import { snoozeSetupPrompt } from "@/features/settings/SetupPrompt";
import { track } from "@/lib/telemetry";

/**
 * First run: three picture cards, then a numbered stepper — account (sign in, create one, or go on as
 * a guest), city, favourite reciter, daily wird, notifications. Finishing saves it all to the account
 * (user_preferences, plus the khatma), so it follows the user to any phone. An account that was set up
 * before skips straight to Home with its settings restored.
 */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const accountState = useAccount();
  // Decided once: the step list must not change under the user while the session loads.
  const [steps] = useState(() => onboardingSteps(accountState.status !== "guest" || accountState.configured));
  const setupSteps = steps.filter((id): id is SetupStepId => id !== "intro");
  const [step, setStep] = useState<OnboardingStepId>("intro");
  // Nothing preselected: a khatma is only created when the user picks a daily amount.
  const [wird, setWird] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<NotificationChoices>({ adhan: true, adhkar: true });
  const [busy, setBusy] = useState(false);
  // State lags a render behind, so two quick taps would both pass `busy` and create two khatmas.
  const finishing = useRef(false);

  const signedIn = accountState.status === "signed-in";
  const restored = useSetupComplete(signedIn ? accountState.userId : null) && signedIn;

  const leave = useCallback(() => {
    onboarding.finish();
    router.replace("/");
  }, []);

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    try {
      if (wird) await khatma.create({ mode: "amount", unit: "pages", perSession: wird, targetDay: "", days: [...ALL_DAYS] });
    } catch {
      // The khatma can be started later from its own screen; never trap the user on the first run.
    }
    writeAdhanSettings({ enabled: alerts.adhan });
    if (alerts.adhan || alerts.adhkar) {
      // One permission dialog covers the adhan and the reminders. The adhan choice is kept whatever the
      // system answers: it schedules as soon as notifications are allowed.
      try {
        if ((await ensureAdhanPermission()) && alerts.adhkar) {
          await setAdhkarReminder("morning", true);
          await setAdhkarReminder("evening", true);
        }
      } catch {
        // Shown on the settings screen (الإعدادات) instead.
      }
    }
    // Everything chosen above, on the account (or this device for a guest), and setup marked done.
    savePreferences({ complete: true });
    track("onboarding_finished", { wird: wird ?? 0, adhan: alerts.adhan, adhkar: alerts.adhkar, signedIn });
    setBusy(false);
    leave();
  }

  const goNext = useCallback(() => {
    const target = nextStep(steps, step);
    if (target) setStep(target);
  }, [step, steps]);

  // An account set up before already has all of this: straight to Home with its settings.
  const afterSignIn = useCallback(() => {
    if (restored) {
      track("onboarding_finished", { restored: true });
      leave();
    } else goNext();
  }, [goNext, leave, restored]);

  const goBack = useCallback(() => {
    const target = previousStep(steps, step);
    if (target) setStep(target);
  }, [step, steps]);

  // Android back walks back through the steps before leaving the screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!previousStep(steps, step)) return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack, step, steps]);

  function skipAll() {
    track("onboarding_skipped", { step });
    // Skipped: the "complete your settings" invitation on Home comes back tomorrow.
    snoozeSetupPrompt(24 * 60 * 60 * 1000);
    leave();
  }

  if (step === "intro") {
    return (
      <Animated.View key="intro" exiting={reduceMotion ? undefined : FadeOut.duration(250)} style={{ flex: 1 }}>
        <IntroCarousel reduceMotion={reduceMotion} onDone={goNext} onSkip={skipAll} />
      </Animated.View>
    );
  }

  const last = nextStep(steps, step) === null;
  const footer =
    step === "account" && !signedIn ? (
      // While a fresh sign-in loads the account, "continue as guest" would be the wrong button.
      <Button variant="outline" size="lg" className="flex-1" disabled={accountState.status === "loading"} onPress={goNext}>
        {accountState.status === "loading" ? "لحظة…" : "متابعة كضيف"}
      </Button>
    ) : (
      <Button size="lg" className="flex-1" disabled={busy} onPress={last ? finish : step === "account" ? afterSignIn : goNext}>
        {busy ? "لحظة…" : last || (step === "account" && restored) ? "ابدأ" : "التالي"}
      </Button>
    );

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(400)}
      className="bg-bg"
      style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      <View className="flex-row items-center justify-between px-4">
        <IconButton icon={ChevronRight} label="الخطوة السابقة" onPress={goBack} />
        {/* The account step has no skip: sign-in is never passed over by accident. */}
        {step !== "account" ? (
          <Pressable accessibilityRole="button" accessibilityLabel="تخطَّ الإعداد" onPress={skipAll} hitSlop={10} className="px-1 py-2">
            <Text className="font-sans-bold text-sm text-fg-muted">تخطَّ</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-4">
        <SetupStepper steps={setupSteps} current={step} reduceMotion={reduceMotion} />
      </View>

      <View style={{ flex: 1, minHeight: 0 }} className="mt-5 overflow-hidden">
        <Animated.View key={step} entering={reduceMotion ? undefined : FadeIn.duration(260)} style={{ flex: 1 }} className="px-5">
          {step === "account" && <AccountStep onSignedIn={afterSignIn} />}
          {step === "location" && <LocationStep />}
          {step === "reciter" && <ReciterStep />}
          {step === "wird" && <WirdStep wird={wird} onWird={setWird} />}
          {step === "notifications" && <NotificationsStep value={alerts} onChange={setAlerts} />}
        </Animated.View>
      </View>

      <View className="flex-row gap-3 px-5 pt-4">{footer}</View>
    </Animated.View>
  );
}
