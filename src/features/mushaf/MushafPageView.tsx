import { memo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";

import { getBasmala, getPage, getSurah, hasSeparateBasmala, hizbLabel, type MushafAyah } from "./mushaf";
import { READER_THEMES, type ReaderTheme } from "./readerPrefs";

interface MushafPageViewProps {
  page: number;
  width: number;
  theme: ReaderTheme;
  fontSize: number;
  selected: number | null;
  /** Global ids of the ayahs the player is reciting right now, for a soft highlight. */
  playingId: number | null;
  onTap: () => void;
  onAyahLongPress: (ayah: MushafAyah) => void;
}

/** A surah's frame and basmala, drawn where its first ayah starts on the page. */
function SurahBanner({ surah, theme, fontSize }: { surah: number; theme: ReaderTheme; fontSize: number }) {
  const colors = READER_THEMES[theme];
  const info = getSurah(surah);
  return (
    <View className="mb-2 mt-1">
      <View
        className="items-center justify-center rounded-2xl border py-2"
        style={{ backgroundColor: colors.frame, borderColor: colors.accent }}
      >
        <Text className="font-display-bold text-lg" style={{ color: colors.accent }}>
          سورة {info?.name}
        </Text>
        <Text className="font-sans text-[11px]" style={{ color: colors.ink, opacity: 0.6 }}>
          {info?.meccan ? "مكية" : "مدنية"} · آياتها {toArabicDigits(info?.ayahCount ?? 0)}
        </Text>
      </View>
      {hasSeparateBasmala(surah) && (
        <Text className="mt-2 text-center font-quran" style={{ color: colors.ink, fontSize: fontSize + 2, lineHeight: (fontSize + 2) * 2 }}>
          {getBasmala()}
        </Text>
      )}
    </View>
  );
}

/** One mushaf page. Long-press an ayah for tafsir, audio, sharing and bookmarks; tap anywhere for the controls. */
export const MushafPageView = memo(function MushafPageView({
  page,
  width,
  theme,
  fontSize,
  selected,
  playingId,
  onTap,
  onAyahLongPress,
}: MushafPageViewProps) {
  const colors = READER_THEMES[theme];
  const ayahs = getPage(page);
  const first = ayahs[0];

  // Split the page into runs of one surah, so each new surah gets its banner.
  const runs: MushafAyah[][] = [];
  for (const ayah of ayahs) {
    const run = runs[runs.length - 1];
    if (run && run[0]!.surah === ayah.surah) run.push(ayah);
    else runs.push([ayah]);
  }

  return (
    <View style={{ width }} className="flex-1 px-3 py-2">
      <Pressable
        onPress={onTap}
        className="flex-1 overflow-hidden rounded-[28px] border"
        style={{ backgroundColor: colors.page, borderColor: colors.frame }}
      >
        <View className="flex-row items-center justify-between border-b px-4 py-2" style={{ borderColor: colors.frame }}>
          <Text className="font-sans-bold text-xs" style={{ color: colors.accent }}>
            {first ? `سورة ${getSurah(first.surah)?.name ?? ""}` : ""}
          </Text>
          <Text className="font-sans-bold text-xs" style={{ color: colors.accent }}>
            {first ? `الجزء ${toArabicDigits(first.juz)} · ${hizbLabel(first.hizbQuarter, toArabicDigits)}` : ""}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1, justifyContent: "center" }}
          showsVerticalScrollIndicator={false}
        >
          {runs.map((run) => (
            <View key={`${run[0]!.surah}-${run[0]!.ayah}`}>
              {run[0]!.ayah === 1 && <SurahBanner surah={run[0]!.surah} theme={theme} fontSize={fontSize} />}
              <Text
                className="text-justify font-quran"
                style={{ color: colors.ink, fontSize, lineHeight: fontSize * 2.05, writingDirection: "rtl" }}
                onPress={onTap}
              >
                {run.map((ayah) => {
                  const highlighted = ayah.id === selected || ayah.id === playingId;
                  return (
                    <Text
                      key={ayah.id}
                      onLongPress={() => onAyahLongPress(ayah)}
                      suppressHighlighting
                      style={
                        highlighted ? { backgroundColor: theme === "night" ? "rgba(217,179,90,0.22)" : "rgba(205,162,62,0.22)" } : undefined
                      }
                    >
                      {ayah.text}
                      <Text style={{ color: colors.accent }}> ﴿{toArabicDigits(ayah.ayah)}﴾ </Text>
                    </Text>
                  );
                })}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View className="items-center border-t py-1.5" style={{ borderColor: colors.frame }}>
          <Text className="font-sans-bold text-xs" style={{ color: colors.accent }}>
            {toArabicDigits(page)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
});
