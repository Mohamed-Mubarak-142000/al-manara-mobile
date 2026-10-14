import { BlurTargetView } from "expo-blur";
import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { LayoutGrid } from "lucide-react-native";
import { useRef } from "react";
import { View } from "react-native";

import { FloatingTabBar, TabBarBridge } from "@/components/ui/FloatingTabBar";
import { miniPlayerLayout } from "@/features/audio/miniPlayerLayout";
import { SECTION_ART, type SectionArt } from "@/features/home/sectionArt";

/** A tab's 3D art: whole and a touch larger when selected, faded otherwise. */
function tabArt(art: SectionArt) {
  return function TabArt({ focused, size }: { focused: boolean; size: number }) {
    return (
      <Image
        source={SECTION_ART[art]}
        contentFit="contain"
        accessible={false}
        style={{ width: size + 4, height: size + 4, opacity: focused ? 1 : 0.55, transform: [{ scale: focused ? 1.1 : 1 }] }}
      />
    );
  };
}

/**
 * The tabs draw under a floating, blurred bar. The screens sit in a BlurTargetView (what the bar blurs on
 * Android) and pad their content by the bar's height (useTabBarInset); the bar itself is a sibling on top.
 */
export default function TabsLayout() {
  const target = useRef<View>(null);
  return (
    <View className="flex-1">
      <BlurTargetView ref={target} style={{ flex: 1 }}>
        <Tabs tabBar={(props) => <TabBarBridge {...props} />} screenOptions={{ headerShown: false, animation: "fade" }}>
          <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: tabArt("home") }} />
          <Tabs.Screen name="quran" options={{ title: "المصحف", tabBarIcon: tabArt("quran") }} />
          <Tabs.Screen name="listen" options={{ title: "الاستماع", tabBarIcon: tabArt("listen") }} />
          <Tabs.Screen name="prayer" options={{ title: "المواقيت", tabBarIcon: tabArt("prayer") }} />
          <Tabs.Screen
            name="more"
            options={{ title: "المزيد", tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }}
          />
        </Tabs>
      </BlurTargetView>
      {/* Measured for the mini player, which rides just above it, and for the screens' bottom padding. */}
      <View
        className="absolute inset-x-0 bottom-0"
        pointerEvents="box-none"
        onLayout={(event) => miniPlayerLayout.setTabBarHeight(event.nativeEvent.layout.height)}
      >
        <FloatingTabBar blurTarget={target} />
      </View>
    </View>
  );
}
