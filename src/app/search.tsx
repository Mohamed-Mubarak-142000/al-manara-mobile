import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { getSurah } from "@/features/mushaf/mushaf";
import { MAX_RESULTS, searchQuran } from "@/features/mushaf/search";
import { useThemeColor } from "@/theme/useThemeColor";

/** Search the words of the Quran, offline, with or without tashkeel. */
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const [query, setQuery] = useState("");
  // Typing stays smooth: the search runs on the deferred value.
  const deferred = useDeferredValue(query);
  const { results, total } = useMemo(() => searchQuran(deferred), [deferred]);

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={results}
      keyExtractor={(ayah) => String(ayah.id)}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={12}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}
      ListHeaderComponent={
        <View className="gap-3 px-4 pb-3">
          <View className="flex-row items-center gap-2">
            <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12} className="p-1">
              <ChevronRight size={26} color={fg} />
            </Pressable>
            <Text className="font-display-bold text-xl text-fg">البحث في القرآن</Text>
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="اكتب كلمة أو جزءًا من آية" />
          {deferred.trim().length >= 2 && (
            <Text className="font-sans text-xs text-fg-muted">
              {total ? `${toArabicDigits(total)} آية${total > MAX_RESULTS ? ` (نعرض أول ${toArabicDigits(MAX_RESULTS)})` : ""}` : ""}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        deferred.trim().length >= 2 ? (
          <StateMessage message="لا توجد آية بهذه الكلمات." />
        ) : (
          <Text className="mx-6 mt-6 text-center font-sans text-sm leading-7 text-fg-muted">
            ابحث بالكلمات كما تكتبها عادةً، بالتشكيل أو بدونه. البحث يعمل دون إنترنت.
          </Text>
        )
      }
      renderItem={({ item }) => (
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
      )}
    />
  );
}
