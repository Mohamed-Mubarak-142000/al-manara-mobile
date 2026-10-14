import { router } from "expo-router";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTextScale } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

/** The app's entrance: content drifts up a little and fades in, slowly and softly. */
export const enterSoft = (index = 0) =>
  FadeInDown.duration(520)
    .delay(index * 70)
    .easing(Easing.bezier(0.22, 1, 0.36, 1))
    .withInitialValues({ transform: [{ translateY: 12 }] });

/** A square outlined icon button: the header's back, filter, bell… */
export function IconButton({
  icon: Icon,
  label,
  onPress,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const fg = useThemeColor("fg");
  const primary = useThemeColor("primary");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      className={`size-12 items-center justify-center rounded-2xl border ${active ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <Icon size={22} color={active ? primary : fg} strokeWidth={1.8} />
    </Pressable>
  );
}

/**
 * The top bar of every inner screen: the back button at the start, the title, and up to a few icon
 * buttons at the end, on the white ground (nothing dark, nothing heavy).
 */
export function ScreenHeader({
  title,
  subtitle,
  actions,
  onBack,
  back = true,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  onBack?: () => void;
  back?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-center gap-3 bg-bg px-4 pb-3" style={{ paddingTop: insets.top + 10 }}>
      {back && (
        <IconButton
          icon={ChevronRight}
          label="رجوع"
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
        />
      )}
      <View className="flex-1">
        {title ? (
          <Text className="font-sans-bold text-lg text-fg" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text className="font-sans text-xs text-fg-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View className="flex-row items-center gap-2">{actions}</View> : null}
    </View>
  );
}

interface PageHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** A back button above the title (inner screens). */
  back?: boolean;
  /** Where back goes; by default the previous screen, or Home when there is none. */
  onBack?: () => void;
}

/** A page's opening: the small coloured kicker, a large title and a quiet description, on the white ground. */
export function PageHeader({ kicker, title, description, icon: Icon, actions, back = false, onBack }: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor("primary");
  const textScale = useTextScale();

  return (
    <View className="bg-bg px-5 pb-5" style={{ paddingTop: insets.top + (back ? 10 : 20) }}>
      {back && (
        <View className="mb-4 flex-row">
          <IconButton
            icon={ChevronRight}
            label="رجوع"
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
          />
        </View>
      )}
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
      {actions && (
        <Animated.View entering={enterSoft(3)} className="mt-5 flex-row flex-wrap gap-3">
          {actions}
        </Animated.View>
      )}
    </View>
  );
}
