import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import { ALargeSmall, Bookmark, BookmarkCheck, ChevronRight, Download, Lock, Minus, Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Switch, Text, View, useWindowDimensions, type ViewToken } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAJWEED_RULES } from "@/core/quran/tajweedApi";
import { toArabicDigits } from "@/core/text/arabic";
import { currentTrack, usePlayer } from "@/features/audio/playerStore";
import { AyahSheet } from "@/features/mushaf/AyahSheet";
import { MushafPageView } from "@/features/mushaf/MushafPageView";
import { TOTAL_PAGES, getPage, getSurah, type MushafAyah } from "@/features/mushaf/mushaf";
import { RIWAYAT, isRiwayaDownloaded, riwayaFontFamily, riwayat, useRiwaya } from "@/features/mushaf/riwayat";
import { Button } from "@/components/ui/Button";
import {
  FONT_SIZES,
  READER_THEMES,
  SUPPORTER_THEMES,
  isBookmarked,
  reader,
  useReaderState,
  type ReaderTheme,
} from "@/features/mushaf/readerPrefs";
import { useSupporter } from "@/features/support/supportStore";

const PAGES = Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1);

/** The paged mushaf: swipe between the 604 Madinah pages, fully offline. */
export default function MushafScreen() {
  useKeepAwake();
  const params = useLocalSearchParams<{ page?: string }>();
  const initialPage = Math.min(TOTAL_PAGES, Math.max(1, Number(params.page) || 1));
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const state = useReaderState();
  const supporter = useSupporter();
  const player = usePlayer();
  const [page, setPage] = useState(initialPage);
  const [chrome, setChrome] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<MushafAyah | null>(null);
  const theme = READER_THEMES[state.prefs.theme];
  const fontSize = FONT_SIZES[state.prefs.fontStep] ?? FONT_SIZES[1];

  const riwayaKey = state.prefs.riwaya;
  const riwayaState = useRiwaya(riwayaKey);
  const riwaya = useMemo(
    () =>
      riwayaKey !== "hafs" && riwayaState?.status === "ready"
        ? { mushaf: riwayaState.mushaf, fontFamily: riwayaFontFamily(riwayaKey) }
        : null,
    [riwayaKey, riwayaState],
  );
  const riwayaLabel = RIWAYAT.find((entry) => entry.key === riwayaKey)?.label ?? "";
  // Last-read and bookmarks keep to the Hafs pages (other riwayat number their ayahs differently).
  const isHafs = useRef(riwayaKey === "hafs");
  useEffect(() => {
    isHafs.current = riwayaKey === "hafs";
  }, [riwayaKey]);

  const playingTrack = currentTrack(player);
  const playingId = playingTrack?.id.startsWith("ayah-") ? Number(playingTrack.id.split("-").pop()) : null;

  const first = riwaya ? riwaya.mushaf.pages[page - 1]?.[0] : getPage(page)[0];
  const pageBookmarked = first ? isBookmarked(state, first.surah, first.ayah) : false;

  // Viewability is direction-agnostic, so the current page is right in RTL and LTR alike.
  // Stable identity (no deps): FlatList does not allow this callback to change after mount.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
    const visible = viewableItems.find((token) => token.isViewable)?.item;
    if (typeof visible !== "number") return;
    setPage(visible);
    const top = getPage(visible)[0];
    if (top && isHafs.current) reader.saveLastRead({ page: visible, surah: top.surah, ayah: top.ayah });
  }, []);

  const toggleChrome = useCallback(() => setChrome((value) => !value), []);
  const openAyah = useCallback((ayah: MushafAyah) => setSelected(ayah), []);
  const getItemLayout = useMemo(() => (_: unknown, index: number) => ({ length: width, offset: width * index, index }), [width]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.shell, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar style={state.prefs.theme === "night" || state.prefs.theme === "dusk" ? "light" : "dark"} hidden={!chrome} />
      {riwayaKey !== "hafs" && !riwaya ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-center font-display-bold text-xl" style={{ color: theme.ink }}>
            رواية {riwayaLabel}
          </Text>
          <Text className="text-center font-sans text-sm leading-7" style={{ color: theme.ink, opacity: 0.7 }}>
            {riwayaState?.status === "downloading" || riwayaState?.status === "opening"
              ? "جارٍ تجهيز المصحف…"
              : riwayaState?.status === "failed"
                ? "تعذّر تنزيل الرواية. تحقق من الاتصال وحاول مجددًا."
                : "مصحف هذه الرواية يُنزَّل مرة واحدة (نحو ١٫٥ ميجابايت) ثم يعمل دون إنترنت."}
          </Text>
          {riwayaState?.status !== "downloading" && riwayaState?.status !== "opening" && (
            <Button icon={Download} onPress={() => riwayat.download(riwayaKey)}>
              تنزيل المصحف
            </Button>
          )}
          <Button variant="ghost" size="sm" onPress={() => reader.setRiwaya("hafs")}>
            العودة إلى رواية حفص
          </Button>
        </View>
      ) : (
        <FlatList
          key={riwayaKey}
          data={PAGES}
          extraData={riwaya}
          horizontal
          pagingEnabled
          keyExtractor={(item) => String(item)}
          // Remounted per riwaya (key): it then opens on the page the reader was on.
          initialScrollIndex={page - 1}
          getItemLayout={getItemLayout}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          showsHorizontalScrollIndicator={false}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item }) => (
            <MushafPageView
              page={item}
              width={width}
              theme={state.prefs.theme}
              fontSize={fontSize}
              selected={selected?.id ?? null}
              playingId={playingId}
              tajweed={state.prefs.tajweed}
              riwaya={riwaya}
              onTap={toggleChrome}
              onAyahLongPress={openAyah}
            />
          )}
        />
      )}

      {chrome && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          className="absolute inset-x-0 flex-row items-center gap-2 px-3 py-2"
          style={{ top: insets.top, backgroundColor: theme.shell }}
        >
          <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12} className="p-1">
            <ChevronRight size={26} color={theme.ink} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display-bold text-base" style={{ color: theme.ink }}>
              {first ? `سورة ${getSurah(first.surah)?.name ?? ""}` : ""}
            </Text>
            <Text className="font-sans text-xs" style={{ color: theme.accent }}>
              {riwayaKey === "hafs" ? "" : `${RIWAYAT.find((entry) => entry.key === riwayaKey)?.short} · `}صفحة {toArabicDigits(page)} من{" "}
              {toArabicDigits(TOTAL_PAGES)}
            </Text>
          </View>
          {riwayaKey === "hafs" && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pageBookmarked ? "إزالة العلامة" : "حفظ علامة على هذه الصفحة"}
              onPress={() => first && reader.toggleBookmark({ surah: first.surah, ayah: first.ayah, page })}
              hitSlop={10}
              className="p-1.5"
            >
              {pageBookmarked ? <BookmarkCheck size={22} color={theme.accent} /> : <Bookmark size={22} color={theme.ink} />}
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إعدادات القراءة"
            onPress={() => setSettingsOpen(true)}
            hitSlop={10}
            className="p-1.5"
          >
            <ALargeSmall size={24} color={theme.ink} />
          </Pressable>
        </Animated.View>
      )}

      <AyahSheet ayah={selected} riwaya={riwayaKey === "hafs" ? null : riwayaLabel} onClose={() => setSelected(null)} />

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setSettingsOpen(false)}>
          <Pressable className="rounded-t-[32px] bg-surface px-5 pt-5" style={{ paddingBottom: insets.bottom + 20 }}>
            <Text className="font-display-bold text-lg text-fg">إعدادات القراءة</Text>
            <Text className="mt-4 font-sans-bold text-sm text-fg-muted">الرواية</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
              {RIWAYAT.map((entry) => {
                const active = entry.key === riwayaKey;
                const local = entry.key === "hafs" || isRiwayaDownloaded(entry.key);
                return (
                  <Pressable
                    key={entry.key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => reader.setRiwaya(entry.key)}
                    className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${active ? "border-primary bg-primary" : "border-border bg-bg"}`}
                  >
                    <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{entry.short}</Text>
                    {!local && <Download size={13} color={active ? "#fbf8f1" : theme.accent} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text className="mt-5 font-sans-bold text-sm text-fg-muted">لون الصفحة</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {(Object.keys(READER_THEMES) as ReaderTheme[]).map((key) => {
                const option = READER_THEMES[key];
                const active = key === state.prefs.theme;
                const locked = SUPPORTER_THEMES.includes(key) && !supporter;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityHint={locked ? "متاح مع باقة الداعمين" : undefined}
                    onPress={() => {
                      if (!locked) return reader.setTheme(key);
                      setSettingsOpen(false);
                      router.push("/support");
                    }}
                    className={`min-w-[30%] flex-1 items-center rounded-2xl border-2 py-3 ${active ? "border-primary" : "border-border"}`}
                    style={{ backgroundColor: option.page }}
                  >
                    {locked && (
                      <View className="absolute end-2 top-2">
                        <Lock size={12} color={option.accent} />
                      </View>
                    )}
                    <Text className="font-quran text-lg" style={{ color: option.ink }}>
                      بِسْمِ
                    </Text>
                    <Text className="font-sans-bold text-xs" style={{ color: option.accent }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-5 flex-row items-center justify-between">
              <Text className="font-sans-bold text-sm text-fg">تلوين أحكام التجويد</Text>
              <Switch
                value={state.prefs.tajweed}
                onValueChange={reader.setTajweed}
                trackColor={{ false: "#e5e6dc", true: "#005544" }}
                thumbColor="#ffffff"
              />
            </View>
            {state.prefs.tajweed && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
                {/* One chip per colour: several rules share a colour (the idgham greens, for instance). */}
                {Object.values(TAJWEED_RULES)
                  .filter((rule, index, all) => all.findIndex((other) => other.color === rule.color) === index)
                  .map((rule) => (
                    <View key={rule.color} className="flex-row items-center gap-1.5 rounded-full border border-border px-2.5 py-1">
                      <View className="size-2.5 rounded-full" style={{ backgroundColor: rule.color }} />
                      <Text className="font-sans text-xs text-fg">{rule.label}</Text>
                    </View>
                  ))}
              </ScrollView>
            )}
            <Text className="mt-5 font-sans-bold text-sm text-fg-muted">حجم الخط</Text>
            <View className="mt-2 flex-row items-center justify-between rounded-2xl border border-border px-2 py-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تكبير الخط"
                onPress={() => reader.setFontStep(state.prefs.fontStep + 1)}
                className="p-3"
              >
                <Plus size={20} color={theme.accent} />
              </Pressable>
              <Text className="font-quran text-fg" style={{ fontSize }}>
                ٱلْحَمْدُ لِلَّهِ
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تصغير الخط"
                onPress={() => reader.setFontStep(state.prefs.fontStep - 1)}
                className="p-3"
              >
                <Minus size={20} color={theme.accent} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
