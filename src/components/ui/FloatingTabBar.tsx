import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useLayoutEffect, useSyncExternalStore, type RefObject } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Not re-exported from "expo-router".
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";

import { FONT_BOLD } from "@/theme/fonts";
import { useTextScale } from "@/theme/textScale";
import { useThemeColor, withAlpha } from "@/theme/useThemeColor";

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Android blurs only what is inside a BlurTargetView, drawn beside (not around) the BlurView. So the
 * navigator's own tab bar renders nothing and hands its props over here, and the real bar is drawn as a
 * sibling above the screens (see app/(tabs)/_layout.tsx).
 */
let bridged: BottomTabBarProps | null = null;
const listeners = new Set<() => void>();

export function TabBarBridge(props: BottomTabBarProps) {
  useLayoutEffect(() => {
    bridged = props;
    listeners.forEach((notify) => notify());
  });
  return null;
}

function useBridgedProps(): BottomTabBarProps | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => bridged,
  );
}

function Tab({
  focused,
  label,
  icon,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  label: string;
  icon: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  // Capped so five Arabic labels still fit side by side at the largest text size.
  const labelSize = Math.round(11 * Math.min(useTextScale(), 1.2));
  const highlight = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 320, easing: EASE }),
    transform: [{ scale: withTiming(focused ? 1 : 0.85, { duration: 320, easing: EASE }) }],
  }));
  const color = focused ? primary : muted;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-1 items-center justify-center"
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <Animated.View className="absolute inset-x-0.5 inset-y-0 rounded-3xl bg-primary-soft" style={highlight} />
      <View className="items-center gap-0.5 py-2">
        {icon({ focused, color, size: 22 })}
        <Text style={{ fontFamily: FONT_BOLD, fontSize: labelSize, lineHeight: Math.round(labelSize * 1.45), color }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * The floating tab bar: a frosted-glass pill over the screen (what scrolls under it shows through,
 * blurred), no heavy border, the current tab softly lit.
 */
export function FloatingTabBar({ blurTarget }: { blurTarget: RefObject<View | null> }) {
  const props = useBridgedProps();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === "dark";
  const surface = useThemeColor("surface");
  if (!props) return null;
  const { state, descriptors, navigation } = props;

  return (
    <View className="px-3 pt-1.5" style={{ paddingBottom: Math.max(insets.bottom, 10) }} pointerEvents="box-none">
      <View className="overflow-hidden rounded-[28px] shadow-card" style={{ borderWidth: 0.5, borderColor: withAlpha(dark ? "#ffffff" : "#000000", 0.06) }}>
        <BlurView
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={dark ? 60 : 80}
          tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
          style={{ position: "absolute", inset: 0 }}
        />
        {/* A light wash over the blur, so labels stay readable on any content (and on Android 11 and below,
            which get this wash alone). */}
        <View className="absolute inset-0" style={{ backgroundColor: withAlpha(surface, dark ? 0.55 : 0.62) }} />
        <View className="flex-row p-1.5">
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key]!;
            const focused = state.index === index;
            return (
              <Tab
                key={route.key}
                focused={focused}
                label={typeof options.title === "string" ? options.title : route.name}
                icon={(iconProps) => options.tabBarIcon?.(iconProps) ?? null}
                onPress={() => {
                  const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) {
                    Haptics.selectionAsync().catch(() => {});
                    navigation.navigate(route.name, route.params);
                  }
                }}
                onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
