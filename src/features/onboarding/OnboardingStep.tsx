import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { IconButton } from "@/components/ui/PageHeader";
import { useThemeColor } from "@/theme/useThemeColor";

/** A lucide icon inside two soft primary rings: the visual anchor of every onboarding step. */
export function GlowIcon({ icon: Icon, size = "lg" }: { icon: LucideIcon; size?: "sm" | "md" | "lg" }) {
  const primary = useThemeColor("primary");
  const outer = size === "lg" ? "size-20" : size === "md" ? "size-16" : "size-11";
  const inner = size === "lg" ? "size-14" : size === "md" ? "size-12" : "size-8";
  const iconSize = size === "lg" ? 30 : size === "md" ? 26 : 18;
  return (
    <View className={`${outer} items-center justify-center rounded-full border border-primary/15 bg-primary-soft`}>
      <View className={`${inner} items-center justify-center rounded-full border border-primary/20 bg-surface`}>
        <Icon size={iconSize} color={primary} strokeWidth={1.8} />
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
 * Shared layout of the setup steps: the ringed icon, title and subtitle on the white ground, then the
 * step's content in a bordered card that takes the remaining height and scrolls on small phones.
 */
export function StepLayout({ icon, eyebrow, title, subtitle, children, scroll = true }: StepLayoutProps) {
  const { height } = useWindowDimensions();
  const compact = height < 700;

  return (
    <View className={`flex-1 ${compact ? "gap-3" : "gap-5"}`} style={{ minHeight: 0 }}>
      <View className={`items-center ${compact ? "gap-1.5" : "gap-2.5"}`}>
        <GlowIcon icon={icon} size={compact ? "md" : "lg"} />
        {eyebrow ? <Text className="mt-1 font-sans-bold text-sm text-primary">{eyebrow}</Text> : null}
        <Text
          accessibilityRole="header"
          className={`text-center font-sans-bold text-fg ${compact ? "text-2xl leading-[40px]" : "text-[28px] leading-[46px]"}`}
        >
          {title}
        </Text>
        <Text className="px-2 text-center font-sans text-base leading-7 text-fg-muted">{subtitle}</Text>
      </View>
      <View className="flex-1 overflow-hidden rounded-3xl border border-border bg-surface shadow-card" style={{ minHeight: 0 }}>
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

/** Back button, an animated progress bar with "٢ من ٥", and a discreet skip. */
export function StepTopBar({ fraction, counter, reduceMotion, onBack, onSkip }: StepTopBarProps) {
  const width = useSharedValue(fraction);

  useEffect(() => {
    width.set(reduceMotion ? fraction : withTiming(fraction, { duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
  }, [fraction, reduceMotion, width]);

  const fill = useAnimatedStyle(() => ({ width: `${width.get() * 100}%` }));

  return (
    <View className="flex-row items-center gap-3 px-4">
      <IconButton icon={ChevronRight} label="الخطوة السابقة" onPress={onBack} />
      <View
        className="flex-1 gap-1.5"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`الخطوة ${counter}`}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      >
        <View className="h-1.5 overflow-hidden rounded-full bg-border">
          <Animated.View className="h-full rounded-full bg-primary" style={fill} />
        </View>
        <Text className="font-sans-bold text-xs text-fg-muted">{counter}</Text>
      </View>
      {onSkip ? (
        <Pressable accessibilityRole="button" accessibilityLabel="تخطَّ الإعداد" onPress={onSkip} hitSlop={10} className="px-1 py-2">
          <Text className="font-sans-bold text-sm text-fg-muted">تخطَّ</Text>
        </Pressable>
      ) : (
        <View className="w-12" />
      )}
    </View>
  );
}
