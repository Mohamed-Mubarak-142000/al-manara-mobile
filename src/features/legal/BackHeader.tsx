import { router } from "expo-router";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton, enterSoft } from "@/components/ui/PageHeader";
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
 * The opening of a pushed page on the white ground: the outlined back button, then (optionally) the
 * children, the kicker in primary, a large title and a quiet description.
 */
export function BackHeader({ kicker, title, description, icon: Icon, children }: BackHeaderProps) {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor("primary");
  const textScale = useTextScale();

  return (
    <View className="bg-bg px-5 pb-5" style={{ paddingTop: insets.top + 10 }}>
      <View className="mb-4 flex-row">
        <IconButton icon={ChevronRight} label="رجوع" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      </View>
      {children}
      <Animated.View entering={enterSoft(0)} className="flex-row items-center gap-2">
        {Icon && <Icon size={16} color={primary} />}
        <Text className="font-sans-bold text-sm text-primary">{kicker}</Text>
      </Animated.View>
      <Animated.Text
        entering={enterSoft(1)}
        className="mt-2 font-sans-bold text-[28px] text-fg"
        style={{ lineHeight: Math.round(42 * textScale) }}
      >
        {title}
      </Animated.Text>
      {description && (
        <Animated.Text entering={enterSoft(2)} className="mt-1.5 font-sans text-base leading-7 text-fg-muted">
          {description}
        </Animated.Text>
      )}
    </View>
  );
}
