import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useThemeColor } from "@/theme/useThemeColor";

import { useKidsSeen } from "./kidsSeen";
import { SECTION_ART } from "./sectionArt";

/** A gentle, repeating pulse that draws the eye to the garden until it has been opened once. */
function NewBadge() {
  const night = useThemeColor("emerald-night");
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withRepeat(withSequence(withTiming(1.12, { duration: 650 }), withTiming(1, { duration: 650 })), -1);
    return () => cancelAnimation(scale);
  }, [reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style} className="flex-row items-center gap-1 rounded-full bg-gold px-2.5 py-1">
      <Sparkles size={12} color={night} />
      <Text className="font-sans-bold text-xs text-emerald-night">جديد</Text>
    </Animated.View>
  );
}

/** The kids' Quran garden, one tap from Home: its own garden scene, so children recognise the door. */
export function KidsBanner() {
  const night = useThemeColor("emerald-night");
  const seen = useKidsSeen();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={seen ? "حديقة القرآن للأطفال" : "جديد: حديقة القرآن للأطفال"}
      accessibilityHint="يفتح قسم الأطفال: رحلة السور والألعاب والقصص"
      onPress={() => router.push("/kids")}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      {/* Edge to edge: the garden scene runs the full width of the screen. */}
      <View className="h-48 overflow-hidden">
        <Image
          source={require("@/assets/images/scenes/garden.jpg")}
          contentFit="cover"
          contentPosition="center"
          transition={200}
          style={{ position: "absolute", inset: 0 }}
        />
        {/* Darkens the reading side (start, in RTL the right) so the white text stays legible. */}
        <LinearGradient
          colors={["rgba(1,42,34,0.82)", "rgba(1,42,34,0.35)", "transparent"]}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={{ position: "absolute", inset: 0 }}
        />
        <View className="flex-1 justify-center gap-1.5 p-5">
          <View className="flex-row items-center gap-2 self-start">
            <View className="rounded-full bg-white/90 px-3 py-1">
              <Text className="font-kids text-xs text-emerald-night">للأطفال</Text>
            </View>
            {!seen && <NewBadge />}
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="font-kids text-2xl leading-10 text-white">حديقة القرآن</Text>
            <Image source={SECTION_ART.kids} style={{ width: 30, height: 30 }} contentFit="contain" accessible={false} />
          </View>
          <Text className="w-2/3 font-sans text-xs leading-5 text-white/85">رحلة في السور، وألعاب، وقصص، وجوائز لطفلك</Text>
          <View className="mt-1 flex-row items-center gap-1 self-start rounded-full bg-gold px-3.5 py-1.5">
            <Text className="font-sans-bold text-xs text-emerald-night">ادخل الحديقة</Text>
            <ArrowLeft size={14} color={night} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
