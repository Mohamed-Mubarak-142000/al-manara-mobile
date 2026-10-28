import { memo } from "react";

import { useGlyphPage } from "./glyphStore";
import { MushafFixedPage } from "./MushafFixedPage";
import { MushafGlyphPage } from "./MushafGlyphPage";
import type { MushafAyah } from "./mushaf";
import type { ReaderTheme } from "./readerPrefs";

interface MushafPrintedPageProps {
  page: number;
  width: number;
  height: number;
  theme: ReaderTheme;
  selected: number | null;
  playingId: number | null;
  onTap: () => void;
  onAyahLongPress: (ayah: MushafAyah) => void;
}

/**
 * A Hafs page on its 15 printed lines, in the King Fahd Complex's coloured tajweed print: each page's
 * V4 font, fetched once and kept. Until that page's font has loaded (offline on a first visit), the
 * bundled Hafs font draws the same lines with the tajweed colours.
 */
export const MushafPrintedPage = memo(function MushafPrintedPage(props: MushafPrintedPageProps) {
  const glyph = useGlyphPage(props.page, "tajweed", props.theme, true);
  if (glyph?.status === "ready") {
    // Keyed by font: each theme's copy of the font is its own family.
    return <MushafGlyphPage key={glyph.page.family} {...props} glyph={glyph.page} />;
  }
  return <MushafFixedPage {...props} />;
});
