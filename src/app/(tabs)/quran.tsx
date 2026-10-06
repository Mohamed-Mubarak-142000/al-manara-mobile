import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { BookOpen, Bookmark, NotebookPen, TextSearch, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { ContinueReadingCard } from "@/features/mushaf/ContinueReadingCard";
import { hizbStartPages } from "@/features/mushaf/jump";
import { getSurah, getSurahs, juzStartPages } from "@/features/mushaf/mushaf";
import { reader, useReaderState } from "@/features/mushaf/readerPrefs";
import { useThemeColor } from "@/theme/useThemeColor";

type Tab = "surahs" | "juz" | "hizb" | "bookmarks" | "notes";
type Row = {
  key: string;
  badge: string;
  title: string;
  subtitle: string;
  page: number;
  /** Bookmarks and notes can be removed (with an undo). */
  remove?: { label: string; run: () => void };
};
type Undo = { id: number; message: string; restore: () => void };

const TABS: { key: Tab; label: string }[] = [
  { key: "surahs", label: "السور" },
  { key: "juz", label: "الأجزاء" },
  { key: "hizb", label: "الأحزاب" },
  { key: "bookmarks", label: "العلامات" },
  { key: "notes", label: "ملاحظاتي" },
];

const UNDO_MS = 5000;

function openPage(page: number) {
  router.push({ pathname: "/mushaf", params: { page: String(page) } });
}

function IndexRow({ row, icon }: { row: Row; icon?: "bookmark" | "note" }) {
  const accent = useThemeColor("accent-strong");
  const muted = useThemeColor("fg-muted");
  const Icon = icon === "note" ? NotebookPen : Bookmark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={row.remove ? "اضغط مطولًا للحذف" : undefined}
      accessibilityActions={row.remove ? [{ name: "delete", label: row.remove.label }] : undefined}
      onAccessibilityAction={(event) => event.nativeEvent.actionName === "delete" && row.remove?.run()}
      onPress={() => openPage(row.page)}
      onLongPress={row.remove?.run}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="mx-4 mb-2.5 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <View className="size-11 items-center justify-center">
          <View className="absolute size-9 rotate-45 rounded-lg border border-gold/60 bg-accent-soft" />
          {icon ? <Icon size={16} color={accent} /> : <Text className="font-display-bold text-sm text-accent-strong">{row.badge}</Text>}
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">{row.title}</Text>
          <Text className="font-sans text-xs text-fg-muted" numberOfLines={2}>
            {row.subtitle}
          </Text>
        </View>
        <Text className="font-sans text-xs text-fg-muted">ص {toArabicDigits(row.page)}</Text>
        {row.remove && (
          <Pressable accessibilityRole="button" accessibilityLabel={row.remove.label} onPress={row.remove.run} hitSlop={10} className="p-1">
            <Trash2 size={17} color={muted} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export default function QuranIndexScreen() {
  const [tab, setTab] = useState<Tab>("surahs");
  const [query, setQuery] = useState("");
  const [undo, setUndo] = useState<Undo | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { bookmarks, notes } = useReaderState();

  const offerUndo = useCallback((message: string, restore: () => void) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const id = Date.now();
    setUndo({ id, message, restore });
    undoTimer.current = setTimeout(() => setUndo((current) => (current?.id === id ? null : current)), UNDO_MS);
  }, []);
  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

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
    if (tab === "hizb") {
      return hizbStartPages().map((page, index) => ({
        key: `hizb-${index + 1}`,
        badge: toArabicDigits(index + 1),
        title: `الحزب ${toArabicDigits(index + 1)}`,
        subtitle: `الجزء ${toArabicDigits(Math.ceil((index + 1) / 2))} · يبدأ من صفحة ${toArabicDigits(page)}`,
        page,
      }));
    }
    if (tab === "notes") {
      return Object.values(notes)
        .sort((a, b) => b.savedAt - a.savedAt)
        .map((note) => ({
          key: `note-${note.surah}-${note.ayah}`,
          badge: "",
          title: `سورة ${getSurah(note.surah)?.name ?? ""} · الآية ${toArabicDigits(note.ayah)}`,
          subtitle: note.text,
          page: note.page,
          remove: {
            label: "حذف الملاحظة",
            run: () => {
              reader.setNote(note.surah, note.ayah, note.page, "");
              offerUndo("حُذفت الملاحظة", () => reader.restoreNote(note));
            },
          },
        }));
    }
    if (tab === "bookmarks") {
      return bookmarks.map((mark) => ({
        key: `mark-${mark.surah}-${mark.ayah}`,
        badge: "",
        title: `سورة ${getSurah(mark.surah)?.name ?? ""}`,
        subtitle: `الآية ${toArabicDigits(mark.ayah)}`,
        page: mark.page,
        remove: {
          label: "حذف العلامة",
          run: () => {
            reader.removeBookmark(mark.surah, mark.ayah);
            offerUndo("حُذفت العلامة", () => reader.restoreBookmark(mark));
          },
        },
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
  }, [tab, query, bookmarks, notes, offerUndo]);

  const rowIcon = tab === "bookmarks" ? "bookmark" : tab === "notes" ? "note" : undefined;

  return (
    <View className="flex-1 bg-bg">
      <FlashList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={({ item }) => <IndexRow row={item} icon={rowIcon} />}
        keyboardShouldPersistTaps="handled"
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
              <Button variant="outline" size="sm" icon={TextSearch} className="self-start" onPress={() => router.push("/search")}>
                ابحث في نص القرآن
              </Button>
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
                      <Text numberOfLines={1} className={`font-sans-bold text-[13px] ${active ? "text-on-primary" : "text-fg-muted"}`}>
                        {entry.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {(tab === "bookmarks" || tab === "notes") && rows.length > 0 && (
                <Text className="font-sans text-xs text-fg-muted">اضغط مطولًا على أي عنصر أو على أيقونة الحذف لإزالته.</Text>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <StateMessage
            message={
              tab === "bookmarks"
                ? "لا توجد علامات بعد. اضغط مطولًا على أي آية لحفظها."
                : tab === "notes"
                  ? "لا توجد ملاحظات بعد. اضغط مطولًا على أي آية لتكتب ملاحظتك."
                  : "لا توجد سورة بهذا الاسم."
            }
          />
        }
      />

      {undo && (
        <Animated.View
          key={undo.id}
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(160)}
          className="absolute inset-x-4 bottom-3 flex-row items-center gap-3 rounded-2xl bg-hero px-4 py-3 shadow-lift"
          accessibilityLiveRegion="polite"
        >
          <Text className="flex-1 font-sans-bold text-sm text-hero-fg">{undo.message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              undo.restore();
              setUndo(null);
            }}
            hitSlop={10}
            className="px-2 py-1"
          >
            <Text className="font-sans-bold text-sm text-gold">تراجع</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}
