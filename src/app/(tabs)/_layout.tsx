import { Tabs } from "expo-router";
import { BookOpen, Clock, Headphones, Home, LayoutGrid } from "lucide-react-native";

import { useThemeColor } from "@/theme/useThemeColor";

export default function TabsLayout() {
  const surface = useThemeColor("surface");
  const border = useThemeColor("border");
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: muted,
        tabBarStyle: { backgroundColor: surface, borderTopColor: border },
        tabBarLabelStyle: { fontFamily: "Cairo_700Bold", fontSize: 11 },
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
