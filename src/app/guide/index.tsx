import { Image } from "expo-image";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { GUIDE, GUIDE_GROUPS } from "@/features/guide/catalog";
import { searchGuide } from "@/features/guide/search";
import type { GuideEntry } from "@/features/guide/types";
import { SECTION_ART } from "@/features/home/sectionArt";
import { useThemeColor, withAlpha } from "@/theme/useThemeColor";

function GuideRow({ entry, last }: { entry: GuideEntry; last: boolean }) {
  const muted = useThemeColor("fg-muted");
  const tone = useThemeColor(`tile-${entry.tone}`);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`دليل ${entry.title}`}
      accessibilityHint={entry.summary}
      onPress={() => router.push({ pathname: "/guide/[id]", params: { id: entry.id } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className={`flex-row items-center gap-3 px-4 py-3.5 ${last ? "" : "border-b border-border"}`}>
        <View className="size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(tone, 0.12) }}>
          <Image source={SECTION_ART[entry.art]} style={{ width: 32, height: 32 }} contentFit="contain" accessible={false} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-sans-bold text-[15px] text-fg">{entry.title}</Text>
          <Text className="font-sans text-xs leading-5 text-fg-muted" numberOfLines={2}>
            {entry.summary}
          </Text>
        </View>
        <Text className="font-sans text-xs text-fg-muted">{toArabicDigits(entry.steps.length)} خطوات</Text>
        <ChevronLeft size={18} color={muted} />
      </View>
    </Pressable>
  );
}

function GuideList({ entries }: { entries: readonly GuideEntry[] }) {
  return (
    <View className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      {entries.map((entry, index) => (
        <GuideRow key={entry.id} entry={entry} last={index === entries.length - 1} />
      ))}
    </View>
  );
}

/** The catalogue of every feature: what it does, where it is, and how to use it, step by step. */
export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const results = useMemo(() => (deferred.trim() ? searchGuide(GUIDE, deferred) : null), [deferred]);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}
    >
      <PageHeader
        back
        kicker="دليل المنارة"
        art={SECTION_ART.about}
        title="إزاي أستخدم التطبيق؟"
        description="كل قسم في المنارة: بيعمل إيه، وتلاقيه فين، وتستخدمه إزاي خطوة بخطوة بالصور."
      />

      <View className="gap-5 px-4">
        <SearchField value={query} onChangeText={setQuery} placeholder="دوّر: تكرار آية، تنزيل، الأذان…" />

        {results ? (
          results.length > 0 ? (
            <GuideList entries={results} />
          ) : (
            <Text className="py-10 text-center font-sans text-base leading-7 text-fg-muted">مفيش شرح بالكلام ده. جرّب كلمة تانية.</Text>
          )
        ) : (
          GUIDE_GROUPS.map((group) => {
            const entries = GUIDE.filter((entry) => entry.group === group.title);
            if (entries.length === 0) return null;
            return (
              <View key={group.title} className="gap-2.5">
                <View className="px-1">
                  <Text className="font-sans-bold text-base text-fg">{group.title}</Text>
                  <Text className="font-sans text-xs text-fg-muted">{group.description}</Text>
                </View>
                <GuideList entries={entries} />
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
