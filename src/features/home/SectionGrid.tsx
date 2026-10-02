import { router } from "expo-router";
import { Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Card } from "@/components/ui/Card";
import { useThemeColor } from "@/theme/useThemeColor";

import { APP_SECTIONS } from "./sections";

/** Two-column section cards, like the website home's HomeSections. */
export function SectionGrid() {
  const primary = useThemeColor("primary");

  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {APP_SECTIONS.map((section, index) => {
        const Icon = section.icon;
        const href = section.href;
        return (
          <Animated.View key={section.label} entering={FadeInUp.duration(500).delay(index * 60)} className="w-[48.5%]">
            <Card onPress={href ? () => router.push(href) : undefined} className="min-h-36">
              <View className="flex-row items-start justify-between">
                <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
                  <Icon size={22} color={primary} />
                </View>
                {!href && (
                  <View className="rounded-full bg-accent-soft px-2 py-0.5">
                    <Text className="font-sans-bold text-[10px] text-accent-strong">قريبًا</Text>
                  </View>
                )}
              </View>
              <Text className="mt-3 font-display-bold text-base text-fg">{section.label}</Text>
              <Text className="mt-1 font-sans text-xs leading-5 text-fg-muted">{section.description}</Text>
            </Card>
          </Animated.View>
        );
      })}
    </View>
  );
}
