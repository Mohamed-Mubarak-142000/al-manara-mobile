import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, Minus, Plus, Repeat } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AYAH_VOICES, type AyahVoice } from "@/core/quran/ayahAudio";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { audio, type Track } from "@/features/audio/playerStore";
import { AyahPackButton } from "@/features/downloads/AyahPackButton";
import { ayahSource } from "@/features/downloads/ayahPacks";
import { getSurah, getSurahAyahs, type MushafAyah } from "@/features/mushaf/mushaf";
import { useThemeColor } from "@/theme/useThemeColor";

type Voice = AyahVoice;
const VOICES: Record<Voice, { label: string; note: string }> = {
  husary: { label: AYAH_VOICES.husary.label, note: "مرتّل" },
  muallim: { label: AYAH_VOICES.muallim.label, note: "يقرأ ثم يترك لك وقتًا للترديد" },
  alafasy: { label: AYAH_VOICES.alafasy.label, note: "مرتّل" },
};
const MAX_TRACKS = 2000;

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const primary = useThemeColor("primary");
  return (
    <View className="flex-1 items-center rounded-2xl border border-border bg-surface py-2">
      <Text className="font-sans text-xs text-fg-muted">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`زيادة ${label}`}
          onPress={() => onChange(Math.min(max, value + 1))}
          hitSlop={8}
          className="p-2"
        >
          <Plus size={18} color={primary} />
        </Pressable>
        <Text className="min-w-10 text-center font-display-bold text-xl text-fg">{toArabicDigits(value)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`إنقاص ${label}`}
          onPress={() => onChange(Math.max(min, value - 1))}
          hitSlop={8}
          className="p-2"
        >
          <Minus size={18} color={primary} />
        </Pressable>
      </View>
    </View>
  );
}

/** Builds the loop: each ayah N times, the whole range M times, as one queue for the background player. */
export function repeatQueue(ayahs: MushafAyah[], voice: Voice, eachTimes: number, rangeTimes: number): Track[] {
  const surahName = ayahs[0] ? (getSurah(ayahs[0].surah)?.name ?? "") : "";
  const tracks: Track[] = [];
  // Resolved once per ayah, not per repetition: a saved ayah plays from the device.
  const sources = new Map(ayahs.map((ayah) => [ayah.id, ayahSource(voice, ayah.surah, ayah.ayah)]));
  for (let round = 1; round <= rangeTimes; round += 1) {
    for (const ayah of ayahs) {
      for (let time = 1; time <= eachTimes; time += 1) {
        tracks.push({
          // Distinct ids so the queue can hold the same ayah many times.
          id: `repeat-${voice}-${ayah.id}-${round}-${time}`,
          title: `${surahName} · الآية ${toArabicDigits(ayah.ayah)}`,
          artist: `${VOICES[voice].label} · تكرار ${toArabicDigits(time)}/${toArabicDigits(eachTimes)} · الدورة ${toArabicDigits(round)}/${toArabicDigits(rangeTimes)}`,
          ...sources.get(ayah.id)!,
        });
      }
    }
  }
  return tracks.slice(0, MAX_TRACKS);
}

/** "كرر للحفظ": a passage from ayah to ayah, each ayah and the whole passage repeated as many times as chosen. */
export default function RepeatScreen() {
  const params = useLocalSearchParams<{ surah?: string; from?: string }>();
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const surahNumber = Number(params.surah) || 1;
  const surah = getSurah(surahNumber);
  const count = surah?.ayahCount ?? 1;
  const [from, setFrom] = useState(Math.min(count, Math.max(1, Number(params.from) || 1)));
  const [to, setTo] = useState(Math.min(count, (Number(params.from) || 1) + 2));
  const [eachTimes, setEachTimes] = useState(3);
  const [rangeTimes, setRangeTimes] = useState(2);
  const [voice, setVoice] = useState<Voice>("muallim");
  const total = (to - from + 1) * eachTimes * rangeTimes;

  function start() {
    const ayahs = getSurahAyahs(surahNumber).filter((ayah) => ayah.ayah >= from && ayah.ayah <= to);
    audio.playQueue(repeatQueue(ayahs, voice, eachTimes, rangeTimes), 0);
    router.back();
    router.push("/player");
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, paddingHorizontal: 16, gap: 16 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
        onPress={() => router.back()}
        hitSlop={12}
        className="self-start p-1"
      >
        <ChevronDown size={28} color={fg} />
      </Pressable>
      <View>
        <Text className="font-sans-bold text-sm text-accent-strong">كرّر للحفظ</Text>
        <Text className="mt-1 font-display-bold text-2xl text-fg">سورة {surah?.name}</Text>
        <Text className="mt-1 font-sans text-sm leading-6 text-fg-muted">
          استمع للمقطع مرات متتالية حتى يثبت، ويستمر التشغيل والشاشة مغلقة.
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Stepper label="من الآية" value={from} min={1} max={to} onChange={setFrom} />
        <Stepper label="إلى الآية" value={to} min={from} max={count} onChange={setTo} />
      </View>
      <View className="flex-row gap-3">
        <Stepper label="تكرار كل آية" value={eachTimes} min={1} max={20} onChange={setEachTimes} />
        <Stepper label="تكرار المقطع كله" value={rangeTimes} min={1} max={20} onChange={setRangeTimes} />
      </View>

      <Text className="font-sans-bold text-sm text-fg">القارئ</Text>
      <View className="gap-2">
        {(Object.keys(VOICES) as Voice[]).map((key) => {
          const active = key === voice;
          return (
            <Pressable
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setVoice(key)}
              className={`rounded-2xl border p-3 ${active ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
            >
              <Text className={`font-display-bold text-base ${active ? "text-primary" : "text-fg"}`}>{VOICES[key].label}</Text>
              <Text className="font-sans text-xs text-fg-muted">{VOICES[key].note}</Text>
            </Pressable>
          );
        })}
      </View>

      <AyahPackButton surah={surahNumber} voices={[voice]} />

      <Text className="text-center font-sans text-sm text-fg-muted">
        {toArabicDigits(Math.min(total, MAX_TRACKS))} مقطعًا صوتيًا
        {total > MAX_TRACKS ? ` (الحد الأقصى ${toArabicDigits(MAX_TRACKS)})` : ""}
      </Text>
      <Button size="lg" icon={Repeat} onPress={start}>
        ابدأ التكرار
      </Button>
    </ScrollView>
  );
}
