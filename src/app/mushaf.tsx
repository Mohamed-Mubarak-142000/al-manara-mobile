import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import { ALargeSmall, Bookmark, BookmarkCheck, ChevronRight, Minus, Plus } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View, useWindowDimensions, type ViewToken } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { currentTrack, usePlayer } from "@/features/audio/playerStore";
import { AyahSheet } from "@/features/mushaf/AyahSheet";
import { MushafPageView } from "@/features/mushaf/MushafPageView";
import { TOTAL_PAGES, getPage, getSurah, type MushafAyah } from "@/features/mushaf/mushaf";
import { FONT_SIZES, READER_THEMES, isBookmarked, reader, useReaderState, type ReaderTheme } from "@/features/mushaf/readerPrefs";

const PAGES = Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1);

/** The paged mushaf: swipe between the 604 Madinah pages, fully offline. */
export default function MushafScreen() {
  useKeepAwake();
  const params = useLocalSearchParams<{ page?: string }>();
  const initialPage = Math.min(TOTAL_PAGES, Math.max(1, Number(params.page) || 1));
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const state = useReaderState();
  const player = usePlayer();
  const [page, setPage] = useState(initialPage);
  const [chrome, setChrome] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<MushafAyah | null>(null);
  const theme = READER_THEMES[state.prefs.theme];
  const fontSize = FONT_SIZES[state.prefs.fontStep] ?? FONT_SIZES[1];

  const playingTrack = currentTrack(player);
  const playingId = playingTrack?.id.startsWith("ayah-") ? Number(playingTrack.id.split("-").pop()) : null;

  const first = getPage(page)[0];
  const pageBookmarked = first ? isBookmarked(state, first.surah, first.ayah) : false;

  // Viewability is direction-agnostic, so the current page is right in RTL and LTR alike.
  // Stable identity (no deps): FlatList does not allow this callback to change after mount.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
    const visible = viewableItems.find((token) => token.isViewable)?.item;
    if (typeof visible !== "number") return;
    setPage(visible);
    const top = getPage(visible)[0];
    if (top) reader.saveLastRead({ page: visible, surah: top.surah, ayah: top.ayah });
  }, []);

  const toggleChrome = useCallback(() => setChrome((value) => !value), []);
  const openAyah = useCallback((ayah: MushafAyah) => setSelected(ayah), []);
  const getItemLayout = useMemo(() => (_: unknown, index: number) => ({ length: width, offset: width * index, index }), [width]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.shell, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar style={state.prefs.theme === "night" ? "light" : "dark"} hidden={!chrome} />
      <FlatList
        data={PAGES}
        horizontal
        pagingEnabled
        keyExtractor={(item) => String(item)}
        initialScrollIndex={initialPage - 1}
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
            onTap={toggleChrome}
            onAyahLongPress={openAyah}
          />
        )}
      />

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
              صفحة {toArabicDigits(page)} من {toArabicDigits(TOTAL_PAGES)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pageBookmarked ? "إزالة العلامة" : "حفظ علامة على هذه الصفحة"}
            onPress={() => first && reader.toggleBookmark({ surah: first.surah, ayah: first.ayah, page })}
            hitSlop={10}
            className="p-1.5"
          >
            {pageBookmarked ? <BookmarkCheck size={22} color={theme.accent} /> : <Bookmark size={22} color={theme.ink} />}
          </Pressable>
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

      <AyahSheet ayah={selected} onClose={() => setSelected(null)} />

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setSettingsOpen(false)}>
          <Pressable className="rounded-t-[32px] bg-surface px-5 pt-5" style={{ paddingBottom: insets.bottom + 20 }}>
            <Text className="font-display-bold text-lg text-fg">إعدادات القراءة</Text>
            <Text className="mt-4 font-sans-bold text-sm text-fg-muted">لون الصفحة</Text>
            <View className="mt-2 flex-row gap-2">
              {(Object.keys(READER_THEMES) as ReaderTheme[]).map((key) => {
                const option = READER_THEMES[key];
                const active = key === state.prefs.theme;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => reader.setTheme(key)}
                    className={`flex-1 items-center rounded-2xl border-2 py-3 ${active ? "border-primary" : "border-border"}`}
                    style={{ backgroundColor: option.page }}
                  >
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
