import { Image } from "expo-image";
import { BellRing, BookOpen, Sparkles, type LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { GlowIcon } from "@/features/onboarding/OnboardingStep";

const VALUES: { icon: LucideIcon; title: string; note: string }[] = [
  { icon: BookOpen, title: "المصحف كاملًا بدون إنترنت", note: "اقرأ وردك في أي مكان، حتى في وضع الطيران." },
  { icon: BellRing, title: "الأذان في وقته حتى والتطبيق مغلق", note: "مواقيت دقيقة لمدينتك تُحسب على هاتفك." },
  { icon: Sparkles, title: "أذكار وتذكير يومي", note: "أذكار الصباح والمساء ووردك اليومي، بلطف ودون إزعاج." },
];

interface WelcomeStepProps {
  reduceMotion: boolean;
  onStart: () => void;
  onSkip: () => void;
}

/** The first screen: the scene behind (drawn by the parent), the logo, a promise in one line, and "ابدأ". */
export function WelcomeStep({ reduceMotion, onStart, onSkip }: WelcomeStepProps) {
  const insets = useSafeAreaInsets();
  const logo = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) logo.set(1);
    else logo.set(withDelay(150, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
  }, [logo, reduceMotion]);

  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.get(), transform: [{ scale: 0.82 + logo.get() * 0.18 }] }));
  const enter = (index: number) => (reduceMotion ? undefined : FadeInDown.duration(700).delay(450 + index * 120));

  return (
    <View className="flex-1" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row justify-end px-5">
        <Pressable accessibilityRole="button" accessibilityLabel="تخطَّ الإعداد" onPress={onSkip} hitSlop={12} className="px-2 py-2">
          <Text className="font-sans-bold text-sm text-white/70">تخطَّ</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: 20, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={logoStyle} className="mb-5 self-center">
          <View className="size-28 items-center justify-center rounded-full border border-gold/30 bg-white/10 shadow-gold">
            <Image
              source={require("@/assets/images/brand/logo.png")}
              contentFit="contain"
              style={{ width: 76, height: 76 }}
              accessibilityLabel="شعار المنارة"
            />
          </View>
        </Animated.View>

        <Animated.Text
          entering={enter(0)}
          accessibilityRole="header"
          className="text-center font-display-bold text-[32px] leading-[52px] text-white"
        >
          المنارة…{"\n"}
          <Text className="text-gold-soft">رفيقك إلى القرآن والذكر</Text>
        </Animated.Text>
        <Animated.Text entering={enter(1)} className="mt-2 text-center font-sans text-base leading-8 text-white/80">
          كل ما تحتاجه لعلاقة يومية هادئة مع كتاب الله، في مكان واحد.
        </Animated.Text>

        <View className="mt-7 gap-4">
          {VALUES.map((value, index) => (
            <Animated.View key={value.title} entering={enter(2 + index)} className="flex-row items-center gap-4">
              <GlowIcon icon={value.icon} size="sm" />
              <View className="flex-1">
                <Text className="font-display-bold text-base text-white">{value.title}</Text>
                <Text className="font-sans text-xs leading-5 text-white/65">{value.note}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <Animated.View entering={enter(5)} className="gap-3 px-5 pt-3">
        <Button variant="gold" size="lg" onPress={onStart} accessibilityHint="يبدأ إعدادًا سريعًا من أربع خطوات">
          ابدأ
        </Button>
        <Text className="text-center font-sans text-xs text-white/55">خطوات قليلة لا تستغرق دقيقة، ويمكنك تغييرها لاحقًا</Text>
      </Animated.View>
    </View>
  );
}
