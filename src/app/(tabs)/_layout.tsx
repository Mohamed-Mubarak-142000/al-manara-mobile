import { Tabs } from "expo-router";
import { BookOpen, Clock, Headphones, Home, LayoutGrid } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniPlayerSpacer } from "@/features/audio/MiniPlayer";
import { miniPlayerLayout } from "@/features/audio/miniPlayerLayout";
import { useTextScale } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";
// Not re-exported from "expo-router"; the stock bar is wrapped to make room for the mini player and measure it.
import { BottomTabBar } from "expo-router/build/react-navigation/bottom-tabs";

export default function TabsLayout() {
  const surface = useThemeColor("surface");
  const border = useThemeColor("border");
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  // Follows the app text size, capped so five Arabic labels still fit side by side.
  const labelSize = Math.round(11 * Math.min(useTextScale(), 1.2));
  const labelLine = Math.round(labelSize * 1.45);
  // The stock bar is a fixed 49pt; it grows only by what the larger label needs.
  const extra = labelLine - 16;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => (
        <>
          {/* The app-wide mini player (root layout) is drawn over this space. */}
          <MiniPlayerSpacer />
          <View onLayout={(event) => miniPlayerLayout.setTabBarHeight(event.nativeEvent.layout.height)}>
            <BottomTabBar {...props} />
          </View>
        </>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: muted,
        tabBarStyle: { backgroundColor: surface, borderTopColor: border, ...(extra > 0 && { height: 49 + extra + insets.bottom }) },
        tabBarLabelStyle: { fontFamily: "Cairo_700Bold", fontSize: labelSize, lineHeight: labelLine },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="quran" options={{ title: "المصحف", tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }} />
      <Tabs.Screen
        name="listen"
        options={{ title: "الاستماع", tabBarIcon: ({ color, size }) => <Headphones color={color} size={size} /> }}
      />
      <Tabs.Screen name="prayer" options={{ title: "المواقيت", tabBarIcon: ({ color, size }) => <Clock color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: "المزيد", tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }} />
    </Tabs>
  );
}
