import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Not re-exported from "expo-router".
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";

import { FONT_BOLD } from "@/theme/fonts";
import { useTextScale } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

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

/** The floating, rounded tab bar: an outlined pill above the screen's edge, the current tab softly lit. */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-bg px-3 pt-1.5" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
      <View className="flex-row rounded-[28px] border border-border bg-surface p-1.5 shadow-card">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const focused = state.index === index;
          return (
            <Tab
              key={route.key}
              focused={focused}
              label={typeof options.title === "string" ? options.title : route.name}
              icon={(props) => options.tabBarIcon?.(props) ?? null}
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
  );
}
