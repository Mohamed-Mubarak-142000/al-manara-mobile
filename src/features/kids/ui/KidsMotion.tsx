import { useEffect, type ReactNode } from "react";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/**
 * A kids panel's entrance: the same springy, staggered rise as the games menu, so every page arrives the
 * same playful way. With reduced motion it only fades in.
 */
export function KidsEnter({
  index = 0,
  step = 70,
  children,
  className,
  style,
  onLayout,
}: {
  /** Its place in the page: each one starts a little after the one above it. */
  index?: number;
  step?: number;
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const reduceMotion = useReducedMotion();
  const delay = Math.min(index, 8) * step;
  return (
    <Animated.View
      className={className}
      style={style}
      onLayout={onLayout}
      entering={reduceMotion ? FadeIn.delay(delay) : FadeInDown.delay(delay).springify().stiffness(260).damping(18)}
    >
      {children}
    </Animated.View>
  );
}

/** A gentle float up and down, for a loading picture: something alive to look at while the child waits. */
export function KidsBob({ children, distance = 8 }: { children: ReactNode; distance?: number }) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withRepeat(
      withSequence(
        withTiming(-distance, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [distance, reduceMotion, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A soft heartbeat (the music notes on the track that is playing). */
export function KidsBeat({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
