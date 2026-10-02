import { router } from "expo-router";
import { BookOpen } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { normalizeArabic } from "@/core/text/normalizeArabic";
import { toArabicDigits } from "@/core/text/arabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { useSurahIndex, type SurahEntry } from "@/features/quran/useSurahIndex";

function SurahRow({ surah }: { surah: SurahEntry }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/quran/[surah]", params: { surah: String(surah.number) } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="mx-4 mb-2.5 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <View className="size-11 items-center justify-center">
          <View className="absolute size-9 rotate-45 rounded-lg border border-gold/60 bg-accent-soft" />
          <Text className="font-display-bold text-sm text-accent-strong">{toArabicDigits(surah.number)}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">سورة {surah.name}</Text>
          <Text className="font-sans text-xs text-fg-muted">
            {surah.meccan ? "مكية" : "مدنية"} · {toArabicDigits(surah.ayahCount)} آية · الجزء {toArabicDigits(surah.juzStart)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function QuranIndexScreen() {
  const { surahs, failed, reload } = useSurahIndex();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    if (!surahs) return [];
    const needle = normalizeArabic(query.trim());
    if (!needle) return surahs;
    return surahs.filter((surah) => normalizeArabic(surah.name).includes(needle) || String(surah.number) === query.trim());
  }, [surahs, query]);

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={visible}
      keyExtractor={(surah) => String(surah.number)}
      renderItem={({ item }) => <SurahRow surah={item} />}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <View className="mb-4">
          <PageHeader kicker="القرآن الكريم" icon={BookOpen} title="المصحف الشريف" description="بالرسم العثماني، برواية حفص عن عاصم." />
          <View className="-mt-6 px-4">
            <SearchField value={query} onChangeText={setQuery} placeholder="ابحث باسم السورة أو رقمها" />
          </View>
        </View>
      }
      ListEmptyComponent={
        failed ? (
          <StateMessage message="تعذّر تحميل فهرس السور." onRetry={reload} />
        ) : surahs ? (
          <StateMessage message="لا توجد سورة بهذا الاسم." />
        ) : (
          <StateMessage loading />
        )
      }
    />
  );
}
