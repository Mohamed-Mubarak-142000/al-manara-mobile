import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { APP_SECTIONS, SECTION_GROUPS, type AppSection } from "@/features/home/sections";
import { useThemeColor } from "@/theme/useThemeColor";

function SectionRow({ section, last }: { section: AppSection; last: boolean }) {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const Icon = section.icon;
  const href = section.href!;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={section.label}
      accessibilityHint={section.description}
      onPress={() => router.push(href)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View className={`flex-row items-center gap-3 px-4 py-3.5 ${last ? "" : "border-b border-border"}`}>
        <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
          <Icon size={22} color={primary} />
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">{section.label}</Text>
          <Text className="font-sans text-xs leading-5 text-fg-muted">{section.description}</Text>
        </View>
        <ChevronLeft size={18} color={muted} />
      </View>
    </Pressable>
  );
}

/** Every built section of the app, grouped as on Home, each with what it is for. Opened from Home's "كل الأقسام". */
export default function SectionsScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const heroFg = useThemeColor("hero-fg");
  const groups = SECTION_GROUPS.map((group) => ({
    title: group.title,
    sections: group.labels
      .map((label) => APP_SECTIONS.find((section) => section.label === label))
      .filter((section): section is AppSection => section?.href !== undefined),
  })).filter((group) => group.sections.length > 0);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={12}
          className="mb-3 self-start p-1"
        >
          <ChevronRight size={26} color={heroFg} />
        </Pressable>
        <Text className="font-sans-bold text-sm text-gold-soft">أقسام المنارة</Text>
        <Text className="mt-2 font-display-bold text-3xl leading-[46px] text-hero-fg">كل الأقسام</Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-white/75">القرآن، ويومك، ورحلتك في الحفظ، والصوتيات — كل قسم في مكانه.</Text>
      </View>

      <View className="gap-5 px-4 pt-5">
        {groups.map((group) => (
          <View key={group.title} className="gap-2">
            <Text className="px-1 font-sans-bold text-sm text-accent-strong">{group.title}</Text>
            <View className="overflow-hidden rounded-3xl border border-border bg-surface">
              {group.sections.map((section, index) => (
                <SectionRow key={section.label} section={section} last={index === group.sections.length - 1} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
