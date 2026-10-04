import { router } from "expo-router";
import { Check, ChevronDown, Pause, Play } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSoundLibrary } from "@/core/sounds/soundsApi";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { RADIO_REF, audio, currentTrack, usePlayer, type Track } from "@/features/audio/playerStore";
import { useAsync } from "@/features/hadith/useAsync";
import { setAdhanVoice, useAdhanVoice } from "@/features/prayer/adhanSound";
import { useThemeColor } from "@/theme/useThemeColor";

/** Pick the muezzin whose adhan plays at prayer time: the app's adhan library, with a preview. */
export default function AdhanVoiceScreen() {
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const primary = useThemeColor("primary");
  const chosen = useAdhanVoice();
  const player = usePlayer();
  const playing = currentTrack(player);
  const [query, setQuery] = useState("");
  const { state, reload } = useAsync("adhan-library", async () => {
    const library = await getSoundLibrary("adhan");
    if (!library.tracks.length) return null;
    const names = new Map(library.artists.map((artist) => [artist.id, artist.name]));
    return library.tracks.map((track): Track => {
      const ref = track.src.match(/\/api\/sounds\/media\/(\d+)/)?.[1];
      return {
        id: `adhan-voice-${track.id}`,
        title: track.title,
        artist: names.get(track.artistId) ?? "الأذان",
        url: ref ? `${RADIO_REF}${ref}` : track.src,
      };
    });
  });

  const list = useMemo(() => {
    if (state.status !== "ready") return [];
    const needle = normalizeArabic(query.trim());
    return needle ? state.data.filter((track) => normalizeArabic(`${track.title} ${track.artist}`).includes(needle)) : state.data;
  }, [state, query]);

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={list}
      keyExtractor={(track) => track.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}
      ListHeaderComponent={
        <View className="gap-3 px-4 pb-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إغلاق"
            onPress={() => router.back()}
            hitSlop={12}
            className="self-start p-1"
          >
            <ChevronDown size={28} color={fg} />
          </Pressable>
          <Text className="font-display-bold text-2xl text-fg">صوت الأذان</Text>
          <Text className="font-sans text-sm leading-6 text-fg-muted">
            اختر المؤذن. يُرفع الأذان كاملًا بصوته عند دخول الوقت والتطبيق مفتوح، أو عند الضغط على الإشعار.
          </Text>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen === null }}
            onPress={() => setAdhanVoice(null)}
            className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${chosen === null ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
          >
            <Text className="font-display-bold text-base text-fg">صوت الإشعار فقط (بدون أذان)</Text>
            {chosen === null && <Check size={18} color={primary} />}
          </Pressable>
          <SearchField value={query} onChangeText={setQuery} placeholder="ابحث باسم المؤذن" />
        </View>
      }
      ListEmptyComponent={
        state.status === "loading" ? (
          <StateMessage loading />
        ) : state.status === "error" ? (
          <StateMessage message="تعذّر تحميل أصوات الأذان الآن." onRetry={reload} />
        ) : (
          <StateMessage message="لا توجد نتائج مطابقة." />
        )
      }
      renderItem={({ item }) => {
        const selected = chosen?.id === item.id;
        const previewing = playing?.id === item.id && player.playing;
        return (
          <View
            className={`mx-4 mb-2 flex-row items-center gap-3 rounded-2xl border px-3 py-2.5 ${selected ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={previewing ? "إيقاف" : "استمع"}
              onPress={() => (playing?.id === item.id ? audio.toggle() : audio.playTrack(item))}
              className="size-10 items-center justify-center rounded-full bg-primary-soft"
            >
              {previewing ? <Pause size={16} color={primary} fill={primary} /> : <Play size={16} color={primary} fill={primary} />}
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setAdhanVoice(item)}
              className="flex-1 flex-row items-center gap-2"
            >
              <View className="flex-1">
                <Text numberOfLines={1} className="font-display-bold text-sm text-fg">
                  {item.artist}
                </Text>
                <Text numberOfLines={1} className="font-sans text-xs text-fg-muted">
                  {item.title}
                </Text>
              </View>
              {selected && <Check size={18} color={primary} />}
            </Pressable>
          </View>
        );
      }}
    />
  );
}
