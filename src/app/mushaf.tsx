import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import {
  ALargeSmall,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  HandHeart,
  Lock,
  Minus,
  Palette,
  Plus,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, View, useWindowDimensions, type ViewToken } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { currentTrack, usePlayer } from "@/features/audio/playerStore";
import { AYAH_PILL_HEIGHT, AyahAudioPill } from "@/features/mushaf/AyahAudioPill";
import { AyahSheet } from "@/features/mushaf/AyahSheet";
import { JumpSheet } from "@/features/mushaf/JumpSheet";
import { ayahIdFromTrackId, hafsPages, pageOfAyahId } from "@/features/mushaf/jump";
import { MushafPrintedPage } from "@/features/mushaf/MushafPrintedPage";
import { pageZoom, stepAfterPinch } from "@/features/mushaf/pageZoom";
import { TajweedLegendSheet } from "@/features/mushaf/TajweedLegendSheet";
import { ZoomedPage } from "@/features/mushaf/ZoomedPage";
import { TOTAL_PAGES, getPage, getSurah, type MushafAyah } from "@/features/mushaf/mushaf";
import {
  PORTION_DONE,
  PORTION_HOME,
  pagerIndex,
  pagerItems,
  parseReaderPortion,
  portionPosition,
  type ReaderPortion,
} from "@/features/mushaf/readerPortion";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import {
  DARK_READER_THEMES,
  FONT_SIZES,
  READER_THEMES,
  SUPPORTER_THEMES,
  isBookmarked,
  reader,
  useReaderState,
  type ReaderTheme,
} from "@/features/mushaf/readerPrefs";
import { recordReading } from "@/features/streak/streakStore";
import { useSupporter } from "@/features/support/supportStore";
import { useThemeColor } from "@/theme/useThemeColor";

/** The reader bar's square outlined button, drawn in the reader theme's own ink so it sits on any page colour. */
function ReaderIconButton({
  icon: Icon,
  label,
  onPress,
  ink,
  color,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  ink: string;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      className="size-11 items-center justify-center rounded-2xl border"
      style={({ pressed }) => ({ borderColor: `${ink}2e`, transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <Icon size={21} color={color ?? ink} strokeWidth={1.8} />
    </Pressable>
  );
}

/** Past the portion's last page: it is read, with the way back to record it, or on into the whole mushaf. */
function PortionDone({
  portion,
  width,
  height,
  theme,
  onExit,
}: {
  portion: ReaderPortion;
  width: number;
  height: number;
  theme: ReaderTheme;
  onExit: () => void;
}) {
  const colors = READER_THEMES[theme];
  const home = PORTION_HOME[portion.kind];
  return (
    <View style={{ width, height: height || undefined }} className="items-center justify-center gap-3 px-8">
      <View className="size-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.frame }}>
        <Check size={32} color={colors.accent} />
      </View>
      <Text accessibilityRole="header" className="text-center font-sans-bold text-2xl" style={{ color: colors.ink }}>
        أتممت وِردك، تقبّل الله منك
      </Text>
      <Text className="text-center font-sans text-sm leading-7" style={{ color: colors.ink, opacity: 0.7 }}>
        ارجع إلى {home.label} لتسجّل أنك قرأته.
      </Text>
      <Button icon={Check} className="mt-2" onPress={() => (router.canGoBack() ? router.back() : router.replace(home.href))}>
        {`سجّل الورد في ${home.label}`}
      </Button>
      {portion.to === TOTAL_PAGES && (
        <Button variant="gold" icon={HandHeart} onPress={() => router.push("/khatm-dua")}>
          دعاء ختم القرآن
        </Button>
      )}
      <Button variant="ghost" size="sm" icon={BookOpen} onPress={onExit}>
        المصحف كاملًا
      </Button>
    </View>
  );
}

/** A little longer than the bottom sheet's closing slide. */
const SHEET_CLOSE_MS = 320;

/** A setting's small label inside the reader settings sheet. */
function SettingLabel({ children }: { children: string }) {
  return <Text className="font-sans-bold text-base text-fg">{children}</Text>;
}

/** The paged mushaf: swipe between the 604 Madinah pages, fully offline. */
export default function MushafScreen() {
  useKeepAwake();
  const params = useLocalSearchParams<{ page?: string; until?: string; wird?: string }>();
  const initialPage = Math.min(TOTAL_PAGES, Math.max(1, Number(params.page) || 1));
  // «اقرأ الآن» from the khatma or the plan: only that portion's pages, then a "done" panel.
  const portion = useMemo(() => parseReaderPortion(initialPage, params.until, params.wird), [initialPage, params.until, params.wird]);
  const items = useMemo(() => pagerItems(portion), [portion]);
  const [portionDone, setPortionDone] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const state = useReaderState();
  const supporter = useSupporter();
  const player = usePlayer();
  const primaryColor = useThemeColor("primary");
  const mutedColor = useThemeColor("fg-muted");
  const [page, setPage] = useState(initialPage);
  // Counts today for the streak even when the reader reopens on yesterday's page.
  useEffect(() => {
    recordReading(page);
  }, [page]);
  const [chrome, setChrome] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const listRef = useRef<FlatList<number>>(null);
  const [selected, setSelected] = useState<MushafAyah | null>(null);
  const theme = READER_THEMES[state.prefs.theme];
  const fontSize = FONT_SIZES[state.prefs.fontStep] ?? FONT_SIZES[1];

  const darkPage = DARK_READER_THEMES.includes(state.prefs.theme);
  // The printed page, line for line: 15 fixed lines in the tajweed print. The size control scales the
  // whole page (panned when larger), it never reflows it.
  const zoom = pageZoom(state.prefs.fontStep);
  // A larger page pans under the finger, so the pages turn with the arrows instead of a swipe.
  const zoomed = zoom > 1;
  const [pagerHeight, setPagerHeight] = useState(0);
  const pagerExtra = useMemo(() => ({ pagerHeight, zoom }), [pagerHeight, zoom]);
  // Pinch the printed page to change its size (snapped to the size steps).
  const fontStep = state.prefs.fontStep;
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onEnd((event) => reader.setFontStep(stepAfterPinch(fontStep, event.scale))),
    [fontStep],
  );

  const playingId = ayahIdFromTrackId(currentTrack(player)?.id);
  // Room under the pages for the recitation pill, so it never covers the last line or the page number.
  const footerSpace = currentTrack(player) ? AYAH_PILL_HEIGHT + 12 : 0;

  const first = hafsPages(page)[0];
  const pageBookmarked = first ? isBookmarked(state, first.surah, first.ayah) : false;

  // Viewability is direction-agnostic, so the current page is right in RTL and LTR alike.
  // Stable identity (no deps): FlatList does not allow this callback to change after mount.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<number>[] }) => {
    const visible = viewableItems.find((token) => token.isViewable)?.item;
    if (typeof visible !== "number") return;
    setPortionDone(visible === PORTION_DONE);
    if (visible === PORTION_DONE) return;
    setPage(visible);
    const top = getPage(visible)[0];
    if (top) reader.saveLastRead({ page: visible, surah: top.surah, ayah: top.ayah });
  }, []);

  const toggleChrome = useCallback(() => setChrome((value) => !value), []);
  const openAyah = useCallback((ayah: MushafAyah) => setSelected(ayah), []);
  const getItemLayout = useMemo(() => (_: unknown, index: number) => ({ length: width, offset: width * index, index }), [width]);

  /** Leaves the portion for the whole mushaf, at a page. */
  const leavePortion = useCallback((target: number) => {
    router.replace({ pathname: "/mushaf", params: { page: String(target) } });
  }, []);

  const jumpTo = useCallback(
    (target: number, animated = false) => {
      const clamped = Math.min(TOTAL_PAGES, Math.max(1, target));
      // A jump out of the portion opens the whole mushaf there.
      if (portion && (clamped < portion.from || clamped > portion.to)) return leavePortion(clamped);
      listRef.current?.scrollToIndex({ index: pagerIndex(portion, clamped), animated });
      setPage(clamped);
    },
    [portion, leavePortion],
  );

  // Follow the recitation: when the next ayah is on another page and the reader was on the page of the
  // ayah before it, turn the page. A reader who has browsed elsewhere is left where they are.
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  const lastPlaying = useRef<number | null>(null);
  useEffect(() => {
    const previous = lastPlaying.current;
    lastPlaying.current = playingId;
    if (playingId === null || previous === null || playingId === previous) return;
    const target = pageOfAyahId(playingId);
    // In a portion, the recitation turns pages only within it.
    const inPortion = !portion || (target !== null && target >= portion.from && target <= portion.to);
    if (target !== null && inPortion && target !== pageRef.current && pageOfAyahId(previous) === pageRef.current) jumpTo(target, true);
  }, [playingId, jumpTo, portion]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.shell, paddingTop: insets.top, paddingBottom: insets.bottom + footerSpace }}>
      <StatusBar style={state.prefs.theme === "night" || state.prefs.theme === "dusk" ? "light" : "dark"} hidden={!chrome} />
      <GestureDetector gesture={pinch}>
        <FlatList
          ref={listRef}
          key={portion?.to ?? ""}
          data={items}
          extraData={pagerExtra}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          keyExtractor={(item) => String(item)}
          initialScrollIndex={pagerIndex(portion, page)}
          getItemLayout={getItemLayout}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          showsHorizontalScrollIndicator={false}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onViewableItemsChanged={onViewableItemsChanged}
          onLayout={(event) => setPagerHeight(event.nativeEvent.layout.height)}
          renderItem={({ item }) =>
            item === PORTION_DONE && portion ? (
              <PortionDone
                portion={portion}
                width={width}
                height={pagerHeight}
                theme={state.prefs.theme}
                onExit={() => leavePortion(portion.to)}
              />
            ) : pagerHeight === 0 ? (
              <View style={{ width }} />
            ) : (
              <ZoomedPage width={width} height={pagerHeight} zoom={zoom} background={theme.shell}>
                {(frame) => (
                  <MushafPrintedPage
                    page={item}
                    width={frame.width}
                    height={frame.height}
                    theme={state.prefs.theme}
                    selected={selected?.id ?? null}
                    playingId={playingId}
                    onTap={toggleChrome}
                    onAyahLongPress={openAyah}
                  />
                )}
              </ZoomedPage>
            )
          }
        />
      </GestureDetector>

      {chrome && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(260)}
          className="absolute inset-x-0 flex-row items-center gap-3 px-4 py-2"
          style={{ top: insets.top, backgroundColor: theme.shell }}
        >
          <ReaderIconButton icon={ChevronRight} label="رجوع" ink={theme.ink} onPress={() => router.back()} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="الانتقال إلى سورة أو جزء أو صفحة"
            onPress={() => setJumpOpen(true)}
            hitSlop={6}
            className="flex-1 flex-row items-center gap-1.5"
          >
            <View className="shrink">
              <Text className="font-sans-bold text-base" style={{ color: theme.ink }} numberOfLines={1}>
                {first ? `سورة ${getSurah(first.surah)?.name ?? ""} · الجزء ${toArabicDigits(first.juz)}` : ""}
              </Text>
              <Text className="font-sans text-xs" style={{ color: theme.accent }}>
                {portion
                  ? `ورد اليوم: صفحة ${toArabicDigits(portionPosition(portion, page).position)} من ${toArabicDigits(portionPosition(portion, page).total)}`
                  : `صفحة ${toArabicDigits(page)} من ${toArabicDigits(TOTAL_PAGES)}`}
              </Text>
            </View>
            <ChevronDown size={18} color={theme.accent} />
          </Pressable>
          <ReaderIconButton
            icon={pageBookmarked ? BookmarkCheck : Bookmark}
            label={pageBookmarked ? "إزالة العلامة" : "حفظ علامة على هذه الصفحة"}
            ink={theme.ink}
            color={pageBookmarked ? theme.accent : theme.ink}
            onPress={() => first && reader.toggleBookmark({ surah: first.surah, ayah: first.ayah, page })}
          />
          <ReaderIconButton icon={Palette} label="ألوان التجويد" ink={theme.ink} onPress={() => setLegendOpen(true)} />
          <ReaderIconButton icon={ALargeSmall} label="إعدادات القراءة" ink={theme.ink} onPress={() => setSettingsOpen(true)} />
        </Animated.View>
      )}

      {/* A zoomed page pans under the finger: the pages turn with these arrows (RTL: the next page is to the left). */}
      {chrome && zoomed && !portionDone && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(260)}
          pointerEvents="box-none"
          className="absolute inset-x-0 flex-row items-center justify-between px-4"
          style={{ bottom: insets.bottom + footerSpace + 72 }}
        >
          <ReaderIconButton
            icon={ChevronRight}
            label="الصفحة السابقة"
            ink={theme.ink}
            onPress={() => jumpTo(Math.max(portion?.from ?? 1, page - 1), true)}
          />
          <ReaderIconButton
            icon={ChevronLeft}
            label="الصفحة التالية"
            ink={theme.ink}
            onPress={() =>
              portion && page >= portion.to
                ? listRef.current?.scrollToIndex({ index: pagerIndex(portion, portion.to) + 1, animated: true })
                : jumpTo(Math.min(portion?.to ?? TOTAL_PAGES, page + 1), true)
            }
          />
        </Animated.View>
      )}

      {/* In a portion: on its last page, "done" (one more swipe does the same); and the way out to the whole mushaf. */}
      {chrome && portion && !portionDone && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(260)}
          pointerEvents="box-none"
          className="absolute inset-x-0 flex-row items-center justify-center gap-2"
          style={{ bottom: insets.bottom + footerSpace + 16 }}
        >
          {page === portion.to && (
            <Button
              variant="gold"
              icon={Check}
              onPress={() => listRef.current?.scrollToIndex({ index: pagerIndex(portion, portion.to) + 1, animated: true })}
            >
              أتممت الورد
            </Button>
          )}
          <Button variant="outline" size="sm" icon={BookOpen} onPress={() => leavePortion(page)}>
            المصحف كاملًا
          </Button>
        </Animated.View>
      )}

      {/* The khatm: on the last page, with the reader chrome, so the fixed 15-line page is left untouched. */}
      {chrome && !portion && page === TOTAL_PAGES && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(260)}
          pointerEvents="box-none"
          className="absolute inset-x-0 items-center"
          style={{ bottom: insets.bottom + footerSpace + 16 }}
        >
          <Button variant="gold" icon={HandHeart} onPress={() => router.push("/khatm-dua")}>
            دعاء ختم القرآن
          </Button>
        </Animated.View>
      )}

      <AyahAudioPill theme={state.prefs.theme} bottom={insets.bottom + 4} />

      <JumpSheet visible={jumpOpen} page={page} source={hafsPages} onJump={jumpTo} onClose={() => setJumpOpen(false)} />

      <AyahSheet ayah={selected} onClose={() => setSelected(null)} />

      <TajweedLegendSheet visible={legendOpen} dark={darkPage} onClose={() => setLegendOpen(false)} />

      <BottomSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} title="إعدادات القراءة" icon={ALargeSmall}>
        <View className="gap-6">
          <View className="gap-3">
            <SettingLabel>لون الصفحة</SettingLabel>
            <View className="flex-row flex-wrap gap-2.5">
              {(Object.keys(READER_THEMES) as ReaderTheme[]).map((key) => {
                const option = READER_THEMES[key];
                const active = key === state.prefs.theme;
                const locked = SUPPORTER_THEMES.includes(key) && !supporter;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityHint={locked ? "متاح لداعمي المنارة" : undefined}
                    onPress={() => {
                      if (!locked) return reader.setTheme(key);
                      setSettingsOpen(false);
                      router.push("/support");
                    }}
                    className={`min-w-[30%] flex-1 items-center rounded-2xl py-3 ${active ? "border-2 border-primary" : "border border-border"}`}
                    style={({ pressed }) => ({ backgroundColor: option.page, transform: [{ scale: pressed ? 0.97 : 1 }] })}
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
          </View>

          {/* The two sheets are separate windows: the key opens once this one has slid away. */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSettingsOpen(false);
              setTimeout(() => setLegendOpen(true), SHEET_CLOSE_MS);
            }}
            className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4"
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <Palette size={20} color={primaryColor} />
            <View className="flex-1">
              <Text className="font-sans-bold text-base text-fg">ألوان التجويد</Text>
              <Text className="font-sans text-xs leading-5 text-fg-muted">ما يعنيه كل لون في المصحف</Text>
            </View>
            <ChevronLeft size={18} color={mutedColor} />
          </Pressable>

          <View className="gap-3">
            <SettingLabel>حجم الصفحة</SettingLabel>
            <Text className="font-sans text-xs leading-5 text-fg-muted">
              تكبر الصفحة كما هي بأسطرها الخمسة عشر وتتنقّل فيها بإصبعك، ويمكنك التكبير بإصبعين. يُنزَّل خط كل صفحة أول مرة ثم يعمل دون
              إنترنت.
            </Text>
            <View className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-2 py-1.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تكبير الخط"
                onPress={() => reader.setFontStep(state.prefs.fontStep + 1)}
                className="size-11 items-center justify-center rounded-xl border border-border"
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
              >
                <Plus size={20} color={primaryColor} />
              </Pressable>
              <Text className="font-quran text-fg" style={{ fontSize }}>
                ٱلْحَمْدُ لِلَّهِ
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تصغير الخط"
                onPress={() => reader.setFontStep(state.prefs.fontStep - 1)}
                className="size-11 items-center justify-center rounded-xl border border-border"
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
              >
                <Minus size={20} color={primaryColor} />
              </Pressable>
            </View>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
