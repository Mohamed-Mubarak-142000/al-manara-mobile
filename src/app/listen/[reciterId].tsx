import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight, Pause, Play, Shuffle } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buildSurahAudioUrl, type Moshaf, type Reciter } from "@/core/quran/api";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { audio, currentTrack, usePlayer, type Track } from "@/features/audio/playerStore";
import { DownloadButton } from "@/features/downloads/DownloadButton";
import { useReciters } from "@/features/listen/useReciters";
import { useSurahIndex } from "@/features/quran/useSurahIndex";
import { useThemeColor } from "@/theme/useThemeColor";

function trackId(reciter: Reciter, moshaf: Moshaf, surah: number) {
  return `surah-${reciter.id}-${moshaf.id}-${surah}`;
}

export default function ReciterScreen() {
  const { reciterId } = useLocalSearchParams<{ reciterId: string }>();
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const primary = useThemeColor("primary");
  const { reciters, riwayat, failed, reload } = useReciters();
  const { surahs } = useSurahIndex();
  const player = usePlayer();
  const playing = currentTrack(player);
  const reciter = reciters?.find((entry) => String(entry.id) === reciterId);
  const [moshafId, setMoshafId] = useState<number | null>(null);
  const moshaf = reciter?.moshaf.find((entry) => entry.id === moshafId) ?? reciter?.moshaf[0];

  const tracks: Track[] = useMemo(() => {
    if (!reciter || !moshaf) return [];
    const names = new Map(surahs?.map((surah) => [surah.number, surah.name]));
    return [...moshaf.surahList]
      .sort((a, b) => a - b)
      .map((surah) => ({
        id: trackId(reciter, moshaf, surah),
        title: `سورة ${names.get(surah) ?? toArabicDigits(surah)}`,
        artist: reciter.name,
        url: buildSurahAudioUrl(moshaf, surah),
      }));
  }, [reciter, moshaf, surahs]);

  if (!reciter) {
    return (
      <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
        {failed ? <StateMessage message="تعذّر تحميل بيانات القارئ." onRetry={reload} /> : <StateMessage loading />}
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={tracks}
      keyExtractor={(track) => track.id}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      initialNumToRender={16}
      ListHeaderComponent={
        <View className="mb-4">
          <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={() => router.back()}
              hitSlop={12}
              className="mb-3 self-start p-1"
            >
              <ChevronRight size={26} color={heroFg} />
            </Pressable>
            <View className="size-16 items-center justify-center rounded-full border border-gold/40 bg-white/10">
              <Text className="font-display-bold text-2xl text-gold-soft">{reciter.letter}</Text>
            </View>
            <Text className="mt-3 font-display-bold text-2xl text-hero-fg">{reciter.name}</Text>
            <Text className="mt-1 font-sans text-sm text-white/70">
              {moshaf ? `${riwayat.get(moshaf.rewayaId) ?? moshaf.name} · ${toArabicDigits(tracks.length)} سورة` : ""}
            </Text>
            <View className="mt-5 flex-row gap-3">
              <Button variant="gold" icon={Play} onPress={() => audio.playQueue(tracks, 0)}>
                تشغيل الكل
              </Button>
              <Button
                variant="light"
                icon={Shuffle}
                onPress={() =>
                  audio.playQueue(
                    [...tracks].sort(() => Math.random() - 0.5),
                    0,
                  )
                }
              >
                عشوائي
              </Button>
            </View>
          </View>

          {reciter.moshaf.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 16 }}
            >
              {reciter.moshaf.map((entry) => {
                const active = entry.id === moshaf?.id;
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    onPress={() => setMoshafId(entry.id)}
                    className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
                  >
                    <Text className={`font-sans-bold text-xs ${active ? "text-on-primary" : "text-fg"}`}>
                      {riwayat.get(entry.rewayaId) ?? entry.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      }
      renderItem={({ item, index }) => {
        const isCurrent = playing?.id === item.id;
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => (isCurrent ? audio.toggle() : audio.playQueue(tracks, index))}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View
              className={`mx-4 mb-2 flex-row items-center gap-3 rounded-2xl border px-3 py-2.5 ${isCurrent ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
            >
              <View className={`size-10 items-center justify-center rounded-full ${isCurrent ? "bg-primary" : "bg-primary-soft"}`}>
                {isCurrent && player.playing ? (
                  <Pause size={16} color="#fbf8f1" fill="#fbf8f1" />
                ) : (
                  <Play size={16} color={isCurrent ? "#fbf8f1" : primary} fill={isCurrent ? "#fbf8f1" : primary} />
                )}
              </View>
              <Text className={`flex-1 font-display-bold text-base ${isCurrent ? "text-primary" : "text-fg"}`}>{item.title}</Text>
              <DownloadButton track={item} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}
