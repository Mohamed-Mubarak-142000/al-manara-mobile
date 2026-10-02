import { router } from "expo-router";
import { ChevronLeft, Headphones } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import type { Reciter } from "@/core/quran/api";
import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { useReciters } from "@/features/listen/useReciters";
import { useThemeColor } from "@/theme/useThemeColor";

function ReciterRow({ reciter, riwayaCount }: { reciter: Reciter; riwayaCount: number }) {
  const muted = useThemeColor("fg-muted");
  const surahCount = Math.max(...reciter.moshaf.map((moshaf) => moshaf.surahList.length), 0);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/listen/[reciterId]", params: { reciterId: String(reciter.id) } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="mx-4 mb-2.5 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <View className="size-11 items-center justify-center rounded-full bg-primary-soft">
          <Text className="font-display-bold text-base text-primary">{reciter.letter}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">{reciter.name}</Text>
          <Text className="font-sans text-xs text-fg-muted">
            {riwayaCount > 1 ? `${toArabicDigits(riwayaCount)} روايات · ` : ""}
            {toArabicDigits(surahCount)} سورة
          </Text>
        </View>
        <ChevronLeft size={18} color={muted} />
      </View>
    </Pressable>
  );
}

export default function ListenScreen() {
  const { reciters, failed, reload } = useReciters();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    if (!reciters) return [];
    const needle = normalizeArabic(query.trim());
    return needle ? reciters.filter((reciter) => normalizeArabic(reciter.name).includes(needle)) : reciters;
  }, [reciters, query]);

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={visible}
      keyExtractor={(reciter) => String(reciter.id)}
      renderItem={({ item }) => <ReciterRow reciter={item} riwayaCount={item.moshaf.length} />}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={14}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <View className="mb-4">
          <PageHeader
            kicker="الاستماع"
            icon={Headphones}
            title="تلاوات القرّاء"
            description={reciters ? `${toArabicDigits(reciters.length)} قارئًا بمختلف الروايات.` : "تلاوات لأكثر من مئتي قارئ."}
          />
          <View className="-mt-6 px-4">
            <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن قارئ" />
          </View>
        </View>
      }
      ListEmptyComponent={
        failed ? (
          <StateMessage message="تعذّر تحميل قائمة القرّاء." onRetry={reload} />
        ) : reciters ? (
          <StateMessage message="لا يوجد قارئ بهذا الاسم." />
        ) : (
          <StateMessage loading />
        )
      }
    />
  );
}
