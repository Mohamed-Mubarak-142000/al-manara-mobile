import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/theme/useThemeColor";

import { Divider } from "./Ornament";

interface PageHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

/** The website's dark PageHeader: emerald ground, gold kicker pill, staggered entrance. Use inside <Screen bleed>. */
export function PageHeader({ kicker, title, description, icon: Icon, actions }: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const goldSoft = useThemeColor("gold-soft");
  const enter = (index: number) => FadeInDown.duration(600).delay(index * 90);

  return (
    <View className="overflow-hidden rounded-b-[32px] bg-hero px-5 pb-8" style={{ paddingTop: insets.top + 20 }}>
      <View className="absolute -top-40 self-center size-96 rounded-full bg-gold/15" />
      <Animated.View entering={enter(0)} className="flex-row">
        <View className="flex-row items-center gap-2 rounded-full bg-white/10 px-3 py-1">
          {Icon && <Icon size={15} color={goldSoft} />}
          <Text className="font-sans-bold text-sm text-gold-soft">{kicker}</Text>
        </View>
      </Animated.View>
      <Animated.Text entering={enter(1)} className="mt-4 font-display-bold text-3xl leading-[46px] text-hero-fg">
        {title}
      </Animated.Text>
      {description && (
        <Animated.Text entering={enter(2)} className="mt-2 font-sans text-base leading-7 text-white/75">
          {description}
        </Animated.Text>
      )}
      {actions && (
        <Animated.View entering={enter(3)} className="mt-5 flex-row flex-wrap gap-3">
          {actions}
        </Animated.View>
      )}
      <Animated.View entering={enter(4)} className="mt-7 w-2/3">
        <Divider tone="light" />
      </Animated.View>
    </View>
  );
}
