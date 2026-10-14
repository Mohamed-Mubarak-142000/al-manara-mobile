import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

/** The native splash's colours (app.json, expo-splash-screen): the animation starts exactly where it ends. */
const NATIVE_BG = { light: "#003e32", dark: "#012a22" } as const;
const LOGO = 140;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/** Shown under the app's name. */
const DEVELOPER = "تطوير: محمد مبارك";

/**
 * Played once per launch over the first screen, picking up from the static native splash: an ivory disc
 * grows behind the logo with a gold halo, the logo settles a little higher, the name and tagline rise in,
 * the developer's credit fades in at the foot — then the whole thing dissolves into the app.
 */
export function AnimatedSplash({ play }: { play: boolean }) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const insets = useSafeAreaInsets();
  const [done, setDone] = useState(false);

  const disc = useSharedValue(0);
  const halo = useSharedValue(0);
  const lift = useSharedValue(0);
  const title = useSharedValue(0);
  const credit = useSharedValue(0);
  const veil = useSharedValue(1);

  useEffect(() => {
    if (!play) return;
    disc.set(withTiming(1, { duration: 650, easing: EASE }));
    halo.set(withDelay(250, withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), 2, false)));
    lift.set(withDelay(350, withTiming(1, { duration: 700, easing: EASE })));
    title.set(withDelay(600, withTiming(1, { duration: 700, easing: EASE })));
    credit.set(withDelay(1000, withTiming(1, { duration: 600, easing: EASE })));
    veil.set(
      withSequence(
        withDelay(2300, withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) }, (finished) => {
          if (finished) scheduleOnRN(setDone, true);
        })),
      ),
    );
  }, [play, disc, halo, lift, title, credit, veil]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: veil.get() }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -56 * lift.get() }, { scale: 1 - 0.12 * lift.get() }] }));
  const discStyle = useAnimatedStyle(() => ({ opacity: disc.get(), transform: [{ scale: 0.6 + 0.4 * disc.get() }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - halo.get()), transform: [{ scale: 1 + 0.7 * halo.get() }] }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: title.get(), transform: [{ translateY: 16 * (1 - title.get()) }] }));
  const creditStyle = useAnimatedStyle(() => ({ opacity: credit.get(), transform: [{ translateY: 8 * (1 - credit.get()) }] }));

  if (done) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: NATIVE_BG[scheme] }, rootStyle]}
      accessibilityLabel="المنارة"
    >
      <View className="flex-1 items-center justify-center">
        <Animated.View className="items-center justify-center" style={logoStyle}>
          <Animated.View
            className="absolute rounded-full border-2 border-gold"
            style={[{ width: LOGO + 70, height: LOGO + 70 }, haloStyle]}
          />
          <Animated.View className="absolute rounded-full bg-ivory" style={[{ width: LOGO + 56, height: LOGO + 56 }, discStyle]} />
          <Image source={require("@/assets/images/brand/logo.png")} style={{ width: LOGO, height: LOGO }} contentFit="contain" />
        </Animated.View>
        <Animated.View className="absolute items-center" style={[{ top: "50%", marginTop: LOGO / 2 + 8 }, titleStyle]}>
          <Text className="font-sans-bold text-[40px] leading-15 text-white">المنارة</Text>
          <Text className="font-sans text-base text-gold-soft">علمٌ ينير قلبك، ومعرفةٌ ترافق يومك</Text>
        </Animated.View>
      </View>
      <Animated.View className="items-center" style={[{ paddingBottom: insets.bottom + 28 }, creditStyle]}>
        <Text className="font-sans text-xs text-white/60">{DEVELOPER}</Text>
      </Animated.View>
    </Animated.View>
  );
}
