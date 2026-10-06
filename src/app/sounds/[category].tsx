import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight, Pause, Play } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SOUND_CATEGORIES, getSoundLibrary, type SoundCategoryKey, type SoundLibrary, type SoundTrack } from "@/core/sounds/soundsApi";
import { formatDuration } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { RADIO_REF, audio, currentTrack, usePlayer, type Track } from "@/features/audio/playerStore";
import { TrackDownloadButton, isTrackDownloadable } from "@/features/downloads/TrackDownloadButton";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

const ARTIST_ROW_LABEL: Record<SoundCategoryKey, string> = {
  ibtihalat: "المبتهلون",
  tawasheeh: "المنشدون",
  duas: "الأصوات",
  adhan: "المؤذنون",
};
const KEYS = Object.keys(SOUND_CATEGORIES) as SoundCategoryKey[];

/** A library track as a player track: radio clips resolve to their HLS playlist on play, archive files play as-is. */
function toTrack(track: SoundTrack, artist: string): Track {
  const ref = track.src.match(/\/api\/sounds\/media\/(\d+)/)?.[1];
  return { id: `sound-${track.id}`, title: track.title, artist, url: ref ? `${RADIO_REF}${ref}` : track.src };
}

/** One screen for the website's four sound pages: ابتهالات، تواشيح، أدعية، أذان. */
export default function SoundsScreen() {
  const params = useLocalSearchParams<{ category: string }>();
  const category: SoundCategoryKey = KEYS.includes(params.category as SoundCategoryKey)
    ? (params.category as SoundCategoryKey)
    : "ibtihalat";
  const info = SOUND_CATEGORIES[category];
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const heroFg = useThemeColor("hero-fg");
  const primary = useThemeColor("primary");
  const onPrimary = useThemeColor("on-primary");
  const player = usePlayer();
  const playing = currentTrack(player);
  const [result, setResult] = useState<{ category: SoundCategoryKey; library: SoundLibrary | null } | null>(null);
  const [artist, setArtist] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const accent = useThemeColor("accent");

  useEffect(() => {
    let cancelled = false;
    getSoundLibrary(category)
      .then((library) => !cancelled && setResult({ category, library: library.tracks.length ? library : null }))
      .catch(() => !cancelled && setResult({ category, library: null }))
      .finally(() => !cancelled && setRefreshing(false));
    return () => {
      cancelled = true;
    };
  }, [category, attempt]);

  const library = result?.category === category ? result.library : undefined;

  function retry() {
    setResult(null);
    setAttempt((value) => value + 1);
  }

  /** Pull-to-refresh keeps the current list on screen while the new one loads. */
  function refresh() {
    setRefreshing(true);
    setAttempt((value) => value + 1);
  }
  const names = useMemo(() => new Map(library?.artists.map((entry) => [entry.id, entry.name])), [library]);
  const tracks = useMemo(() => {
    if (!library) return [];
    const needle = normalizeArabic(query.trim());
    return library.tracks
      .filter((track) => !artist || track.artistId === artist)
      .filter((track) => !needle || normalizeArabic(`${track.title} ${names.get(track.artistId) ?? ""}`).includes(needle))
      .map((track) => ({ source: track, track: toTrack(track, names.get(track.artistId) ?? info.label) }));
  }, [library, artist, query, names, info.label]);
  const queue = tracks.map((entry) => entry.track);
  // Radio-library clips are encrypted at the source: when nothing in this view can be saved, say so once.
  const streamOnly = useMemo(() => {
    const shown = library?.tracks.filter((track) => !artist || track.artistId === artist) ?? [];
    return shown.length > 0 && shown.every((track) => !isTrackDownloadable(toTrack(track, "")));
  }, [library, artist]);
  const artistName = artist ? names.get(artist) : null;

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={tracks}
      keyExtractor={(entry) => entry.track.id}
      initialNumToRender={16}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accent} colors={[accent]} />}
      contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}
      ListHeaderComponent={
        <View className="mb-3">
          <View className="rounded-b-[32px] bg-hero px-5 pb-10" style={{ paddingTop: insets.top + 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={() => router.back()}
              hitSlop={12}
              className="mb-3 self-start p-1"
            >
              <ChevronRight size={26} color={heroFg} />
            </Pressable>
            <Text className="font-sans-bold text-sm text-gold-soft">أدعية وابتهالات</Text>
            <Text className="mt-2 font-display-bold text-3xl text-hero-fg">{info.title}</Text>
            <Text className="mt-2 font-sans text-sm leading-6 text-white/75" numberOfLines={3}>
              {info.description}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 16 }}>
              {KEYS.map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: key === category }}
                  onPress={() => {
                    setArtist(null);
                    router.setParams({ category: key });
                  }}
                  className={`rounded-full px-4 py-1.5 ${key === category ? "bg-gold" : "bg-white/10"}`}
                >
                  <Text className={`font-sans-bold text-sm ${key === category ? "text-emerald-night" : "text-white/80"}`}>
                    {SOUND_CATEGORIES[key].label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View className="-mt-6 gap-3 px-4">
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={artistName ? `ابحث في ${info.label} ${artistName}…` : "ابحث بالعنوان أو اسم الشيخ…"}
            />
            {library && library.artists.length > 1 && (
              <>
                <Text className="font-sans-bold text-sm text-fg">{ARTIST_ROW_LABEL[category]}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: artist === null }}
                    onPress={() => setArtist(null)}
                    className={`justify-center rounded-full border px-4 py-2 ${artist === null ? "border-primary bg-primary" : "border-border bg-surface"}`}
                  >
                    <Text className={`font-sans-bold text-sm ${artist === null ? "text-on-primary" : "text-fg"}`}>الكل</Text>
                  </Pressable>
                  {library.artists.map((entry) => {
                    const active = entry.id === artist;
                    return (
                      <Pressable
                        key={entry.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        onPress={() => setArtist(active ? null : entry.id)}
                        className={`flex-row items-center gap-2 rounded-full border py-1 pe-4 ps-1 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
                      >
                        {entry.image ? (
                          <Image source={{ uri: entry.image }} style={{ width: 30, height: 30, borderRadius: 15 }} contentFit="cover" />
                        ) : (
                          <View className="size-[30px] items-center justify-center rounded-full bg-primary-soft">
                            <Text className="font-display-bold text-xs text-primary">{entry.name.slice(0, 1)}</Text>
                          </View>
                        )}
                        <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{entry.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
            {streamOnly && (
              <Text className="font-sans text-xs leading-5 text-fg-muted">هذه التسجيلات تُبث من مصدرها ولا يمكن حفظها</Text>
            )}
          </View>
        </View>
      }
      ListEmptyComponent={
        library === undefined ? (
          <StateMessage loading />
        ) : library === null ? (
          <StateMessage message="تعذّر تحميل هذا القسم الآن، حاول مرة أخرى بعد قليل." onRetry={retry} />
        ) : (
          <StateMessage message="لا توجد نتائج مطابقة." />
        )
      }
      ListFooterComponent={
        library ? (
          <Text className="mx-6 mt-4 text-center font-sans text-xs leading-5 text-fg-muted">
            المصدر: مكتبة إذاعة القرآن الكريم المصرية ومجموعات عامة على أرشيف الإنترنت.
          </Text>
        ) : null
      }
      renderItem={({ item, index }) => {
        const isCurrent = playing?.id === item.track.id;
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => (isCurrent ? audio.toggle() : audio.playQueue(queue, index))}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View
              className={`mx-4 mb-2 flex-row items-center gap-3 rounded-2xl border px-3 py-2.5 ${isCurrent ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
            >
              <View className={`size-10 items-center justify-center rounded-full ${isCurrent ? "bg-primary" : "bg-primary-soft"}`}>
                {isCurrent && player.playing ? (
                  <Pause size={16} color={onPrimary} fill={onPrimary} />
                ) : (
                  <Play size={16} color={isCurrent ? onPrimary : primary} fill={isCurrent ? onPrimary : primary} />
                )}
              </View>
              <View className="flex-1">
                <Text numberOfLines={2} className={`font-display-bold text-sm leading-6 ${isCurrent ? "text-primary" : "text-fg"}`}>
                  {item.track.title}
                </Text>
                <Text className="font-sans text-xs text-fg-muted">
                  {item.track.artist}
                  {item.source.duration ? ` · ${formatDuration(item.source.duration)}` : ""}
                </Text>
              </View>
              {/* Radio clips are encrypted HLS: no icon while they can't be saved (see canDownloadHls). */}
              <TrackDownloadButton track={item.track} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}
