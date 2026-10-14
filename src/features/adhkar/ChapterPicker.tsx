import { BookOpenText, Check, ChevronDown } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { DUA_CHAPTERS } from "@/core/adhkar/duasData";
import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SearchField } from "@/components/ui/SearchField";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * "اختر باب الأذكار والدعاء": the website's chapter <select> for the 128 general Hisn al-Muslim chapters,
 * as a searchable bottom sheet.
 */
export function ChapterPicker({ value, onChange }: { value: number; onChange: (chapter: number) => void }) {
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
        className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <View className="size-10 items-center justify-center rounded-xl bg-primary-soft">
          <BookOpenText size={18} color={primary} />
        </View>
        <View className="flex-1">
          <Text className="font-sans text-xs text-fg-muted">اختر باب الأذكار والدعاء</Text>
          <Text numberOfLines={1} className="font-sans-bold text-base text-fg">
            {current?.title}
          </Text>
        </View>
        <ChevronDown size={20} color={muted} />
      </Pressable>

      <BottomSheet visible={open} onClose={close} title="أبواب حصن المسلم" icon={BookOpenText} scroll={false} maxHeight={0.85}>
        <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن باب، مثل: السفر أو المسجد" />
        <FlatList
          data={chapters}
          keyExtractor={(chapter) => String(chapter.id)}
          keyboardShouldPersistTaps="handled"
          style={{ flexShrink: 1 }}
          className="mt-3"
          contentContainerStyle={{ gap: 4 }}
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
                className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${active ? "border-primary bg-primary-soft" : "border-transparent"}`}
              >
                <Text className="w-8 font-sans text-xs text-fg-muted">{toArabicDigits(item.id)}</Text>
                <Text className={`flex-1 font-sans-semibold text-base ${active ? "text-primary" : "text-fg"}`}>{item.title}</Text>
                {active && <Check size={18} color={primary} />}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </>
  );
}
