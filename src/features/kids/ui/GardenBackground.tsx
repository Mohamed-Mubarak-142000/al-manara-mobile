import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { KIDS } from "./kidsStyles";

/** The website's falling leaves: seven, spread across the width, each on its own slow loop. */
const LEAVES = Array.from({ length: 7 }, (_, i) => ({
  left: 0.08 + i * 0.13,
  delay: i * 1700,
  size: 18 + (i % 3) * 8,
  duration: (11 + (i % 4) * 3) * 1000,
  drift: (i % 2 ? 1 : -1) * (40 + i * 12),
  spin: (i % 2 ? 1 : -1) * (180 + i * 25),
}));

function Leaf({ left, delay, size, duration, drift, spin, height, width }: (typeof LEAVES)[number] & { height: number; width: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1));
  }, [delay, duration, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 1,
    transform: [
      { translateY: -60 + progress.value * (height * 1.1 + 60) },
      { translateX: drift * progress.value },
      { rotate: `${spin * progress.value}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ position: "absolute", top: 0, left: left * width, width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 21c0-9 6-16 16-17-1 10-8 16-16 17zm0 0l9-9" fill={KIDS.leaf} stroke={KIDS.leafVein} strokeWidth="1" />
      </Svg>
    </Animated.View>
  );
}

/** The garden scene behind every kids page, slowly breathing, with leaves drifting down. */
export const GardenBackground = memo(function GardenBackground() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withRepeat(withTiming(1.06, { duration: 24000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reduceMotion, scale]);
  const zoom = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, zoom]}>
        <Image source={require("@/assets/images/scenes/garden.jpg")} contentFit="cover" style={StyleSheet.absoluteFill} />
      </Animated.View>
      <LinearGradient
        colors={["rgba(224,242,254,0.10)", "rgba(0,0,0,0)", "rgba(1,42,34,0.25)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {!reduceMotion && LEAVES.map((leaf, index) => <Leaf key={index} {...leaf} width={width} height={height} />)}
    </View>
  );
});
