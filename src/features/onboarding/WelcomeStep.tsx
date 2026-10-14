import { Image } from "expo-image";
import { BellRing, BookOpen, Sparkles, type LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { enterSoft } from "@/components/ui/PageHeader";
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

/** The first screen: the scene as a rounded artwork with the logo on it, a promise in one line, and "ابدأ". */
export function WelcomeStep({ reduceMotion, onStart, onSkip }: WelcomeStepProps) {
  const insets = useSafeAreaInsets();
  const logo = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) logo.set(1);
    else logo.set(withDelay(150, withTiming(1, { duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1) })));
  }, [logo, reduceMotion]);

  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.get(), transform: [{ scale: 0.94 + logo.get() * 0.06 }] }));
  const enter = (index: number) => (reduceMotion ? undefined : enterSoft(index + 3));

  return (
    <View className="flex-1" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row justify-end px-5">
        <Pressable accessibilityRole="button" accessibilityLabel="تخطَّ الإعداد" onPress={onSkip} hitSlop={12} className="px-2 py-2">
          <Text className="font-sans-bold text-sm text-fg-muted">تخطَّ</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* The scene, kept as a rounded artwork inside the gutter, with the logo resting on it. */}
        <Animated.View style={logoStyle} className="mb-6 h-48 items-center justify-center overflow-hidden rounded-4xl bg-hero">
          <Image
            source={require("@/assets/images/scenes/quran-terrace.webp")}
            contentFit="cover"
            style={{ position: "absolute", inset: 0 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <View className="absolute inset-0 bg-hero/40" />
          <View className="size-24 items-center justify-center rounded-full border border-gold/40 bg-hero/60">
            <Image
              source={require("@/assets/images/brand/logo.png")}
              contentFit="contain"
              style={{ width: 64, height: 64 }}
              accessibilityLabel="شعار المنارة"
            />
          </View>
        </Animated.View>

        <Animated.Text
          entering={enter(0)}
          accessibilityRole="header"
          className="text-center font-sans-bold text-[30px] leading-[48px] text-fg"
        >
          المنارة…{"\n"}
          <Text className="text-primary">رفيقك إلى القرآن والذكر</Text>
        </Animated.Text>
        <Animated.Text entering={enter(1)} className="mt-2 text-center font-sans text-base leading-8 text-fg-muted">
          كل ما تحتاجه لعلاقة يومية هادئة مع كتاب الله، في مكان واحد.
        </Animated.Text>

        <View className="mt-6 gap-3">
          {VALUES.map((value, index) => (
            <Animated.View
              key={value.title}
              entering={enter(2 + index)}
              className="flex-row items-center gap-4 rounded-3xl border border-border bg-surface p-4"
            >
              <GlowIcon icon={value.icon} size="sm" />
              <View className="flex-1">
                <Text className="font-sans-bold text-base text-fg">{value.title}</Text>
                <Text className="font-sans text-xs leading-5 text-fg-muted">{value.note}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <Animated.View entering={enter(5)} className="gap-3 px-5 pt-3">
        <Button size="lg" onPress={onStart} accessibilityHint="يبدأ إعدادًا سريعًا من أربع خطوات">
          ابدأ
        </Button>
        <Text className="text-center font-sans text-xs text-fg-muted">خطوات قليلة لا تستغرق دقيقة، ويمكنك تغييرها لاحقًا</Text>
      </Animated.View>
    </View>
  );
}
