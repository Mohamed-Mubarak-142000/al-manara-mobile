import { router } from "expo-router";
import { Mic, Minus, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { Button } from "@/components/ui/Button";
import { PageHeader, enterSoft } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { getSurahs, type SurahInfo } from "@/features/mushaf/mushaf";
import { useThemeColor } from "@/theme/useThemeColor";

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const primary = useThemeColor("primary");
  return (
    <View className="flex-1 items-center gap-2 rounded-2xl border border-border bg-surface px-2 py-3">
      <Text className="font-sans text-xs text-fg-muted">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`زيادة ${label}`}
          onPress={() => onChange(Math.min(max, value + 1))}
          hitSlop={8}
          className="size-9 items-center justify-center rounded-xl border border-border"
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}
        >
          <Plus size={18} color={primary} />
        </Pressable>
        <Text className="min-w-10 text-center font-sans-bold text-xl text-fg">{toArabicDigits(value)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`إنقاص ${label}`}
          onPress={() => onChange(Math.max(min, value - 1))}
          hitSlop={8}
          className="size-9 items-center justify-center rounded-xl border border-border"
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}
        >
          <Minus size={18} color={primary} />
        </Pressable>
      </View>
    </View>
  );
}

/** Pick a surah and the ayahs to recite from memory. */
export default function TasmeePickerScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<SurahInfo | null>(null);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);

  const surahs = useMemo(() => {
    const needle = normalizeArabic(query.trim());
    return getSurahs().filter((surah) => !needle || normalizeArabic(surah.name).includes(needle) || String(surah.number) === query.trim());
  }, [query]);

  function choose(surah: SurahInfo) {
    setChosen(surah);
    setFrom(1);
    // The whole surah by default, like the website's picker.
    setTo(surah.ayahCount);
  }

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={surahs}
      keyExtractor={(surah) => String(surah.number)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      ListHeaderComponent={
        <View className="mb-4">
          <PageHeader
            back
            kicker="التسميع"
            icon={Mic}
            title="سمّع من حفظك"
            description="تختفي الآيات، وتظهر كل كلمة وأنت تقرؤها، ونوقفك عند أي خطأ ونريك الصحيح."
          />
          <View className="gap-3 px-4">
            {chosen ? (
              <Animated.View entering={enterSoft(0)} className="gap-4 rounded-3xl border border-border bg-surface p-5 shadow-card">
                <Text className="font-sans-bold text-lg text-fg">سورة {chosen.name}</Text>
                <View className="flex-row gap-3">
                  <Stepper label="من الآية" value={from} min={1} max={to} onChange={setFrom} />
                  <Stepper label="إلى الآية" value={to} min={from} max={chosen.ayahCount} onChange={setTo} />
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setFrom(1);
                      setTo(chosen.ayahCount);
                    }}
                  >
                    السورة كاملة
                  </Button>
                  <Button variant="ghost" size="sm" onPress={() => setChosen(null)}>
                    سورة أخرى
                  </Button>
                </View>
                <Button
                  size="lg"
                  icon={Mic}
                  onPress={() =>
                    router.push({
                      pathname: "/tasmee/[surah]",
                      params: { surah: String(chosen.number), from: String(from), to: String(to) },
                    })
                  }
                >
                  ابدأ التسميع
                </Button>
              </Animated.View>
            ) : (
              <SearchField value={query} onChangeText={setQuery} placeholder="اختر السورة" />
            )}
          </View>
        </View>
      }
      renderItem={({ item }) =>
        chosen ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(item)}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <View className="mx-4 mb-3 flex-row items-center justify-between rounded-3xl border border-border bg-surface px-4 py-3.5">
              <Text className="font-sans-bold text-base text-fg">
                {toArabicDigits(item.number)}. سورة {item.name}
              </Text>
              <Text className="font-sans text-xs text-fg-muted">{toArabicDigits(item.ayahCount)} آية</Text>
            </View>
          </Pressable>
        )
      }
    />
  );
}
