import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import {
  ALargeSmall,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronRight,
  Download,
  HandHeart,
  Lock,
  Minus,
  Plus,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, Switch, Text, View, useWindowDimensions, type ViewToken } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TAJWEED_RULES } from "@/core/quran/tajweedApi";
import { toArabicDigits } from "@/core/text/arabic";
import { currentTrack, usePlayer } from "@/features/audio/playerStore";
import { AYAH_PILL_HEIGHT, AyahAudioPill } from "@/features/mushaf/AyahAudioPill";
import { AyahSheet } from "@/features/mushaf/AyahSheet";
import { JumpSheet } from "@/features/mushaf/JumpSheet";
import { ayahIdFromTrackId, hafsPages, pageOfAyahId, type PageSource } from "@/features/mushaf/jump";
import { MushafPrintedPage } from "@/features/mushaf/MushafPrintedPage";
import { MushafPageView } from "@/features/mushaf/MushafPageView";
import { TOTAL_PAGES, getPage, getSurah, type MushafAyah } from "@/features/mushaf/mushaf";
import { RIWAYAT, isRiwayaDownloaded, riwayaFontFamily, riwayat, useRiwaya } from "@/features/mushaf/riwayat";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_FONT_STEP,
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

const PAGES = Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1);

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

/** A setting's small label inside the reader settings sheet. */
function SettingLabel({ children }: { children: string }) {
  return <Text className="font-sans-bold text-base text-fg">{children}</Text>;
}

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
  const primaryColor = useThemeColor("primary");
  const borderColor = useThemeColor("border");
  const onPrimary = useThemeColor("on-primary");
  const [page, setPage] = useState(initialPage);
  // Counts today for the streak even when the reader reopens on yesterday's page.
  useEffect(() => {
    recordReading(page);
  }, [page]);
  const [chrome, setChrome] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const listRef = useRef<FlatList<number>>(null);
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
  // Hafs in the printed layout at the normal size (and smaller) is laid out line for line as printed: 15
  // fixed lines a page, nothing scrolls. Larger sizes, the flowing layout and the other riwayat (no line
  // layout) flow and scroll instead.
  const fixedPages = riwayaKey === "hafs" && state.prefs.layout === "printed" && state.prefs.fontStep <= DEFAULT_FONT_STEP;
  const [pagerHeight, setPagerHeight] = useState(0);
  const pagerExtra = useMemo(() => ({ riwaya, fixedPages, pagerHeight }), [riwaya, fixedPages, pagerHeight]);
  // Last-read and bookmarks keep to the Hafs pages (other riwayat number their ayahs differently).
  const isHafs = useRef(riwayaKey === "hafs");
  useEffect(() => {
    isHafs.current = riwayaKey === "hafs";
  }, [riwayaKey]);

  const source: PageSource = useMemo(() => (riwaya ? (target: number) => riwaya.mushaf.pages[target - 1] ?? [] : hafsPages), [riwaya]);
  // Ayah-by-ayah audio is Hafs-numbered, so it is only highlighted on the Hafs pages.
  const ayahAudioId = ayahIdFromTrackId(currentTrack(player)?.id);
  const playingId = riwayaKey === "hafs" ? ayahAudioId : null;
  // Room under the pages for the recitation pill, so it never covers the last line or the page number.
  const footerSpace = currentTrack(player) ? AYAH_PILL_HEIGHT + 12 : 0;

  const first = source(page)[0];
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

  const jumpTo = useCallback((target: number, animated = false) => {
    const clamped = Math.min(TOTAL_PAGES, Math.max(1, target));
    listRef.current?.scrollToIndex({ index: clamped - 1, animated });
    setPage(clamped);
  }, []);

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
    if (target !== null && target !== pageRef.current && pageOfAyahId(previous) === pageRef.current) jumpTo(target, true);
  }, [playingId, jumpTo]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.shell, paddingTop: insets.top, paddingBottom: insets.bottom + footerSpace }}>
      <StatusBar style={state.prefs.theme === "night" || state.prefs.theme === "dusk" ? "light" : "dark"} hidden={!chrome} />
      {riwayaKey !== "hafs" && !riwaya ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-center font-sans-bold text-xl" style={{ color: theme.ink }}>
            رواية {riwayaLabel}
          </Text>
          <Text className="text-center font-sans text-sm leading-7" style={{ color: theme.ink, opacity: 0.7 }}>
            {riwayaState?.status === "downloading" || riwayaState?.status === "opening"
              ? "جارٍ تجهيز المصحف…"
              : riwayaState?.status === "failed"
                ? "تعذّر تنزيل الرواية الآن، حاول مجددًا بعد قليل."
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
          ref={listRef}
          key={riwayaKey}
          data={PAGES}
          extraData={pagerExtra}
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
          onLayout={(event) => setPagerHeight(event.nativeEvent.layout.height)}
          renderItem={({ item }) =>
            fixedPages ? (
              pagerHeight === 0 ? (
                <View style={{ width }} />
              ) : (
                <MushafPrintedPage
                  page={item}
                  width={width}
                  height={pagerHeight}
                  theme={state.prefs.theme}
                  selected={selected?.id ?? null}
                  playingId={playingId}
                  tajweed={state.prefs.tajweed}
                  onTap={toggleChrome}
                  onAyahLongPress={openAyah}
                />
              )
            ) : (
              <MushafPageView
                page={item}
                width={width}
                theme={state.prefs.theme}
                fontSize={fontSize}
                // The default size (and smaller) shows the whole page like a printed mushaf; larger sizes scroll.
                fit={state.prefs.fontStep <= DEFAULT_FONT_STEP}
                selected={selected?.id ?? null}
                playingId={playingId}
                tajweed={state.prefs.tajweed}
                riwaya={riwaya}
                onTap={toggleChrome}
                onAyahLongPress={openAyah}
              />
            )
          }
        />
      )}

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
            disabled={riwayaKey !== "hafs" && !riwaya}
            onPress={() => setJumpOpen(true)}
            hitSlop={6}
            className="flex-1 flex-row items-center gap-1.5"
          >
            <View className="shrink">
              <Text className="font-sans-bold text-base" style={{ color: theme.ink }} numberOfLines={1}>
                {first ? `سورة ${getSurah(first.surah)?.name ?? ""} · الجزء ${toArabicDigits(first.juz)}` : ""}
              </Text>
              <Text className="font-sans text-xs" style={{ color: theme.accent }}>
                {riwayaKey === "hafs" ? "" : `${RIWAYAT.find((entry) => entry.key === riwayaKey)?.short} · `}صفحة {toArabicDigits(page)} من{" "}
                {toArabicDigits(TOTAL_PAGES)}
              </Text>
            </View>
            {(riwayaKey === "hafs" || riwaya) && <ChevronDown size={18} color={theme.accent} />}
          </Pressable>
          {riwayaKey === "hafs" && (
            <ReaderIconButton
              icon={pageBookmarked ? BookmarkCheck : Bookmark}
              label={pageBookmarked ? "إزالة العلامة" : "حفظ علامة على هذه الصفحة"}
              ink={theme.ink}
              color={pageBookmarked ? theme.accent : theme.ink}
              onPress={() => first && reader.toggleBookmark({ surah: first.surah, ayah: first.ayah, page })}
            />
          )}
          <ReaderIconButton icon={ALargeSmall} label="إعدادات القراءة" ink={theme.ink} onPress={() => setSettingsOpen(true)} />
        </Animated.View>
      )}

      {/* The khatm: on the last page, with the reader chrome, so the fixed 15-line page is left untouched. */}
      {chrome && page === TOTAL_PAGES && (
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

      <JumpSheet visible={jumpOpen} page={page} source={source} onJump={jumpTo} onClose={() => setJumpOpen(false)} />

      <AyahSheet ayah={selected} riwaya={riwayaKey === "hafs" ? null : riwayaLabel} onClose={() => setSelected(null)} />

      <BottomSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} title="إعدادات القراءة" icon={ALargeSmall}>
        <View className="gap-6">
          <View className="gap-3">
            <SettingLabel>الرواية</SettingLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {RIWAYAT.map((entry) => {
                const active = entry.key === riwayaKey;
                const local = entry.key === "hafs" || isRiwayaDownloaded(entry.key);
                return (
                  <Pressable
                    key={entry.key}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => reader.setRiwaya(entry.key)}
                    className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
                    style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                  >
                    <Text className={`font-sans-semibold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{entry.short}</Text>
                    {!local && <Download size={13} color={active ? onPrimary : primaryColor} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

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

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <SettingLabel>تلوين أحكام التجويد</SettingLabel>
              <Switch
                value={state.prefs.tajweed}
                onValueChange={reader.setTajweed}
                trackColor={{ false: borderColor, true: primaryColor }}
                thumbColor="#ffffff"
              />
            </View>
            {state.prefs.tajweed && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {/* One chip per colour: several rules share a colour (the idgham greens, for instance). */}
                {Object.values(TAJWEED_RULES)
                  .filter((rule, index, all) => all.findIndex((other) => other.color === rule.color) === index)
                  .map((rule) => (
                    <View key={rule.color} className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                      <View className="size-2.5 rounded-full" style={{ backgroundColor: rule.color }} />
                      <Text className="font-sans text-xs text-fg">{rule.label}</Text>
                    </View>
                  ))}
              </ScrollView>
            )}
          </View>

          {riwayaKey === "hafs" && (
            <View className="gap-3">
              <SettingLabel>شكل الصفحة</SettingLabel>
              <View accessibilityRole="radiogroup" className="flex-row gap-2">
                {(
                  [
                    ["printed", "كالمصحف المطبوع"],
                    ["flow", "نص متدفق"],
                  ] as const
                ).map(([key, label]) => {
                  const active = state.prefs.layout === key;
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => reader.setLayout(key)}
                      className={`flex-1 items-center rounded-full border px-3.5 py-2.5 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
                    >
                      <Text className={`font-sans-semibold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {state.prefs.layout === "printed" && (
                <Text className="font-sans text-xs leading-5 text-fg-muted">
                  {state.prefs.tajweed
                    ? "مع التلوين تُعرض الصفحات بخط حفص المعتاد. أوقف التلوين لترى خط مصحف المدينة المطبوع."
                    : "بخط مصحف المدينة من مجمع الملك فهد: يُنزَّل خط كل صفحة أول مرة ثم يعمل دون إنترنت."}
                </Text>
              )}
            </View>
          )}

          <View className="gap-3">
            <SettingLabel>حجم الخط</SettingLabel>
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
