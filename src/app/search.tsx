import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { ScreenHeader, enterSoft } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { SECTION_ART } from "@/features/home/sectionArt";
import { getSurah, type MushafAyah } from "@/features/mushaf/mushaf";
import { MAX_RESULTS, isSearchIndexReady, prepareSearchIndex, searchQuran } from "@/features/mushaf/search";

const NO_RESULTS = { results: [] as MushafAyah[], total: 0 };

function ResultRow({ item }: { item: MushafAyah }) {
  return (
    // A light fade only: results change with every keystroke.
    <Animated.View entering={FadeIn.duration(240)}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/mushaf", params: { page: String(item.page) } })}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <View className="mx-4 mb-3 gap-1 rounded-3xl border border-border bg-surface p-4 shadow-card">
          <Text className="font-sans-bold text-xs text-accent-strong">
            سورة {getSurah(item.surah)?.name} · الآية {toArabicDigits(item.ayah)} · ص {toArabicDigits(item.page)}
          </Text>
          <Text className="font-quran text-lg leading-10 text-fg" numberOfLines={3}>
            {item.text}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Before typing: the picture, a title and one hint. */
function SearchIntro() {
  return (
    <View className="items-center gap-3 px-8 pt-10">
      <Animated.View entering={enterSoft(0)}>
        <Image source={SECTION_ART.search} style={{ width: 96, height: 96 }} contentFit="contain" accessible={false} />
      </Animated.View>
      <Animated.Text entering={enterSoft(1)} className="mt-1 text-center font-sans-bold text-lg text-fg">
        ابحث في آيات القرآن
      </Animated.Text>
      <Animated.Text entering={enterSoft(2)} className="text-center font-sans text-sm leading-6 text-fg-muted">
        اكتب كما تكتب عادةً، بالتشكيل أو بدونه، ويعمل البحث دون إنترنت.
      </Animated.Text>
    </View>
  );
}

/** Search the words of the Quran, offline, with or without tashkeel. */
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
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
    <View className="flex-1 bg-bg">
      <ScreenHeader title="البحث في القرآن" art={SECTION_ART.search} />
      <View className="gap-3 px-4 pb-3">
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
          !searching ? <SearchIntro /> : ready ? <StateMessage message="لا توجد آية بهذه الكلمات." /> : <StateMessage loading />
        }
        renderItem={({ item }) => <ResultRow item={item} />}
      />
    </View>
  );
}
