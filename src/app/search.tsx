import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { getSurah, type MushafAyah } from "@/features/mushaf/mushaf";
import { MAX_RESULTS, isSearchIndexReady, prepareSearchIndex, searchQuran } from "@/features/mushaf/search";
import { useThemeColor } from "@/theme/useThemeColor";

const NO_RESULTS = { results: [] as MushafAyah[], total: 0 };

function ResultRow({ item }: { item: MushafAyah }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/mushaf", params: { page: String(item.page) } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="mx-4 mb-2.5 gap-1 rounded-2xl border border-border bg-surface p-4">
        <Text className="font-sans-bold text-xs text-accent-strong">
          سورة {getSurah(item.surah)?.name} · الآية {toArabicDigits(item.ayah)} · ص {toArabicDigits(item.page)}
        </Text>
        <Text className="font-quran text-lg leading-10 text-fg" numberOfLines={3}>
          {item.text}
        </Text>
      </View>
    </Pressable>
  );
}

/** Search the words of the Quran, offline, with or without tashkeel. */
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(isSearchIndexReady);
  // Typing stays smooth: the search runs on the deferred value.
  const deferred = useDeferredValue(query);
  const searching = deferred.trim().length >= 2;

  // The index (6,236 normalised ayahs) is built after the first frame, so the screen opens at once.
  useEffect(() => {
    if (ready) return;
    let alive = true;
    const id = setTimeout(() => {
      prepareSearchIndex().then(() => alive && setReady(true));
    }, 50);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [ready]);

  const { results, total } = useMemo(() => (ready ? searchQuran(deferred) : NO_RESULTS), [ready, deferred]);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8 }}>
      <View className="gap-3 px-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12} className="p-1">
            <ChevronRight size={26} color={fg} />
          </Pressable>
          <Text className="font-display-bold text-xl text-fg">البحث في القرآن</Text>
        </View>
        <SearchField value={query} onChangeText={setQuery} placeholder="اكتب كلمة أو جزءًا من آية" />
        {searching && ready && total > 0 && (
          <Text className="font-sans text-xs text-fg-muted">
            {`${toArabicDigits(total)} آية${total > MAX_RESULTS ? ` (نعرض أول ${toArabicDigits(MAX_RESULTS)})` : ""}`}
          </Text>
        )}
      </View>

      <FlashList
        data={results}
        keyExtractor={(ayah) => String(ayah.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ListEmptyComponent={
          !searching ? (
            <Text className="mx-6 mt-6 text-center font-sans text-sm leading-7 text-fg-muted">
              ابحث بالكلمات كما تكتبها عادةً، بالتشكيل أو بدونه. البحث يعمل دون إنترنت.
            </Text>
          ) : ready ? (
            <StateMessage message="لا توجد آية بهذه الكلمات." />
          ) : (
            <StateMessage loading />
          )
        }
        renderItem={({ item }) => <ResultRow item={item} />}
      />
    </View>
  );
}
