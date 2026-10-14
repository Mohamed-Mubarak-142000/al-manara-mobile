import { Download, Play, Repeat, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AYAH_VOICES } from "@/core/quran/ayahAudio";
import { toArabicDigits } from "@/core/text/arabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { audio, type Track } from "@/features/audio/playerStore";
import { megabytes } from "@/features/downloads/AyahPackButton";
import { removeSurah, useAyahPacks, type AyahPackSummary } from "@/features/downloads/ayahPacks";
import { downloads, useDownloads, type DownloadMeta } from "@/features/downloads/downloadStore";
import { HadithDownloadsSection } from "@/features/hadith/HadithDownloadsSection";
import { readyPacks, useHadithPacks } from "@/features/hadith/hadithPacks";
import { getSurah } from "@/features/mushaf/mushaf";
import { useThemeColor } from "@/theme/useThemeColor";

/** How long a deleted recitation can still be brought back before its file is removed. */
const UNDO_MS = 5000;

/**
 * Delete with undo: the row disappears at once, the file only goes once the undo bar times out (or
 * the user leaves the screen or deletes another one).
 */
function useUndoableRemove() {
  const [pending, setPending] = useState<DownloadMeta | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<DownloadMeta | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pendingRef.current) downloads.remove(pendingRef.current.id);
    pendingRef.current = null;
    setPending(null);
  }, []);

  useEffect(() => flush, [flush]);

  return {
    pending,
    remove(meta: DownloadMeta) {
      flush();
      pendingRef.current = meta;
      setPending(meta);
      timer.current = setTimeout(flush, UNDO_MS);
    },
    undo() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pendingRef.current = null;
      setPending(null);
    },
  };
}

/** Saved ayah-by-ayah packs, one card per surah with a row per voice. */
function AyahPacksSection({ packs }: { packs: AyahPackSummary[] }) {
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  if (!packs.length) return null;
  const bySurah = new Map<number, AyahPackSummary[]>();
  for (const pack of packs) bySurah.set(pack.surah, [...(bySurah.get(pack.surah) ?? []), pack]);

  return (
    <View className="mt-4">
      <View className="mx-5 mb-3 flex-row items-center gap-2">
        <Repeat size={16} color={primary} />
        <Text className="font-sans-bold text-base text-fg">آيات للتكرار والحفظ</Text>
      </View>
      {[...bySurah].map(([surah, voices]) => (
        <View key={surah} className="mx-4 mb-3 rounded-3xl border border-border bg-surface px-4 py-3">
          <Text className="font-sans-bold text-base text-fg">سورة {getSurah(surah)?.name ?? toArabicDigits(surah)}</Text>
          {voices.map(({ voice, entry }) => (
            <View key={voice} className="mt-1 flex-row items-center gap-2">
              <Text className="flex-1 font-sans text-xs text-fg-muted">
                {AYAH_VOICES[voice].label} ·{" "}
                {entry.complete ? "كاملة" : `${toArabicDigits(entry.count)} من ${toArabicDigits(entry.total)} آية`} ·{" "}
                {megabytes(entry.bytes)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`حذف آيات سورة ${getSurah(surah)?.name ?? ""} بصوت ${AYAH_VOICES[voice].label}`}
                onPress={() => removeSurah(voice, surah)}
                hitSlop={8}
                className="p-1.5"
              >
                <Trash2 size={16} color={muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Everything saved for offline listening. */
export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const entries = useDownloads();
  const undoable = useUndoableRemove();
  const saved: DownloadMeta[] = Object.values(entries)
    .flatMap((entry) => (entry.status === "done" && entry.meta.id !== undoable.pending?.id ? [entry.meta] : []))
    .sort((a, b) => b.savedAt - a.savedAt);
  const total = saved.reduce((sum, meta) => sum + meta.bytes, 0);
  const queue: Track[] = saved.map(({ id, title, artist, url }) => ({ id, title, artist, url }));
  const packs = useAyahPacks();
  const packBytes = packs.reduce((sum, pack) => sum + pack.entry.bytes, 0);
  useHadithPacks();
  const empty = !saved.length && !packs.length && !readyPacks().length;

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        className="flex-1 bg-bg"
        data={saved}
        keyExtractor={(meta) => meta.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + (undoable.pending ? 96 : 32) }}
        ListHeaderComponent={
          <PageHeader
            back
            kicker="دون إنترنت"
            icon={Download}
            title="المحفوظات"
            description={
              empty
                ? "تلاوات للاستماع دون إنترنت"
                : `${saved.length ? `${toArabicDigits(saved.length)} تلاوة · ` : ""}${packs.length ? `${toArabicDigits(packs.length)} حزمة آيات · ` : ""}${megabytes(total + packBytes)} على الجهاز`
            }
          />
        }
        ListEmptyComponent={empty ? <StateMessage message="لم تحفظ أي تلاوة بعد. اضغط زر التنزيل بجوار أي سورة." /> : null}
        ListFooterComponent={
          <>
            <AyahPacksSection packs={packs} />
            <HadithDownloadsSection />
          </>
        }
        renderItem={({ item, index }) => (
          <View className="mx-4 mb-3 flex-row items-center gap-3 rounded-3xl border border-border bg-surface px-4 py-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`تشغيل ${item.title}`}
              onPress={() => audio.playQueue(queue, index)}
              className="size-10 items-center justify-center rounded-full bg-primary-soft"
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}
            >
              <Play size={16} color={primary} fill={primary} />
            </Pressable>
            <View className="flex-1">
              <Text className="font-sans-bold text-base text-fg">{item.title}</Text>
              <Text className="font-sans text-xs text-fg-muted">
                {item.artist} · {megabytes(item.bytes)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`حذف ${item.title}`}
              onPress={() => undoable.remove(item)}
              hitSlop={8}
              className="p-2"
            >
              <Trash2 size={18} color={muted} />
            </Pressable>
          </View>
        )}
      />
      {undoable.pending && (
        <Animated.View
          entering={FadeInDown.duration(320).easing(Easing.bezier(0.22, 1, 0.36, 1))}
          exiting={FadeOutDown.duration(240)}
          accessibilityLiveRegion="polite"
          className="absolute inset-x-4 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card"
          style={{ bottom: insets.bottom + miniPlayer + 12 }}
        >
          <Text numberOfLines={1} className="flex-1 font-sans text-sm text-fg">
            حُذفت {undoable.pending.title}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="تراجع عن الحذف" onPress={undoable.undo} hitSlop={8}>
            <Text className="font-sans-bold text-sm text-primary">تراجع</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}
