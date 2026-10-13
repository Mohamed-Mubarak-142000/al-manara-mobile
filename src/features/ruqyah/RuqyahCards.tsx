import { ChevronDown, ChevronUp, ExternalLink, Pause, Play } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";

import type { RuqyahHadith, RuqyahPassage } from "@/core/ruqyah/ruqyahData";
import { toArabicDigits } from "@/core/text/arabic";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

export type ListenState = "loading" | "playing" | "paused" | null;

function RepeatBadge({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-accent-soft px-2.5 py-0.5">
      <Text className="font-sans-bold text-xs text-accent-strong">{label}</Text>
    </View>
  );
}

/**
 * One passage of the Quranic ruqyah. Each ayah is its own span, so the one being recited can be
 * highlighted; spans break only between ayahs, never inside a word (Android cuts the Arabic joining at
 * a style change, see core/quran/joinSegments.ts).
 */
export function PassageCard({
  passage,
  state,
  activeAyah,
  onPlay,
}: {
  passage: RuqyahPassage;
  state: ListenState;
  activeAyah: number | null;
  onPlay: () => void;
}) {
  const primary = useThemeColor("primary");
  const onPrimary = useThemeColor("on-primary");
  const accent = useThemeColor("accent");
  const highlight = useThemeColor("accent-soft");
  const quranText = useScaledText(24, 50);
  const range =
    passage.from === passage.to
      ? `الآية ${toArabicDigits(passage.from)}`
      : `الآيات ${toArabicDigits(passage.from)}–${toArabicDigits(passage.to)}`;

  return (
    <View className={`mx-4 mb-3 rounded-3xl border bg-surface p-5 ${state ? "border-primary/40" : "border-border shadow-soft"}`}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="font-display-bold text-lg text-fg">{passage.title}</Text>
          <Text className="mt-0.5 font-sans text-sm text-fg-muted">
            {passage.surahName} — {range}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {passage.repeat && <RepeatBadge label="ثلاث مرات" />}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state === "playing" ? `إيقاف ${passage.title} مؤقتًا` : `استماع إلى ${passage.title}`}
            onPress={onPlay}
            className={`size-11 items-center justify-center rounded-full ${state ? "bg-primary" : "bg-primary-soft"}`}
          >
            {state === "loading" ? (
              <ActivityIndicator size="small" color={onPrimary} />
            ) : state === "playing" ? (
              <Pause size={18} color={onPrimary} fill={onPrimary} />
            ) : (
              <Play size={18} color={state ? onPrimary : primary} fill={state ? onPrimary : primary} />
            )}
          </Pressable>
        </View>
      </View>
      {passage.sunnah && (
        <View className="mt-3 self-start rounded-2xl bg-primary-soft px-3 py-1.5">
          <Text className="font-sans-bold text-xs leading-6 text-primary">{passage.sunnah}</Text>
        </View>
      )}
      <Text className="mt-4 font-quran text-fg" style={quranText}>
        {passage.ayahs.map((ayah) => (
          <Text key={ayah.numberInSurah} style={activeAyah === ayah.numberInSurah ? { backgroundColor: highlight } : undefined}>
            {ayah.text}
            <Text style={{ color: accent }}>{` ﴿${toArabicDigits(ayah.numberInSurah)}﴾ `}</Text>
          </Text>
        ))}
      </Text>
    </View>
  );
}

/** A prophetic ruqyah: the words to say, the full hadith on request, its grade and its source. */
export function HadithCard({ hadith }: { hadith: RuqyahHadith }) {
  const muted = useThemeColor("fg-muted");
  const [open, setOpen] = useState(false);
  const duaText = useScaledText(22, 44);

  return (
    <View className="mx-4 mb-3 rounded-3xl border border-border bg-surface p-5 shadow-soft">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 font-sans-bold text-sm text-accent-strong">{hadith.title}</Text>
        {hadith.repeat && <RepeatBadge label="سبع مرات" />}
      </View>
      {hadith.dua ? (
        // Amiri Quran: the Hafs face draws the Arabic comma these duas use as a dotted circle.
        <Text className="mt-3 font-quran-fallback text-fg" style={duaText}>
          {hadith.dua}
        </Text>
      ) : (
        <Text className="mt-3 font-sans text-base leading-8 text-fg">{hadith.hadith}</Text>
      )}
      {hadith.dua && (
        <View className="mt-3 rounded-2xl bg-bg p-3">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((value) => !value)}
            hitSlop={6}
            className="flex-row items-center justify-between"
          >
            <Text className="font-sans-bold text-sm text-fg-muted">نص الحديث</Text>
            {open ? <ChevronUp size={16} color={muted} /> : <ChevronDown size={16} color={muted} />}
          </Pressable>
          {open && <Text className="mt-2 font-sans text-sm leading-8 text-fg">{hadith.hadith}</Text>}
        </View>
      )}
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <View className="rounded-full bg-primary-soft px-2.5 py-0.5">
          <Text className="font-sans-bold text-xs text-primary">{hadith.grade}</Text>
        </View>
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
  );
}
