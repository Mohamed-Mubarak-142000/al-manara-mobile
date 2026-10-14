import { Tabs } from "expo-router";
import { BookOpen, Clock, Headphones, Home, LayoutGrid } from "lucide-react-native";
import { View } from "react-native";

import { FloatingTabBar } from "@/components/ui/FloatingTabBar";
import { MiniPlayerSpacer } from "@/features/audio/MiniPlayer";
import { miniPlayerLayout } from "@/features/audio/miniPlayerLayout";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <>
          {/* The app-wide mini player (root layout) is drawn over this space. */}
          <MiniPlayerSpacer />
          <View onLayout={(event) => miniPlayerLayout.setTabBarHeight(event.nativeEvent.layout.height)}>
            <FloatingTabBar {...props} />
          </View>
        </>
      )}
      screenOptions={{ headerShown: false, animation: "fade" }}
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
