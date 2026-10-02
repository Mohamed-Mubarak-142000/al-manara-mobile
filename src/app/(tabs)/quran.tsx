import { router } from "expo-router";
import { BookOpen, Bookmark } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { ContinueReadingCard } from "@/features/mushaf/ContinueReadingCard";
import { getSurah, getSurahs, juzStartPages } from "@/features/mushaf/mushaf";
import { useReaderState } from "@/features/mushaf/readerPrefs";
import { useThemeColor } from "@/theme/useThemeColor";

type Tab = "surahs" | "juz" | "bookmarks";
type Row = { key: string; badge: string; title: string; subtitle: string; page: number };

const TABS: { key: Tab; label: string }[] = [
  { key: "surahs", label: "السور" },
  { key: "juz", label: "الأجزاء" },
  { key: "bookmarks", label: "العلامات" },
];

function openPage(page: number) {
  router.push({ pathname: "/mushaf", params: { page: String(page) } });
}

function IndexRow({ row, icon }: { row: Row; icon?: boolean }) {
  const accent = useThemeColor("accent-strong");
  return (
    <Pressable accessibilityRole="button" onPress={() => openPage(row.page)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View className="mx-4 mb-2.5 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <View className="size-11 items-center justify-center">
          <View className="absolute size-9 rotate-45 rounded-lg border border-gold/60 bg-accent-soft" />
          {icon ? <Bookmark size={16} color={accent} /> : <Text className="font-display-bold text-sm text-accent-strong">{row.badge}</Text>}
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">{row.title}</Text>
          <Text className="font-sans text-xs text-fg-muted">{row.subtitle}</Text>
        </View>
        <Text className="font-sans text-xs text-fg-muted">ص {toArabicDigits(row.page)}</Text>
      </View>
    </Pressable>
  );
}

export default function QuranIndexScreen() {
  const [tab, setTab] = useState<Tab>("surahs");
  const [query, setQuery] = useState("");
  const { bookmarks } = useReaderState();

  const rows: Row[] = useMemo(() => {
    if (tab === "juz") {
      return juzStartPages().map(({ juz, page }) => ({
        key: `juz-${juz}`,
        badge: toArabicDigits(juz),
        title: `الجزء ${toArabicDigits(juz)}`,
        subtitle: `يبدأ من صفحة ${toArabicDigits(page)}`,
        page,
      }));
    }
    if (tab === "bookmarks") {
      return bookmarks.map((mark) => ({
        key: `mark-${mark.surah}-${mark.ayah}`,
        badge: "",
        title: `سورة ${getSurah(mark.surah)?.name ?? ""}`,
        subtitle: `الآية ${toArabicDigits(mark.ayah)}`,
        page: mark.page,
      }));
    }
    const needle = normalizeArabic(query.trim());
    return getSurahs()
      .filter((surah) => !needle || normalizeArabic(surah.name).includes(needle) || String(surah.number) === query.trim())
      .map((surah) => ({
        key: `surah-${surah.number}`,
        badge: toArabicDigits(surah.number),
        title: `سورة ${surah.name}`,
        subtitle: `${surah.meccan ? "مكية" : "مدنية"} · ${toArabicDigits(surah.ayahCount)} آية · الجزء ${toArabicDigits(surah.juzStart)}`,
        page: surah.startPage,
      }));
  }, [tab, query, bookmarks]);

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={rows}
      keyExtractor={(row) => row.key}
      renderItem={({ item }) => <IndexRow row={item} icon={tab === "bookmarks"} />}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={14}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <View className="mb-4">
          <PageHeader
            kicker="القرآن الكريم"
            icon={BookOpen}
            title="المصحف الشريف"
            description="بالرسم العثماني، برواية حفص عن عاصم. يعمل دون إنترنت."
          />
          <View className="-mt-6 gap-3 px-4">
            {tab === "surahs" && <SearchField value={query} onChangeText={setQuery} placeholder="ابحث باسم السورة أو رقمها" />}
            <ContinueReadingCard />
            <View className="flex-row rounded-full border border-border bg-surface p-1">
              {TABS.map((entry) => {
                const active = entry.key === tab;
                return (
                  <Pressable
                    key={entry.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => setTab(entry.key)}
                    className={`flex-1 items-center rounded-full py-2 ${active ? "bg-primary" : ""}`}
                  >
                    <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg-muted"}`}>{entry.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={
        <StateMessage message={tab === "bookmarks" ? "لا توجد علامات بعد. اضغط مطولًا على أي آية لحفظها." : "لا توجد سورة بهذا الاسم."} />
      }
    />
  );
}
