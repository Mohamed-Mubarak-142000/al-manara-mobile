import { Headphones } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";

import { getReciters, type Reciter } from "@/core/quran/api";
import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";

function ReciterRow({ reciter }: { reciter: Reciter }) {
  const surahCount = Math.max(...reciter.moshaf.map((moshaf) => moshaf.surahList.length), 0);
  return (
    <View className="mx-4 mb-2.5 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <View className="size-11 items-center justify-center rounded-full bg-primary-soft">
        <Text className="font-display-bold text-base text-primary">{reciter.letter}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-display-bold text-base text-fg">{reciter.name}</Text>
        <Text className="font-sans text-xs text-fg-muted">
          {toArabicDigits(reciter.moshaf.length)} {reciter.moshaf.length > 2 ? "مصاحف" : "مصحف"} · {toArabicDigits(surahCount)} سورة
        </Text>
      </View>
    </View>
  );
}

export default function ListenScreen() {
  const [reciters, setReciters] = useState<Reciter[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    getReciters().then((list) => {
      if (cancelled) return;
      if (list.length) setReciters(list);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

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
      renderItem={({ item }) => <ReciterRow reciter={item} />}
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
          <StateMessage
            message="تعذّر تحميل قائمة القرّاء."
            onRetry={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          />
        ) : reciters ? (
          <StateMessage message="لا يوجد قارئ بهذا الاسم." />
        ) : (
          <StateMessage loading />
        )
      }
    />
  );
}
