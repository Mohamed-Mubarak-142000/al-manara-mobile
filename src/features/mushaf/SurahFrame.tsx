import { memo } from "react";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { getSurah } from "./mushaf";

/** The website's emerald and gold (globals.css), the same on every reader theme as there. */
const EMERALD = "#005544";
const GOLD = "#cda23e";
/** In units of the glyph size, as the website draws it: a line is 1.8 high, the banner 1.45 high and at most 16 wide. */
const LINE_EM = 1.8;
const BANNER_EM = 1.45;
const MAX_WIDTH_EM = 16;
const NAME_EM = 0.78;

/**
 * A surah's title on its own printed line, as the website's reader draws it (MushafGlyphPage's
 * SurahTitle): a pointed emerald band with a gold rule and an inner one, and «سورة …» in white. Sized to
 * one line (width × height), so it sits on every page layout the same way.
 */
export const SurahFrame = memo(function SurahFrame({ surah, width, height }: { surah: number; width: number; height: number }) {
  const info = getSurah(surah);
  const em = height / LINE_EM;
  const bannerHeight = em * BANNER_EM;
  const bannerWidth = Math.min(width, em * MAX_WIDTH_EM);

  return (
    <View accessible accessibilityLabel={`سورة ${info?.name ?? ""}`} className="items-center justify-center" style={{ width, height }}>
      <View className="items-center justify-center" style={{ width: bannerWidth, height: bannerHeight }}>
        {/* The website's viewBox, stretched to the banner as its preserveAspectRatio="none" does. */}
        <Svg width={bannerWidth} height={bannerHeight} viewBox="0 0 400 64" preserveAspectRatio="none" style={{ position: "absolute" }}>
          <Path d="M24 4h352l20 28-20 28H24L4 32z" fill={EMERALD} stroke={GOLD} strokeWidth={3} />
          <Path d="M34 11h332l14 21-14 21H34L20 32z" fill="none" stroke={GOLD} strokeOpacity={0.6} strokeWidth={1.5} />
        </Svg>
        <Text
          className="font-quran"
          style={{ fontSize: em * NAME_EM, lineHeight: bannerHeight, color: "#ffffff", includeFontPadding: false }}
        >
          سورة {info?.name}
        </Text>
      </View>
    </View>
  );
});
