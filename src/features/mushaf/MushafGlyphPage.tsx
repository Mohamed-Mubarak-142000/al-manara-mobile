import { memo, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { GlyphLine, GlyphWord } from "@/core/quran/glyphLines";
import { toArabicDigits } from "@/core/text/arabic";

import type { GlyphPage } from "./glyphStore";
import { getAllAyahs, getPage, getSurah, hizbLabel, type MushafAyah } from "./mushaf";
import { READER_THEMES, type ReaderTheme } from "./readerPrefs";
import { SurahFrame } from "./SurahFrame";

interface MushafGlyphPageProps {
  page: number;
  glyph: GlyphPage;
  width: number;
  /** The height the pager gives every page; the lines share it, so the page never scrolls. */
  height: number;
  theme: ReaderTheme;
  selected: number | null;
  /** Global id of the ayah the player is reciting, for a soft highlight. */
  playingId: number | null;
  onTap: () => void;
  onAyahLongPress: (ayah: MushafAyah) => void;
}

/** The same frame as the text page (MushafFixedPage), so switching between them doesn't move anything. */
const HEADER = 26;
const FOOTER = 24;
const PAD_X = 10;
const PAD_Y = 6;
/** The text page's 15 slots, which every page but the two opening ones shares. */
const SLOTS = 15;
/** A printed line's height, in units of the glyph size (the website's LINE_HEIGHT). */
const LINE_HEIGHT = 1.8;
/** Below this share of the page's widest line, a line is set centred (a surah's last line, pages 1–2). */
const CENTRE_BELOW = 0.8;
/** Lines are measured once at this size; glyph widths grow linearly with it. */
const MEASURE_SIZE = 40;
const BASMALA = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ";

/** Each page font's line widths at MEASURE_SIZE, measured once per session. */
const measured = new Map<string, number[]>();

/**
 * One page exactly as the Madinah mushaf prints it (the website's MushafGlyphPage): each word a glyph
 * of the page's own font, on its own line. The glyph size comes from the page's widest line so it fills
 * the width, or less when the height is shorter; lines narrower than the rest are centred, as in print.
 * Long-press a word for its ayah; tap for the controls — as on the text page.
 */
export const MushafGlyphPage = memo(function MushafGlyphPage({
  page,
  glyph,
  width,
  height,
  theme,
  selected,
  playingId,
  onTap,
  onAyahLongPress,
}: MushafGlyphPageProps) {
  const colors = READER_THEMES[theme];
  const { family, lines } = glyph;
  const [widths, setWidths] = useState<number[] | null>(() => measured.get(family) ?? null);
  const pending = useRef<number[]>([]);
  const first = getPage(page)[0];
  const dark = theme === "night" || theme === "dusk";
  const highlightColor = dark ? "rgba(217,179,90,0.22)" : "rgba(205,162,62,0.24)";
  const opening = page <= 2;
  // Screen readers get the page as text: the glyphs are private-use codes that mean nothing read aloud.
  const spoken = useMemo(
    () =>
      getPage(page)
        .map((ayah) => ayah.text)
        .join(" "),
    [page],
  );
  const wordLines = lines.filter((line): line is Extract<GlyphLine, { kind: "words" }> => line.kind === "words");

  const textHeight = Math.max(0, height - HEADER - FOOTER - PAD_Y * 2);
  const available = width - PAD_X * 2;
  const widest = widths ? Math.max(...widths, 1) : 1;
  const byWidth = (MEASURE_SIZE * available) / widest;
  // The opening pages' 8 lines fill the width as on the website, set at their printed spacing and centred.
  const size = Math.min(byWidth, textHeight / ((opening ? lines.length : SLOTS) * LINE_HEIGHT));
  const slot = opening ? size * LINE_HEIGHT : textHeight / SLOTS;
  // A page held back by the height keeps the print's proportions: as wide as its widest line.
  const lineWidth = Math.min(available, (widest * size) / MEASURE_SIZE);

  // By number, not from the page: the tajweed print sets a few ayahs on the page before or after.
  const openAyah = (ayahId: number) => {
    const ayah = getAllAyahs()[ayahId - 1];
    if (ayah?.id === ayahId) onAyahLongPress(ayah);
  };

  const word = (entry: GlyphWord, index: number, fontSize: number) => (
    <Text
      key={index}
      suppressHighlighting
      accessible={false}
      onLongPress={() => openAyah(entry.ayah)}
      style={{
        fontFamily: family,
        fontSize,
        lineHeight: slot,
        color: colors.ink,
        backgroundColor: entry.ayah === selected || entry.ayah === playingId ? highlightColor : undefined,
        includeFontPadding: false,
        textAlignVertical: "center",
      }}
    >
      {entry.code}
    </Text>
  );

  // First pass, hidden: each line's natural width at the measuring size.
  if (!widths) {
    return (
      <View style={{ width, height, backgroundColor: colors.page }}>
        <View pointerEvents="none" style={{ position: "absolute", width: 4000, opacity: 0 }}>
          {wordLines.map((line, index) => (
            <View
              key={index}
              style={{ flexDirection: "row", alignSelf: "flex-start" }}
              onLayout={(event) => {
                pending.current[index] = event.nativeEvent.layout.width;
                if (pending.current.filter((value) => value > 0).length === wordLines.length) {
                  const result = [...pending.current];
                  measured.set(family, result);
                  setWidths(result);
                }
              }}
            >
              {line.words.map((entry, position) => (
                <Text key={position} style={{ fontFamily: family, fontSize: MEASURE_SIZE, includeFontPadding: false }}>
                  {entry.code}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Each line's place among the lines of words, whose widths were measured.
  const measuredIndex = lines.map((_, index) => lines.slice(0, index).filter((line) => line.kind === "words").length);
  const renderLine = (line: GlyphLine, index: number) => {
    if (line.kind === "surah") return <SurahFrame key={index} surah={line.surah} width={lineWidth} height={slot} />;
    if (line.kind === "basmala") {
      return (
        <Text
          key={index}
          className="text-center font-quran"
          style={{ height: slot, lineHeight: slot, fontSize: size * 0.92, color: colors.ink, includeFontPadding: false }}
        >
          {BASMALA}
        </Text>
      );
    }
    const centred = opening || widths[measuredIndex[index]!]! / widest < CENTRE_BELOW;
    return (
      <View
        key={index}
        className="flex-row items-center"
        style={{ height: slot, justifyContent: centred ? "center" : "space-between", gap: centred ? size * 0.18 : 0 }}
      >
        {line.words.map((entry, position) => word(entry, position, size))}
      </View>
    );
  };

  return (
    <Pressable onPress={onTap} accessibilityLabel={spoken} style={{ width, height, backgroundColor: colors.page }}>
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
