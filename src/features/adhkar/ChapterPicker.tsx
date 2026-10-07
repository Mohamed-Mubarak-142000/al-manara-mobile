import { BookOpenText, Check, ChevronDown, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DUA_CHAPTERS } from "@/core/adhkar/duasData";
import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { SearchField } from "@/components/ui/SearchField";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * "اختر باب الأذكار والدعاء": the website's chapter <select> for the 128 general Hisn al-Muslim chapters,
 * as a searchable bottom sheet.
 */
export function ChapterPicker({ value, onChange }: { value: number; onChange: (chapter: number) => void }) {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = DUA_CHAPTERS.find((chapter) => chapter.id === value);

  const chapters = useMemo(() => {
    const needle = normalizeArabic(query.trim());
    return needle ? DUA_CHAPTERS.filter((chapter) => normalizeArabic(chapter.title).includes(needle)) : DUA_CHAPTERS;
  }, [query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`باب الأذكار: ${current?.title ?? ""}، اضغط للتغيير`}
        onPress={() => setOpen(true)}
        className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft"
      >
        <BookOpenText size={18} color={primary} />
        <View className="flex-1">
          <Text className="font-sans text-xs text-fg-muted">اختر باب الأذكار والدعاء</Text>
          <Text numberOfLines={1} className="font-sans-bold text-base text-fg">
            {current?.title}
          </Text>
        </View>
        <ChevronDown size={20} color={muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <Pressable accessibilityLabel="إغلاق" onPress={close} className="flex-1 bg-black/50" />
        <View className="max-h-[80%] rounded-t-[28px] bg-surface px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-border" />
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-display-bold text-lg text-fg">أبواب حصن المسلم</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={close} hitSlop={10} className="p-1">
              <X size={20} color={muted} />
            </Pressable>
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن باب، مثل: السفر أو المسجد" />
          <FlatList
            data={chapters}
            keyExtractor={(chapter) => String(chapter.id)}
            keyboardShouldPersistTaps="handled"
            className="mt-2"
            ListEmptyComponent={<Text className="mt-6 text-center font-sans text-sm text-fg-muted">لا يوجد باب بهذا الاسم.</Text>}
            renderItem={({ item }) => {
              const active = item.id === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onChange(item.id);
                    close();
                  }}
                  className={`flex-row items-center gap-3 rounded-2xl px-4 py-3 ${active ? "bg-primary-soft" : ""}`}
                >
                  <Text className="w-8 font-sans text-xs text-fg-muted">{toArabicDigits(item.id)}</Text>
                  <Text className={`flex-1 font-sans-bold text-base ${active ? "text-primary" : "text-fg"}`}>{item.title}</Text>
                  {active && <Check size={18} color={primary} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}
