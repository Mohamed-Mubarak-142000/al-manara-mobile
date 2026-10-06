import { router } from "expo-router";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Divider } from "@/components/ui/Ornament";
import { useTextScale } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

interface BackHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Shown above the kicker (the about screen's logo). */
  children?: ReactNode;
}

/**
 * PageHeader's emerald hero for pushed screens: the same kicker pill, title and gold divider, with a
 * back button on top (PageHeader itself is for tabs and has none).
 */
export function BackHeader({ kicker, title, description, icon: Icon, children }: BackHeaderProps) {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const goldSoft = useThemeColor("gold-soft");
  const textScale = useTextScale();
  const enter = (index: number) => FadeInDown.duration(600).delay(index * 90);

  return (
    <View className="overflow-hidden rounded-b-[32px] bg-hero px-5 pb-8" style={{ paddingTop: insets.top + 8 }}>
      <View className="absolute -top-40 self-center size-96 rounded-full bg-gold/15" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={12}
        className="mb-3 self-start p-1"
      >
        <ChevronRight size={26} color={heroFg} />
      </Pressable>
      {children}
      <Animated.View entering={enter(0)} className="flex-row">
        <View className="flex-row items-center gap-2 rounded-full bg-white/10 px-3 py-1">
          {Icon && <Icon size={15} color={goldSoft} />}
          <Text className="font-sans-bold text-sm text-gold-soft">{kicker}</Text>
        </View>
      </Animated.View>
      <Animated.Text
        entering={enter(1)}
        className="mt-4 font-display-bold text-3xl text-hero-fg"
        style={{ lineHeight: Math.round(46 * textScale) }}
      >
        {title}
      </Animated.Text>
      {description && (
        <Animated.Text entering={enter(2)} className="mt-2 font-sans text-base leading-7 text-white/75">
          {description}
        </Animated.Text>
      )}
      <Animated.View entering={enter(3)} className="mt-7 w-2/3">
        <Divider tone="light" />
      </Animated.View>
    </View>
  );
}
