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
  tajweed: boolean;
  onTap: () => void;
  onAyahLongPress: (ayah: MushafAyah) => void;
}

/**
 * A Hafs page on its 15 printed lines, in the King Fahd Complex's own print: each page's QCF font,
 * fetched once and kept (V1, or the coloured V4 with tajweed). Until that page's font has loaded
 * (offline on a first visit), the bundled Hafs font draws the same lines.
 */
export const MushafPrintedPage = memo(function MushafPrintedPage(props: MushafPrintedPageProps) {
  const glyph = useGlyphPage(props.page, props.tajweed ? "tajweed" : "v1", props.theme, true);
  if (glyph?.status === "ready") {
    const { tajweed: _tajweed, ...rest } = props;
    // Keyed by font: the plain and the tajweed print measure differently.
    return <MushafGlyphPage key={glyph.page.family} {...rest} glyph={glyph.page} />;
  }
  return <MushafFixedPage {...props} />;
});
