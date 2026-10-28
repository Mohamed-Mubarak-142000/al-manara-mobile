import { memo } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";

import { toArabicDigits } from "@/core/text/arabic";

import { getSurah } from "./mushaf";
import { READER_THEMES, type ReaderTheme } from "./readerPrefs";
import { SURAH_WORD_GLYPH, bannerGeometry, starPoints, surahNameGlyph } from "./surahBanner";
import { SURAH_NAME_FAMILY, useSurahNameFont } from "./surahNameFont";

/**
 * A surah's header as the printed Madinah mushaf draws it: a framed band with double gold rules,
 * lozenge ornament, a rosette at each end (مكية/مدنية, and the ayah count) and the name in a pointed
 * cartouche — in quran.com's calligraphic surah-name font when it has loaded, else the Hafs face.
 * Sized to one printed line (width × height) and coloured from the reader theme, so it sits on every
 * page layout the same way.
 */
export const SurahFrame = memo(function SurahFrame({
  surah,
  width,
  height,
  theme,
}: {
  surah: number;
  width: number;
  height: number;
  theme: ReaderTheme;
}) {
  const colors = READER_THEMES[theme];
  const fontReady = useSurahNameFont();
  const info = getSurah(surah);
  const g = bannerGeometry(width, height);
  const { band, rosette, cartouche } = g;
  const cy = height / 2;
  const tip = cartouche.tip;
  const lozenge = (cx: number, size: number) => `M ${cx - size} ${cy} L ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} Z`;
  const cartouchePath = (inset: number) =>
    `M ${cartouche.left + inset} ${cy} L ${cartouche.left + tip} ${cartouche.top + inset} L ${cartouche.right - tip} ${cartouche.top + inset} ` +
    `L ${cartouche.right - inset} ${cy} L ${cartouche.right - tip} ${cartouche.bottom - inset} L ${cartouche.left + tip} ${cartouche.bottom - inset} Z`;
  const rule = Math.max(1, height * 0.03);
  const nameSize = Math.min(height * 0.8, (cartouche.right - cartouche.left - tip * 1.4) / 2.9);
  const badgeSize = rosette.radius * 0.5;

  const medallion = (cx: number) => (
    <>
      <Circle cx={cx} cy={cy} r={rosette.radius} fill={colors.page} stroke={colors.accent} strokeWidth={rule} />
      <Polygon
        points={starPoints(cx, cy, rosette.radius * 0.94, rosette.radius * 0.74)}
        fill={colors.frame}
        stroke={colors.accent}
        strokeWidth={rule * 0.7}
      />
      <Circle cx={cx} cy={cy} r={rosette.radius * 0.6} fill={colors.page} stroke={colors.accent} strokeWidth={rule * 0.6} />
    </>
  );

  return (
    <View
      accessible
      accessibilityLabel={`سورة ${info?.name ?? ""}، ${info?.meccan ? "مكية" : "مدنية"}، ${info?.ayahCount ?? ""} آية`}
      style={{ width, height }}
    >
      <Svg width={width} height={height} style={{ position: "absolute" }}>
        {/* The band, with its double rule. */}
        <Rect
          x={band.x}
          y={band.y}
          width={band.width}
          height={band.height}
          rx={band.radius}
          fill={colors.frame}
          stroke={colors.accent}
          strokeWidth={rule}
        />
        <Rect
          x={band.x + rule * 2.2}
          y={band.y + rule * 2.2}
          width={band.width - rule * 4.4}
          height={band.height - rule * 4.4}
          rx={Math.max(0, band.radius - rule * 2)}
          fill="none"
          stroke={colors.accent}
          strokeOpacity={0.6}
          strokeWidth={rule * 0.6}
        />
        {/* The ornament: lozenges and dots along the band. */}
        {g.ornaments.map((cx) => (
          <Path key={cx} d={lozenge(cx, g.ornamentSize)} fill={colors.accent} fillOpacity={0.55} />
        ))}
        {g.ornaments.map((cx) => (
          <Circle key={`d${cx}`} cx={cx} cy={cy - height * 0.24} r={g.ornamentSize * 0.28} fill={colors.accent} fillOpacity={0.4} />
        ))}
        {g.ornaments.map((cx) => (
          <Circle key={`u${cx}`} cx={cx} cy={cy + height * 0.24} r={g.ornamentSize * 0.28} fill={colors.accent} fillOpacity={0.4} />
        ))}
        {/* The cartouche for the name, double-ruled too. */}
        <Path d={cartouchePath(0)} fill={colors.page} stroke={colors.accent} strokeWidth={rule} strokeLinejoin="round" />
        <Path
          d={cartouchePath(rule * 2)}
          fill="none"
          stroke={colors.accent}
          strokeOpacity={0.55}
          strokeWidth={rule * 0.6}
          strokeLinejoin="round"
        />
        {medallion(rosette.start)}
        {medallion(rosette.end)}
      </Svg>

      {/* Start (right): where it was revealed; end (left): the number of its ayahs. Laid out left-to-right,
          so the offsets are the drawing's own x (an RTL layout would swap left and right). */}
      <View pointerEvents="none" style={{ position: "absolute", width, height, direction: "ltr" }}>
        <Badge
          cx={rosette.start}
          cy={cy}
          radius={rosette.radius}
          size={badgeSize}
          color={colors.accent}
          text={info?.meccan ? "مكية" : "مدنية"}
        />
        <Badge
          cx={rosette.end}
          cy={cy}
          radius={rosette.radius}
          size={badgeSize * 1.15}
          color={colors.accent}
          text={toArabicDigits(info?.ayahCount ?? 0)}
        />
      </View>

      <View
        pointerEvents="none"
        className="absolute flex-row items-center justify-center"
        style={{ left: cartouche.left, width: cartouche.right - cartouche.left, top: 0, height, gap: nameSize * 0.25 }}
      >
        {fontReady ? (
          <>
            {/* Two glyphs in a row (RTL: «سورة» on the right): the font's codes are left-to-right characters. */}
            <Text style={{ fontFamily: SURAH_NAME_FAMILY, fontSize: nameSize, color: colors.accent, includeFontPadding: false }}>
              {SURAH_WORD_GLYPH}
            </Text>
            <Text style={{ fontFamily: SURAH_NAME_FAMILY, fontSize: nameSize, color: colors.ink, includeFontPadding: false }}>
              {surahNameGlyph(surah)}
            </Text>
          </>
        ) : (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="font-quran"
            style={{ fontSize: height * 0.44, color: colors.ink, includeFontPadding: false }}
          >
            سورة {info?.name}
          </Text>
        )}
      </View>
    </View>
  );
});

/** A rosette's word, centred in it. */
function Badge({
  cx,
  cy,
  radius,
  size,
  color,
  text,
}: {
  cx: number;
  cy: number;
  radius: number;
  size: number;
  color: string;
  text: string;
}) {
  return (
    <View
      pointerEvents="none"
      className="absolute items-center justify-center"
      style={{ left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2 }}
    >
      <Text numberOfLines={1} adjustsFontSizeToFit className="font-sans-bold" style={{ fontSize: size, color, includeFontPadding: false }}>
        {text}
      </Text>
    </View>
  );
}
