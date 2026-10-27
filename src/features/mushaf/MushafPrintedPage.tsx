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
 * A Hafs page on its 15 printed lines. Without tajweed it is the King Fahd Complex's own print (each
 * page's QCF font, fetched once and kept); with tajweed, or until that page's font has loaded (offline
 * on a first visit), the bundled Hafs font draws the same lines with the colours.
 */
export const MushafPrintedPage = memo(function MushafPrintedPage(props: MushafPrintedPageProps) {
  const glyph = useGlyphPage(props.page, !props.tajweed);
  if (glyph?.status === "ready") {
    const { tajweed: _tajweed, ...rest } = props;
    return <MushafGlyphPage {...rest} glyph={glyph.page} />;
  }
  return <MushafFixedPage {...props} />;
});
