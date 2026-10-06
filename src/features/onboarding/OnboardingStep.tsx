import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useThemeColor } from "@/theme/useThemeColor";

/** A lucide icon inside two soft gold rings: the visual anchor of every onboarding step. */
export function GlowIcon({ icon: Icon, size = "lg" }: { icon: LucideIcon; size?: "sm" | "md" | "lg" }) {
  const gold = useThemeColor("gold-soft");
  const outer = size === "lg" ? "size-20" : size === "md" ? "size-16" : "size-11";
  const inner = size === "lg" ? "size-14" : size === "md" ? "size-12" : "size-8";
  const iconSize = size === "lg" ? 30 : size === "md" ? 26 : 18;
  return (
    <View className={`${outer} items-center justify-center rounded-full border border-gold/40 bg-gold/15 shadow-gold`}>
      <View className={`${inner} items-center justify-center rounded-full bg-gold/20`}>
        <Icon size={iconSize} color={gold} />
      </View>
    </View>
  );
}

interface StepLayoutProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Wrap the card content in a ScrollView (off when the content brings its own list). */
  scroll?: boolean;
}

/**
 * Shared layout of the setup steps: glowing icon, title and subtitle on the dark scene, then the step's
 * content in a glass card that takes the remaining height and scrolls on small phones.
 */
export function StepLayout({ icon, eyebrow, title, subtitle, children, scroll = true }: StepLayoutProps) {
  const { height } = useWindowDimensions();
  const compact = height < 700;

  return (
    <View className={`flex-1 ${compact ? "gap-3" : "gap-5"}`} style={{ minHeight: 0 }}>
      <View className={`items-center ${compact ? "gap-1.5" : "gap-2.5"}`}>
        <GlowIcon icon={icon} size={compact ? "md" : "lg"} />
        {eyebrow ? <Text className="mt-1 font-sans-bold text-xs text-gold-soft">{eyebrow}</Text> : null}
        <Text
          accessibilityRole="header"
          className={`text-center font-display-bold text-hero-fg ${compact ? "text-2xl leading-[40px]" : "text-[28px] leading-[46px]"}`}
        >
          {title}
        </Text>
        <Text className="px-2 text-center font-sans text-sm leading-7 text-white/75">{subtitle}</Text>
      </View>
      <View className="flex-1 overflow-hidden rounded-[32px] border border-white/10 bg-white/7" style={{ minHeight: 0 }}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View className="flex-1 gap-3 p-4">{children}</View>
        )}
      </View>
    </View>
  );
}

interface StepTopBarProps {
  fraction: number;
  counter: string;
  reduceMotion: boolean;
  onBack: () => void;
  onSkip?: () => void;
}

/** Back button, an animated gold progress bar with "٢ من ٥", and a discreet skip. */
export function StepTopBar({ fraction, counter, reduceMotion, onBack, onSkip }: StepTopBarProps) {
  const heroFg = useThemeColor("hero-fg");
  const width = useSharedValue(fraction);

  useEffect(() => {
    width.set(reduceMotion ? fraction : withTiming(fraction, { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [fraction, reduceMotion, width]);

  const fill = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));

  return (
    <View className="flex-row items-center gap-3 px-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="الخطوة السابقة"
        onPress={onBack}
        hitSlop={10}
        className="size-10 items-center justify-center rounded-full bg-white/10"
      >
        <ChevronRight size={22} color={heroFg} />
      </Pressable>
      <View
        className="flex-1 gap-1.5"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`الخطوة ${counter}`}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      >
        <View className="h-1.5 overflow-hidden rounded-full bg-white/15">
          <Animated.View className="h-full rounded-full bg-gold" style={fill} />
        </View>
        <Text className="font-sans-bold text-xs text-white/60">{counter}</Text>
      </View>
      {onSkip ? (
        <Pressable accessibilityRole="button" accessibilityLabel="تخطَّ الإعداد" onPress={onSkip} hitSlop={10} className="px-1 py-2">
          <Text className="font-sans-bold text-sm text-white/70">تخطَّ</Text>
        </Pressable>
      ) : (
        <View className="w-10" />
      )}
    </View>
  );
}
