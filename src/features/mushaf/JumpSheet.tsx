import { FlashList } from "@shopify/flash-list";
import { X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { useThemeColor } from "@/theme/useThemeColor";

import { juzStartPage, parsePageInput, surahStartPage, type PageSource } from "./jump";
import { TOTAL_PAGES, getSurah, getSurahs } from "./mushaf";

type Tab = "surah" | "juz" | "page";

const TABS: { key: Tab; label: string }[] = [
  { key: "surah", label: "السورة" },
  { key: "juz", label: "الجزء" },
  { key: "page", label: "الصفحة" },
];

const JUZ = Array.from({ length: 30 }, (_, index) => index + 1);

/** "Go to": a surah, a juz or a page number, without leaving the mushaf. */
export function JumpSheet({
  visible,
  page,
  source,
  onJump,
  onClose,
}: {
  visible: boolean;
  /** The page being read, to mark the current surah and juz. */
  page: number;
  source: PageSource;
  onJump: (page: number) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const fg = useThemeColor("fg");
  const muted = useThemeColor("fg-muted");
  const [tab, setTab] = useState<Tab>("surah");
  const [query, setQuery] = useState("");
  const [pageText, setPageText] = useState("");
  const [pageError, setPageError] = useState(false);

  const first = source(page)[0];
  const currentSurah = first?.surah ?? 1;
  const currentJuz = first?.juz ?? 1;

  const surahs = useMemo(() => {
    const needle = normalizeArabic(query.trim());
    const digits = parsePageInput(query) ?? Number(query.trim());
    return getSurahs().filter((surah) => !needle || normalizeArabic(surah.name).includes(needle) || surah.number === digits);
  }, [query]);

  const typed = parsePageInput(pageText);
  const typedSurah = typed ? getSurah(source(typed)[0]?.surah ?? 0)?.name : undefined;

  function go(target: number) {
    onJump(target);
    onClose();
    setPageText("");
    setPageError(false);
  }

  function submitPage() {
    if (typed) go(typed);
    else setPageError(true);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="إغلاق" />
        <View className="rounded-t-[32px] bg-surface px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-border" />
          <View className="flex-row items-center justify-between">
            <Text className="font-display-bold text-lg text-fg">انتقل إلى</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={onClose} hitSlop={10}>
              <X size={22} color={muted} />
            </Pressable>
          </View>

          <View className="mt-3 flex-row rounded-full border border-border bg-bg p-1">
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

          {tab === "surah" && (
            <View className="mt-3 gap-2">
              <SearchField value={query} onChangeText={setQuery} placeholder="اسم السورة أو رقمها" />
              <View style={{ height: height * 0.45 }}>
                <FlashList
                  data={surahs}
                  keyExtractor={(surah) => String(surah.number)}
                  keyboardShouldPersistTaps="handled"
                  extraData={currentSurah}
                  renderItem={({ item }) => {
                    const active = item.number === currentSurah;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => go(surahStartPage(source, item.number))}
                        className={`mb-1.5 flex-row items-center gap-3 rounded-2xl px-3 py-2.5 ${active ? "bg-primary-soft" : ""}`}
                      >
                        <Text className="w-8 text-center font-display-bold text-sm text-accent-strong">{toArabicDigits(item.number)}</Text>
                        <Text className={`flex-1 font-display-bold text-base ${active ? "text-primary" : "text-fg"}`}>سورة {item.name}</Text>
                        <Text className="font-sans text-xs text-fg-muted">{toArabicDigits(item.ayahCount)} آية</Text>
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={<Text className="py-6 text-center font-sans text-sm text-fg-muted">لا توجد سورة بهذا الاسم.</Text>}
                />
              </View>
            </View>
          )}

          {tab === "juz" && (
            <ScrollView className="mt-3" style={{ maxHeight: height * 0.5 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {JUZ.map((juz) => {
                const active = juz === currentJuz;
                return (
                  <Pressable
                    key={juz}
                    accessibilityRole="button"
                    accessibilityLabel={`الجزء ${toArabicDigits(juz)}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => go(juzStartPage(source, juz))}
                    className={`h-12 w-[18%] grow items-center justify-center rounded-2xl border ${active ? "border-primary bg-primary" : "border-border bg-bg"}`}
                  >
                    <Text className={`font-display-bold text-base ${active ? "text-on-primary" : "text-fg"}`}>{toArabicDigits(juz)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {tab === "page" && (
            <View className="mt-4 gap-3">
              <Text className="font-sans text-sm text-fg-muted">
                رقم الصفحة من {toArabicDigits(1)} إلى {toArabicDigits(TOTAL_PAGES)}
              </Text>
              <TextInput
                value={pageText}
                onChangeText={(text) => {
                  setPageText(text);
                  setPageError(false);
                }}
                onSubmitEditing={submitPage}
                placeholder={toArabicDigits(page)}
                placeholderTextColor={muted}
                keyboardType="number-pad"
                returnKeyType="go"
                maxLength={4}
                autoFocus
                accessibilityLabel="رقم الصفحة"
                className={`h-14 rounded-2xl border bg-bg px-4 font-display-bold text-2xl ${pageError ? "border-danger" : "border-border"}`}
                style={{ color: fg, textAlign: "center" }}
              />
              <Text className={`text-center font-sans text-sm ${pageError ? "text-danger" : "text-fg-muted"}`} accessibilityLiveRegion="polite">
                {pageError
                  ? `أدخل رقمًا بين ${toArabicDigits(1)} و${toArabicDigits(TOTAL_PAGES)}`
                  : typed
                    ? `صفحة ${toArabicDigits(typed)}${typedSurah ? ` · سورة ${typedSurah}` : ""}`
                    : " "}
              </Text>
              <Button onPress={submitPage}>اذهب إلى الصفحة</Button>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
