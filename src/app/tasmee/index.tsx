import { router } from "expo-router";
import { ChevronRight, Mic, Minus, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { Button } from "@/components/ui/Button";
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
    <View className="flex-1 items-center rounded-2xl border border-border bg-bg py-2">
      <Text className="font-sans text-xs text-fg-muted">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`زيادة ${label}`}
          onPress={() => onChange(Math.min(max, value + 1))}
          hitSlop={8}
          className="p-2"
        >
          <Plus size={18} color={primary} />
        </Pressable>
        <Text className="min-w-10 text-center font-display-bold text-xl text-fg">{toArabicDigits(value)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`إنقاص ${label}`}
          onPress={() => onChange(Math.max(min, value - 1))}
          hitSlop={8}
          className="p-2"
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
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
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
          <View className="rounded-b-[32px] bg-hero px-5 pb-10" style={{ paddingTop: insets.top + 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={() => router.back()}
              hitSlop={12}
              className="mb-3 self-start p-1"
            >
              <ChevronRight size={26} color={heroFg} />
            </Pressable>
            <View className="flex-row items-center gap-2">
              <Mic size={16} color={gold} />
              <Text className="font-sans-bold text-sm text-gold-soft">التسميع</Text>
            </View>
            <Text className="mt-2 font-display-bold text-3xl text-hero-fg">سمّع من حفظك</Text>
            <Text className="mt-1 font-sans text-sm leading-6 text-white/70">
              تختفي الآيات، وتظهر كل كلمة وأنت تقرؤها، ونوقفك عند أي خطأ ونريك الصحيح.
            </Text>
          </View>
          <View className="-mt-6 gap-3 px-4">
            {chosen ? (
              <View className="gap-3 rounded-3xl border border-border bg-surface p-4 shadow-soft">
                <Text className="font-display-bold text-lg text-fg">سورة {chosen.name}</Text>
                <View className="flex-row gap-3">
                  <Stepper label="من الآية" value={from} min={1} max={to} onChange={setFrom} />
                  <Stepper label="إلى الآية" value={to} min={from} max={chosen.ayahCount} onChange={setTo} />
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <Button
                    variant="outline"
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
              </View>
            ) : (
              <SearchField value={query} onChangeText={setQuery} placeholder="اختر السورة" />
            )}
          </View>
        </View>
      }
      renderItem={({ item }) =>
        chosen ? null : (
          <Pressable accessibilityRole="button" onPress={() => choose(item)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <View className="mx-4 mb-2 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
              <Text className="font-display-bold text-base text-fg">
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
