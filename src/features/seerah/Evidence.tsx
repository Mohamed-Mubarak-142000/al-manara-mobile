import { ChevronDown, ChevronUp, ExternalLink, ScrollText } from "lucide-react-native";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { HADITHS, VERSES, type HadithKey, type VerseKey } from "@/core/seerah/seerahContent";
import { toArabicDigits } from "@/core/text/arabic";
import type { Track } from "@/features/audio/playerStore";
import { ayahSource } from "@/features/downloads/ayahPacks";
import { ListenButton } from "@/features/umrah/Blocks";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

/** The website's VerseCard, heard in Alafasy's recitation like the umrah guide's verses. */
export function VerseCard({ verseKey }: { verseKey: VerseKey }) {
  const verse = VERSES[verseKey];
  const quranText = useScaledText(22, 46);
  const label = `سورة ${verse.surahName}، الآية ${toArabicDigits(verse.ayah)}`;
  const track: Track = {
    id: `seerah-verse-${verse.audio}`,
    title: label,
    artist: "مشاري العفاسي",
    // A saved Alafasy pack plays from the device, the stream as backup.
    ...ayahSource("alafasy", verse.surah, verse.ayah),
  };
  return (
    <View className="rounded-3xl bg-hero p-5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 font-sans text-sm text-white/75">{label}</Text>
        <ListenButton track={track} label={label} tone="dark" />
      </View>
      <Text className="mt-3 font-quran text-hero-fg" style={quranText}>
        {/* The ellipsis in the UI face, as its own word: it is not a Quranic character. */}
        {verse.partial && <Text className="font-sans">… </Text>}﴿{verse.text}﴾
      </Text>
    </View>
  );
}

/** The website's HadithCard: folded to its grade, opened to the text, its attribution and HadeethEnc's explanation. */
export function HadithCard({ hadithKey }: { hadithKey: HadithKey }) {
  const [open, setOpen] = useState(false);
  const accent = useThemeColor("accent-strong");
  const muted = useThemeColor("fg-muted");
  const body = useScaledText(15, 30);
  const hadith = HADITHS[hadithKey];
  return (
    <View className="rounded-3xl border border-border bg-surface-alt p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className="flex-row items-center gap-2"
      >
        <ScrollText size={20} color={accent} />
        <Text className="flex-1 font-sans-bold text-base text-fg">الدليل من السنة</Text>
        <View className="rounded-full bg-primary-soft px-2.5 py-0.5">
          <Text className="font-sans-bold text-xs text-primary">{hadith.grade}</Text>
        </View>
        {open ? <ChevronUp size={18} color={muted} /> : <ChevronDown size={18} color={muted} />}
      </Pressable>
      {open && (
        <View className="mt-3">
          <Text className="font-sans text-fg" style={body}>
            {hadith.text}
          </Text>
          <View className="mt-2 flex-row flex-wrap items-center gap-2">
            <Text className="font-sans text-xs text-fg-muted">{hadith.attribution}</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityHint="يفتح شرح الحديث على موسوعة الأحاديث النبوية"
              onPress={() => Linking.openURL(hadith.url).catch(() => {})}
              hitSlop={8}
              className="ms-auto flex-row items-center gap-1"
            >
              <Text className="font-sans text-xs text-fg-muted underline">الشرح</Text>
              <ExternalLink size={12} color={muted} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
