import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams } from "expo-router";
import { Heart, Pause, Play, Shuffle } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buildSurahAudioUrl, type Moshaf, type Reciter } from "@/core/quran/api";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ScreenHeader, enterSoft } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { audio, currentTrack, usePlayer, type Track } from "@/features/audio/playerStore";
import { DownloadButton } from "@/features/downloads/DownloadButton";
import { SECTION_ART } from "@/features/home/sectionArt";
import { filterSurahs } from "@/features/listen/surahFilter";
import { useReciters } from "@/features/listen/useReciters";
import { getSurah } from "@/features/mushaf/mushaf";
import { onboarding, useOnboarding } from "@/features/onboarding/onboardingStore";
import { useThemeColor } from "@/theme/useThemeColor";

function trackId(reciter: Reciter, moshaf: Moshaf, surah: number) {
  return `surah-${reciter.id}-${moshaf.id}-${surah}`;
}

interface Row {
  surah: number;
  name: string;
  track: Track;
  /** Position in the full queue, so a filtered list still plays on through the rest. */
  index: number;
}

export default function ReciterScreen() {
  const { reciterId } = useLocalSearchParams<{ reciterId: string }>();
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const fg = useThemeColor("fg");
  const primary = useThemeColor("primary");
  const onPrimary = useThemeColor("on-primary");
  const { reciters, riwayat, failed, reload } = useReciters();
  const { favoriteReciterId } = useOnboarding();
  const player = usePlayer();
  const playing = currentTrack(player);
  const reciter = reciters?.find((entry) => String(entry.id) === reciterId);
  const [moshafId, setMoshafId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const moshaf = reciter?.moshaf.find((entry) => entry.id === moshafId) ?? reciter?.moshaf[0];
  const favorite = reciter !== undefined && reciter.id === favoriteReciterId;

  const rows: Row[] = useMemo(() => {
    if (!reciter || !moshaf) return [];
    return [...moshaf.surahList]
      .sort((a, b) => a - b)
      .map((surah, index) => {
        const name = getSurah(surah)?.name ?? toArabicDigits(surah);
        return {
          surah,
          name,
          index,
          track: {
            id: trackId(reciter, moshaf, surah),
            title: `سورة ${name}`,
            artist: reciter.name,
            url: buildSurahAudioUrl(moshaf, surah),
          },
        };
      });
  }, [reciter, moshaf]);
  const tracks = useMemo(() => rows.map((row) => row.track), [rows]);
  const visible = useMemo(() => filterSurahs(rows, query), [rows, query]);

  if (!reciter) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="القارئ" art={SECTION_ART.listen} />
        {failed ? <StateMessage message="تعذّر تحميل بيانات القارئ." onRetry={reload} /> : <StateMessage loading />}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <FlashList
        data={visible}
        keyExtractor={(row) => row.track.id}
        extraData={`${playing?.id}:${player.playing}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}
        ListHeaderComponent={
          <View className="mb-4">
            <ScreenHeader
              title={reciter.name}
              subtitle="القارئ"
              art={SECTION_ART.listen}
              actions={
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="القارئ المفضّل"
                  accessibilityState={{ checked: favorite }}
                  onPress={() => onboarding.setFavoriteReciter(favorite ? null : reciter.id)}
                  hitSlop={6}
                  className={`size-12 items-center justify-center rounded-2xl border ${favorite ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
                >
                  <Heart size={22} color={favorite ? primary : fg} fill={favorite ? primary : "transparent"} strokeWidth={1.8} />
                </Pressable>
              }
            />
            <Animated.View entering={enterSoft(0)} className="mx-4 mt-2 rounded-3xl border border-border bg-surface p-5 shadow-card">
              <View className="flex-row items-center gap-4">
                <View className="size-16 items-center justify-center rounded-full bg-primary-soft">
                  <Text className="font-sans-bold text-2xl text-primary">{reciter.letter}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-sans-bold text-xl text-fg">{reciter.name}</Text>
                  <Text className="mt-1 font-sans text-sm text-fg-muted">
                    {moshaf ? `${riwayat.get(moshaf.rewayaId) ?? moshaf.name} · ${toArabicDigits(tracks.length)} سورة` : ""}
                    {favorite ? " · قارئك المفضّل" : ""}
                  </Text>
                </View>
              </View>
              <View className="mt-5 flex-row gap-3">
                <Button className="flex-1" icon={Play} onPress={() => audio.playQueue(tracks, 0)}>
                  تشغيل الكل
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
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
            </Animated.View>

            {reciter.moshaf.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                accessibilityRole="radiogroup"
                accessibilityLabel="الرواية"
                contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 16 }}
              >
                {reciter.moshaf.map((entry) => {
                  const active = entry.id === moshaf?.id;
                  return (
                    <Pressable
                      key={entry.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active, checked: active }}
                      onPress={() => setMoshafId(entry.id)}
                      className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
                      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
                    >
                      <Text className={`font-sans-semibold text-xs ${active ? "text-on-primary" : "text-fg"}`}>
                        {riwayat.get(entry.rewayaId) ?? entry.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View className="px-4 pt-4">
              <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن سورة بالاسم أو الرقم" />
            </View>
          </View>
        }
        ListEmptyComponent={<StateMessage message="لا توجد سورة بهذا الاسم." />}
        renderItem={({ item }) => {
          const isCurrent = playing?.id === item.track.id;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${isCurrent && player.playing ? "إيقاف" : "تشغيل"} ${item.track.title}`}
              onPress={() => (isCurrent ? audio.toggle() : audio.playQueue(tracks, item.index))}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
            >
              <View
                className={`mx-4 mb-3 flex-row items-center gap-3 rounded-3xl border px-4 py-3 ${isCurrent ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
              >
                <View className={`size-10 items-center justify-center rounded-full ${isCurrent ? "bg-primary" : "bg-primary-soft"}`}>
                  {isCurrent && player.playing ? (
                    <Pause size={16} color={onPrimary} fill={onPrimary} />
                  ) : (
                    <Play size={16} color={isCurrent ? onPrimary : primary} fill={isCurrent ? onPrimary : primary} />
                  )}
                </View>
                <Text className={`flex-1 font-sans-bold text-base ${isCurrent ? "text-primary" : "text-fg"}`}>{item.track.title}</Text>
                <DownloadButton track={item.track} />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
