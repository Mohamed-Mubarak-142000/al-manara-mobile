import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useThemeColor } from "@/theme/useThemeColor";

import { SECTION_GROUPS, sectionsFor, type AppSection, type SectionGroup, type SectionTone } from "./sections";

const COLUMNS = 3;

/** Literal class names, so Tailwind finds them. */
const TONES: Record<SectionTone, string> = {
  blue: "bg-tile-blue",
  teal: "bg-tile-teal",
  clay: "bg-tile-clay",
  purple: "bg-tile-purple",
  green: "bg-tile-green",
  gold: "bg-tile-gold",
  rose: "bg-tile-rose",
  sky: "bg-tile-sky",
};

function SectionTile({ section }: { section: AppSection }) {
  const ink = useThemeColor("tile-ink");
  const Icon = section.icon;
  const href = section.href!;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={section.label}
      accessibilityHint={section.description}
      onPress={() => router.push(href)}
      className="flex-1"
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      {/* A clean white card: hairline border, the faintest shadow, the section's colour only in its circle. */}
      <View className="min-h-32 items-center gap-2.5 rounded-3xl border border-border bg-surface px-1.5 pb-3 pt-4 shadow-card">
        <View className={`size-14 items-center justify-center rounded-full ${TONES[section.tone]}`}>
          <Icon size={26} color={ink} strokeWidth={2} />
        </View>
        <Text numberOfLines={2} className="text-center font-sans-bold text-[13px] leading-5 text-fg">
          {section.label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Three tiles a row, each a colour circle with its icon and the label under it; a short last row keeps the width. */
export function SectionTiles({ sections }: { sections: readonly AppSection[] }) {
  const rows = Array.from({ length: Math.ceil(sections.length / COLUMNS) }, (_, row) =>
    sections.slice(row * COLUMNS, row * COLUMNS + COLUMNS),
  );
  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row[0]!.label} className="flex-row gap-3">
          {row.map((section) => (
            <SectionTile key={section.label} section={section} />
          ))}
          {Array.from({ length: COLUMNS - row.length }, (_, index) => (
            <View key={index} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

/** A titled grid of tiles per group: every built section by default (the كل الأقسام screen). */
export function SectionGrid({ groups: chosen = SECTION_GROUPS }: { groups?: readonly SectionGroup[] }) {
  const groups = chosen
    .map((group) => ({ title: group.title, sections: sectionsFor(group.labels) }))
    .filter((group) => group.sections.length > 0);

  return (
    <View className="gap-5">
      {groups.map((group) => (
        <View key={group.title} className="gap-2.5">
          <Text className="px-1 font-sans-bold text-base text-fg">{group.title}</Text>
          <SectionTiles sections={group.sections} />
        </View>
      ))}
    </View>
  );
}
