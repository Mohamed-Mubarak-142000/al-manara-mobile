import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useThemeColor } from "@/theme/useThemeColor";

import { APP_SECTIONS, SECTION_GROUPS, type AppSection, type SectionGroup } from "./sections";

const COLUMNS = 4;

function SectionTile({ section }: { section: AppSection }) {
  const primary = useThemeColor("primary");
  const Icon = section.icon;
  const href = section.href!;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={section.label}
      accessibilityHint={section.description}
      onPress={() => router.push(href)}
      className="flex-1"
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <View className="min-h-23 items-center gap-2 rounded-2xl border border-border bg-surface px-1 py-3 shadow-soft">
        <View className="size-11 items-center justify-center rounded-xl bg-primary-soft">
          <Icon size={22} color={primary} />
        </View>
        <Text numberOfLines={2} className="text-center font-sans-bold text-xs leading-5 text-fg">
          {section.label}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * A titled row of up to four tiles per group, nothing that moves on its own. Every built section by
 * default (المزيد); Home passes just its first groups.
 */
export function SectionGrid({ groups: chosen = SECTION_GROUPS }: { groups?: readonly SectionGroup[] }) {
  const groups = chosen.map((group) => ({
    title: group.title,
    sections: group.labels
      .map((label) => APP_SECTIONS.find((section) => section.label === label))
      .filter((section): section is AppSection => section?.href !== undefined),
  })).filter((group) => group.sections.length > 0);

  return (
    <View className="gap-4">
      {groups.map((group) => (
        <View key={group.title} className="gap-2">
          <Text className="font-sans-bold text-xs text-fg-muted">{group.title}</Text>
          <View className="flex-row gap-2">
            {group.sections.map((section) => (
              <SectionTile key={section.label} section={section} />
            ))}
            {/* Shorter rows keep the same tile width. */}
            {Array.from({ length: Math.max(0, COLUMNS - group.sections.length) }, (_, index) => (
              <View key={index} className="flex-1" />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
