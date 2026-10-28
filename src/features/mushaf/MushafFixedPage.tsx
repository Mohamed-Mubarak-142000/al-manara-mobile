import { memo, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { TAJWEED_RULES } from "@/core/quran/tajweedApi";
import { toArabicDigits } from "@/core/text/arabic";

import { getPage, getSurah, hizbLabel, type MushafAyah } from "./mushaf";
import { LINES_PER_PAGE, TARGET_LINE_EM, getPageLines, type LineWord, type MushafLine } from "./mushafLines";
import { READER_THEMES, type ReaderTheme } from "./readerPrefs";
import { SurahFrame } from "./SurahFrame";

interface MushafFixedPageProps {
  page: number;
  width: number;
  /** The height the pager gives every page; the 15 lines share it, so the page never scrolls. */
  height: number;
  theme: ReaderTheme;
  selected: number | null;
  /** Global id of the ayah the player is reciting, for a soft highlight. */
  playingId: number | null;
  tajweed: boolean;
  onTap: () => void;
  onAyahLongPress: (ayah: MushafAyah) => void;
}

const HEADER = 26;
const FOOTER = 24;
const PAD_X = 10;
const PAD_Y = 6;
/** The font's ascent plus descent is about 1.76 em: a line slot never gets less than this. */
const MIN_SLOT_EM = 1.8;
const BASMALA = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ";

/** Every text size on the page, from the frame the pager gives it. */
function pageMetrics(width: number, height: number) {
  const textHeight = Math.max(0, height - HEADER - FOOTER - PAD_Y * 2);
  const slot = textHeight / LINES_PER_PAGE;
  const available = width - PAD_X * 2;
  // The width sets the size on phones; a wide, short screen (a tablet on its side) is held by the height.
  const fontSize = Math.min(available / TARGET_LINE_EM, slot / MIN_SLOT_EM);
  return { slot, fontSize, lineWidth: Math.min(available, fontSize * TARGET_LINE_EM) };
}

const Word = memo(function Word({
  word,
  fontSize,
  slot,
  color,
  jalala,
  accent,
  tajweed,
  highlight,
  onLongPress,
}: {
  word: LineWord;
  fontSize: number;
  slot: number;
  color: string;
  jalala: string;
  accent: string;
  tajweed: boolean;
  highlight: string | undefined;
  onLongPress: (ayahId: number) => void;
}) {
  const segments = tajweed && word.tajweed;
  return (
    <Text
      className="font-quran"
      suppressHighlighting
      onLongPress={() => onLongPress(word.ayahId)}
      style={{
        fontSize,
        lineHeight: slot,
        color: word.end ? accent : word.jalala ? jalala : color,
        backgroundColor: highlight,
        includeFontPadding: false,
        textAlignVertical: "center",
      }}
    >
      {segments
        ? segments.map((segment, index) => (
            <Text key={index} style={segment.ruleClass ? { color: TAJWEED_RULES[segment.ruleClass]?.color } : undefined}>
              {segment.text}
            </Text>
          ))
        : word.text}
    </Text>
  );
});

/**
 * One Madinah page as printed: 15 fixed lines, each justified to the page width, Allah's name in red. It is
 * sized from the screen, so it never scrolls and never moves until the reader turns the page.
 * Long-press a word for its ayah's tafsir, audio, sharing and bookmarks; tap for the controls.
 */
export const MushafFixedPage = memo(function MushafFixedPage({
  page,
  width,
  height,
  theme,
  selected,
  playingId,
  tajweed,
  onTap,
  onAyahLongPress,
}: MushafFixedPageProps) {
  const colors = READER_THEMES[theme];
  const lines = useMemo(() => getPageLines(page), [page]);
  const { slot, fontSize, lineWidth } = pageMetrics(width, height);
  const first = getPage(page)[0];
  const dark = theme === "night" || theme === "dusk";
  const highlightColor = dark ? "rgba(217,179,90,0.22)" : "rgba(205,162,62,0.24)";
  // Al-Fatiha and the opening of al-Baqara are set apart in print: fewer lines, centred on the page.
  const opening = page <= 2;

  const openAyah = (ayahId: number) => {
    const ayah = getPage(page).find((entry) => entry.id === ayahId);
    if (ayah) onAyahLongPress(ayah);
  };

  const renderLine = (line: MushafLine, index: number) => {
    if (line.kind === "empty") return opening ? null : <View key={index} style={{ height: slot }} />;
    if (line.kind === "surah") return <SurahFrame key={index} surah={line.surah} width={lineWidth} height={slot} theme={theme} />;
    if (line.kind === "basmala") {
      return (
        <Text
          key={index}
          className="text-center font-quran"
          style={{ height: slot, lineHeight: slot, fontSize, color: colors.ink, includeFontPadding: false }}
        >
          {BASMALA}
        </Text>
      );
    }
    // Lines a little wider than the target are drawn smaller; narrower ones grow a touch and are spread.
    const lineSize = Math.min(fontSize * (opening ? 1.15 : 1.06), lineWidth / line.width);
    return (
      <View
        key={index}
        className="flex-row items-center"
        style={{ height: slot, justifyContent: opening ? "center" : "space-between", gap: opening ? lineSize * 0.3 : 0 }}
      >
        {line.words.map((word, wordIndex) => (
          <Word
            key={wordIndex}
            word={word}
            fontSize={lineSize}
            slot={slot}
            color={colors.ink}
            jalala={colors.jalala}
            accent={colors.accent}
            tajweed={tajweed}
            highlight={word.ayahId === selected || word.ayahId === playingId ? highlightColor : undefined}
            onLongPress={openAyah}
          />
        ))}
      </View>
    );
  };

  return (
    <Pressable onPress={onTap} style={{ width, height, backgroundColor: colors.page }}>
      <View className="flex-row items-center justify-between px-4" style={{ height: HEADER }}>
        <Text className="font-sans-bold text-xs" style={{ color: colors.accent }}>
          {first ? `سورة ${getSurah(first.surah)?.name ?? ""}` : ""}
        </Text>
        <Text className="font-sans-bold text-xs" style={{ color: colors.accent }}>
          {first ? `الجزء ${toArabicDigits(first.juz)} · ${hizbLabel(first.hizbQuarter, toArabicDigits)}` : ""}
        </Text>
      </View>
      <View
        className={`flex-1 items-center ${opening ? "justify-center" : ""}`}
        style={{ paddingHorizontal: PAD_X, paddingVertical: PAD_Y }}
      >
        <View style={{ width: lineWidth }}>{lines.map(renderLine)}</View>
      </View>
      <View className="items-center justify-center" style={{ height: FOOTER }}>
        <Text className="font-sans-bold text-xs" style={{ color: colors.accent }}>
          {toArabicDigits(page)}
        </Text>
      </View>
    </Pressable>
  );
});
