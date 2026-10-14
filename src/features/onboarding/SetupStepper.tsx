import { Check } from "lucide-react-native";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { toArabicDigits } from "@/core/text/arabic";
import { useThemeColor } from "@/theme/useThemeColor";

import { SETUP_LABELS, type SetupStepId } from "./steps";

const CIRCLE = 38;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

function StepDot({ number, state, reduceMotion }: { number: number; state: "done" | "current" | "next"; reduceMotion: boolean }) {
  const onPrimary = useThemeColor("on-primary");
  const grow = useSharedValue(state === "current" ? 1 : 0);
  useEffect(() => {
    const target = state === "current" ? 1 : 0;
    grow.set(reduceMotion ? target : withTiming(target, { duration: 320, easing: EASE }));
  }, [grow, reduceMotion, state]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + grow.get() * 0.1 }] }));
  const box =
    state === "done"
      ? "bg-primary border-primary"
      : state === "current"
        ? "bg-surface border-primary border-2"
        : "bg-surface border-border";
  return (
    <Animated.View style={[{ width: CIRCLE, height: CIRCLE }, style]} className={`items-center justify-center rounded-full border ${box}`}>
      {state === "done" ? (
        <Check size={18} color={onPrimary} strokeWidth={2.6} />
      ) : (
        <Text className={`font-sans-bold text-sm ${state === "current" ? "text-primary" : "text-fg-muted"}`}>
          {toArabicDigits(String(number).padStart(2, "0"))}
        </Text>
      )}
    </Animated.View>
  );
}

/**
 * The numbered setup steps (٠١ الحساب، ٠٢ المدينة…), joined by a line that fills up to the current one:
 * the user always sees where they are and how much is left.
 */
export function SetupStepper({
  steps,
  current,
  reduceMotion,
}: {
  steps: readonly SetupStepId[];
  current: SetupStepId;
  reduceMotion: boolean;
}) {
  const index = Math.max(0, steps.indexOf(current));
  const fraction = steps.length > 1 ? index / (steps.length - 1) : 1;
  // Each step takes an equal column, so the first and last centres sit half a column in.
  const inset = `${50 / steps.length}%` as const;
  const fill = useSharedValue(fraction);
  useEffect(() => {
    fill.set(reduceMotion ? fraction : withTiming(fraction, { duration: 420, easing: EASE }));
  }, [fill, fraction, reduceMotion]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View
      className="px-3"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`الخطوة ${toArabicDigits(index + 1)} من ${toArabicDigits(steps.length)}: ${SETUP_LABELS[current]}`}
    >
      <View>
        {/* The line runs between the first and last circle centres, behind them. */}
        <View className="absolute h-0.5 overflow-hidden rounded-full bg-border" style={{ top: CIRCLE / 2 - 1, start: inset, end: inset }}>
          <Animated.View className="h-full rounded-full bg-primary" style={fillStyle} />
        </View>
        <View className="flex-row">
          {steps.map((step, stepIndex) => {
            const state = stepIndex < index ? "done" : stepIndex === index ? "current" : "next";
            return (
              <View key={step} className="flex-1 items-center gap-1.5">
                <StepDot number={stepIndex + 1} state={state} reduceMotion={reduceMotion} />
                <Text numberOfLines={1} className={`font-sans-bold text-xs ${state === "next" ? "text-fg-muted" : "text-fg"}`}>
                  {SETUP_LABELS[step]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
