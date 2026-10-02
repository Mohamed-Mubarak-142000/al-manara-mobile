import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSurahAyahs, groupByMushafPage, type MushafPage } from "@/core/quran/textApi";
import { toArabicDigits } from "@/core/text/arabic";
import { StateMessage } from "@/components/ui/StateMessage";
import { useSurahIndex } from "@/features/quran/useSurahIndex";
import { useThemeColor } from "@/theme/useThemeColor";

type Load = { status: "error" } | { status: "ready"; basmala: string | null; pages: MushafPage[] };

/** A first, continuous-scroll reader in the Uthmanic Hafs face. The paged mushaf comes in phase 1. */
export default function SurahReaderScreen() {
  const { surah } = useLocalSearchParams<{ surah: string }>();
  const number = Number(surah);
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const { surahs } = useSurahIndex();
  const name = surahs?.find((entry) => entry.number === number)?.name;
  const [attempt, setAttempt] = useState(0);
  // Results are keyed by request, so a new surah or a retry reads as loading without resetting state in the effect.
  const requestKey = `${number}:${attempt}`;
  const [result, setResult] = useState<{ key: string; load: Load } | null>(null);
  const load: Load | { status: "loading" } = result?.key === requestKey ? result.load : { status: "loading" };

  useEffect(() => {
    let cancelled = false;
    getSurahAyahs(number)
      .then(({ basmala, ayahs }) => {
        if (cancelled) return;
        setResult({
          key: requestKey,
          load: ayahs.length ? { status: "ready", basmala, pages: groupByMushafPage(ayahs) } : { status: "error" },
        });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, load: { status: "error" } });
      });
    return () => {
      cancelled = true;
    };
  }, [number, requestKey]);

  return (
    <View className="flex-1 bg-surface-alt">
      <View className="flex-row items-center gap-2 border-b border-border bg-surface px-3 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12} className="p-1">
          <ChevronRight size={26} color={fg} />
        </Pressable>
        <Text className="font-display-bold text-lg text-fg">{name ? `سورة ${name}` : "…"}</Text>
      </View>

      {load.status === "ready" ? (
        <FlatList
          data={load.pages}
          keyExtractor={(page) => String(page.page)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          ListHeaderComponent={
            load.basmala ? <Text className="mb-4 text-center font-quran text-[26px] leading-[56px] text-fg">{load.basmala}</Text> : null
          }
          renderItem={({ item: page }) => (
            <View className="mb-4 rounded-3xl border border-gold/30 bg-bg px-4 pb-3 pt-5">
              <Text className="text-justify font-quran text-[24px] leading-[56px] text-fg" style={{ writingDirection: "rtl" }}>
                {page.ayahs.map((ayah) => (
                  <Text key={ayah.number}>
                    {ayah.text}
                    <Text className="text-accent-strong"> ﴿{toArabicDigits(ayah.numberInSurah)}﴾ </Text>
                  </Text>
                ))}
              </Text>
              <Text className="mt-3 text-center font-sans text-xs text-fg-muted">
                صفحة {toArabicDigits(page.page)} · الجزء {toArabicDigits(page.juz)}
              </Text>
            </View>
          )}
        />
      ) : load.status === "error" ? (
        <StateMessage message="تعذّر تحميل السورة. تأكد من الاتصال وحاول مجددًا." onRetry={() => setAttempt((value) => value + 1)} />
      ) : (
        <StateMessage loading />
      )}
    </View>
  );
}
