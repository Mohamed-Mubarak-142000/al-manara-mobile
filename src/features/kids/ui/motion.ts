import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

/** A wrong pick shakes; the right answer pops (the website's motion on the choices). */
export function useShake(trigger: unknown, kind: "shake" | "pop" | null) {
  const x = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (kind === "shake")
      x.value = withSequence(withTiming(-10, { duration: 70 }), withTiming(10, { duration: 80 }), withTiming(-6, { duration: 80 }), withTiming(6, { duration: 80 }), withTiming(0, { duration: 70 }));
    if (kind === "pop") scale.value = withSequence(withTiming(1.06, { duration: 200 }), withTiming(1, { duration: 200 }));
  }, [trigger, kind, x, scale]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: scale.value }] }));
}
