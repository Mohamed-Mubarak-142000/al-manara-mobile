import { router } from "expo-router";
import { Check, ChevronDown, Pause, Play } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSoundLibrary } from "@/core/sounds/soundsApi";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { IconButton, ScreenHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { StateMessage } from "@/components/ui/StateMessage";
import { RADIO_REF, audio, currentTrack, usePlayer, type Track } from "@/features/audio/playerStore";
import { TrackDownloadButton } from "@/features/downloads/TrackDownloadButton";
import { useAsync } from "@/features/hadith/useAsync";
import { setAdhanVoice, useAdhanVoice } from "@/features/prayer/adhanSound";
import { useThemeColor } from "@/theme/useThemeColor";
import { reportReminderError } from "@/features/notifications/backgroundReminderStatus";

/** Pick the muezzin whose adhan plays at prayer time: the app's adhan library, with a preview. */
export default function AdhanVoiceScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor("primary");
  const chosen = useAdhanVoice();
  const player = usePlayer();
  const playing = currentTrack(player);
  const [query, setQuery] = useState("");
  // The voice being downloaded right now ("default" for the built-in one), shown with a spinner on its row.
  const [savingId, setSavingId] = useState<string | null>(null);
  const saving = savingId !== null;
  const [saveError, setSaveError] = useState<{ id: string; message: string } | null>(null);
  async function choose(track: Track | null) {
    const id = track?.id ?? "default";
    setSavingId(id);
    setSaveError(null);
    try {
      await setAdhanVoice(track);
    } catch (error) {
      setSaveError({ id, message: "تعذّر تنزيل هذا الأذان الآن (المصدر بطيء أو الاتصال ضعيف). الاختيار السابق لم يتغير، جرّب مرة أخرى." });
      reportReminderError(error);
    } finally {
      setSavingId(null);
    }
  }
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
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      ListHeaderComponent={
        <View>
          <ScreenHeader
            back={false}
            title="صوت الأذان"
            actions={<IconButton icon={ChevronDown} label="إغلاق" onPress={() => router.back()} />}
          />
          <View className="gap-3 px-4 pb-3">
            <Text className="font-sans text-sm leading-6 text-fg-muted">
              {Platform.OS === "android"
                ? "اختر المؤذن لتنزيل الأذان كاملًا وتشغيله عند دخول الوقت حتى والتطبيق مغلق، دون إنترنت."
                : "آيفون يستخدم مقطع أذان قصيرًا موحدًا في الإشعار. يمكنك الاستماع إلى تسجيل المؤذن كاملًا هنا."}
            </Text>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: chosen === null }}
              disabled={saving}
              onPress={() => {
                void choose(null);
              }}
              className={`flex-row items-center justify-between rounded-3xl border px-4 py-3.5 ${chosen === null ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
            >
              <View className="flex-1">
                <Text className="font-sans-bold text-base text-fg">الأذان الافتراضي</Text>
                <Text className="font-sans text-xs text-fg-muted">مدمج في التطبيق، يعمل دون تنزيل أو إنترنت</Text>
              </View>
              {savingId === "default" ? <ActivityIndicator color={primary} /> : chosen === null && <Check size={18} color={primary} />}
            </Pressable>
            <SearchField value={query} onChangeText={setQuery} placeholder="ابحث باسم المؤذن" />
          </View>
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
        const downloading = savingId === item.id;
        const failed = saveError?.id === item.id ? saveError.message : null;
        return (
          <View
            className={`mx-4 mb-2.5 rounded-3xl border px-4 py-3 ${selected || downloading ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
            style={{ opacity: saving && !downloading ? 0.55 : 1 }}
          >
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={previewing ? "إيقاف" : "استمع"}
              onPress={() => (playing?.id === item.id ? audio.toggle() : audio.playTrack(item))}
              className="size-11 items-center justify-center rounded-2xl bg-primary-soft"
            >
              {previewing ? <Pause size={16} color={primary} fill={primary} /> : <Play size={16} color={primary} fill={primary} />}
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              disabled={saving}
              onPress={() => {
                void choose(item);
              }}
              className="flex-1 flex-row items-center gap-2"
            >
              <View className="flex-1">
                <Text numberOfLines={1} className="font-sans-bold text-sm text-fg">
                  {item.artist}
                </Text>
                <Text numberOfLines={1} className="font-sans text-xs text-fg-muted">
                  {item.title}
                </Text>
                {downloading ? (
                  <Text numberOfLines={1} className="font-sans-bold text-xs text-primary">
                    جارٍ تنزيل الأذان وحفظه… قد يستغرق دقيقة
                  </Text>
                ) : (
                  selected &&
                  chosen?.offlineKey && (
                    <Text numberOfLines={1} className="font-sans-bold text-xs text-primary">
                      محفوظ على الجهاز للأذان دون إنترنت
                    </Text>
                  )
                )}
              </View>
              {downloading ? <ActivityIndicator color={primary} /> : selected && <Check size={18} color={primary} />}
            </Pressable>
            {/* The preview: save it for listening offline (the alarm keeps its own copy). */}
            <TrackDownloadButton track={item} />
          </View>
          {failed && (
            <Text accessibilityRole="alert" className="mt-2 font-sans text-xs leading-5 text-danger">
              {failed}
            </Text>
          )}
          </View>
        );
      }}
    />
  );
}
