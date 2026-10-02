import { router } from "expo-router";
import { Bookmark, BookmarkCheck, Headphones, ImageIcon, Share2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { alafasyAyahUrl, husaryAyahUrl } from "@/core/quran/ayahAudio";
import { getSurahTafsir, type TafsirAyah } from "@/core/quran/textApi";
import { toArabicDigits } from "@/core/text/arabic";
import { audio, type Track } from "@/features/audio/playerStore";
import { useThemeColor } from "@/theme/useThemeColor";

import { getSurah, getSurahAyahs, type MushafAyah } from "./mushaf";
import { isBookmarked, reader, useReaderState } from "./readerPrefs";

const tafsirMemory = new Map<number, TafsirAyah[]>();

type Voice = "husary" | "alafasy";
const VOICES: Record<Voice, { label: string; url: (id: number) => string }> = {
  husary: { label: "الحصري", url: husaryAyahUrl },
  alafasy: { label: "العفاسي", url: alafasyAyahUrl },
};

/** Ayah tracks from `ayah` to the end of its surah, so "listen" keeps reciting the way the reader reads. */
function tracksFrom(ayah: MushafAyah, voice: Voice): Track[] {
  const surahName = getSurah(ayah.surah)?.name ?? "";
  return getSurahAyahs(ayah.surah)
    .filter((entry) => entry.ayah >= ayah.ayah)
    .map((entry) => ({
      id: `ayah-${voice}-${entry.id}`,
      title: `${surahName} · الآية ${toArabicDigits(entry.ayah)}`,
      artist: `الشيخ ${VOICES[voice].label}`,
      url: VOICES[voice].url(entry.id),
    }));
}

/**
 * `riwaya` names another riwaya being read: its ayah numbering differs from Hafs, so the Hafs-keyed
 * extras (recitation, tafsir, the image card, bookmarks) are left out rather than shown misaligned.
 */
export function AyahSheet({ ayah, riwaya, onClose }: { ayah: MushafAyah | null; riwaya: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const state = useReaderState();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const [tafsir, setTafsir] = useState<{ surah: number; list: TafsirAyah[] } | null>(null);
  const surah = riwaya ? undefined : ayah?.surah;
  const list = surah !== undefined ? (tafsirMemory.get(surah) ?? (tafsir?.surah === surah ? tafsir.list : undefined)) : undefined;

  useEffect(() => {
    if (surah === undefined || tafsirMemory.has(surah)) return;
    let cancelled = false;
    getSurahTafsir(surah).then((result) => {
      if (cancelled) return;
      if (result.length) tafsirMemory.set(surah, result);
      setTafsir({ surah, list: result });
    });
    return () => {
      cancelled = true;
    };
  }, [surah]);

  const name = ayah ? getSurah(ayah.surah)?.name : "";
  const marked = ayah ? isBookmarked(state, ayah.surah, ayah.ayah) : false;
  const tafsirText = ayah ? list?.find((entry) => entry.numberInSurah === ayah.ayah)?.text : undefined;

  return (
    <Modal visible={ayah !== null} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="إغلاق" />
      {ayah && (
        <View className="max-h-[78%] rounded-t-[32px] bg-surface px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-3 h-1.5 w-12 self-center rounded-full bg-border" />
          <View className="flex-row items-center justify-between">
            <Text className="font-display-bold text-lg text-fg">
              سورة {name} · الآية {toArabicDigits(ayah.ayah)}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={onClose} hitSlop={10}>
              <X size={22} color={muted} />
            </Pressable>
          </View>

          <View className="mt-4 flex-row gap-2">
            {!riwaya &&
              (Object.keys(VOICES) as Voice[]).map((voice) => (
                <Pressable
                  key={voice}
                  accessibilityRole="button"
                  onPress={() => {
                    audio.playQueue(tracksFrom(ayah, voice), 0);
                    onClose();
                  }}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary py-2.5"
                >
                  <Headphones size={16} color="#fbf8f1" />
                  <Text className="font-sans-bold text-sm text-on-primary">{VOICES[voice].label}</Text>
                </Pressable>
              ))}
            {!riwaya && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={marked ? "إزالة العلامة" : "حفظ علامة"}
                onPress={() => reader.toggleBookmark({ surah: ayah.surah, ayah: ayah.ayah, page: ayah.page })}
                className="size-11 items-center justify-center rounded-2xl border border-border"
              >
                {marked ? <BookmarkCheck size={20} color={primary} /> : <Bookmark size={20} color={muted} />}
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مشاركة"
              onPress={() => Share.share({ message: `${ayah.text} ﴿${toArabicDigits(ayah.ayah)}﴾\n[سورة ${name}]\n\nمن تطبيق المنارة` })}
              className="size-11 items-center justify-center rounded-2xl border border-border"
            >
              <Share2 size={20} color={muted} />
            </Pressable>
            {!riwaya && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="مشاركة كصورة"
                onPress={() => {
                  onClose();
                  router.push({ pathname: "/share-ayah", params: { surah: String(ayah.surah), ayah: String(ayah.ayah) } });
                }}
                className="size-11 items-center justify-center rounded-2xl border border-gold/50 bg-accent-soft"
              >
                <ImageIcon size={20} color={primary} />
              </Pressable>
            )}
          </View>

          {riwaya ? (
            <Text className="mt-4 font-sans text-sm leading-6 text-fg-muted">
              أنت تقرأ برواية {riwaya}. التفسير والاستماع آية بآية متاحان برواية حفص.
            </Text>
          ) : (
            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              <Text className="font-sans-bold text-sm text-accent-strong">التفسير الميسر</Text>
              {tafsirText ? (
                <Text className="mt-2 font-sans text-base leading-8 text-fg">{tafsirText}</Text>
              ) : list ? (
                <Text className="mt-2 font-sans text-sm text-fg-muted">تعذّر تحميل التفسير. يحتاج أول فتح لاتصال بالإنترنت.</Text>
              ) : (
                <ActivityIndicator className="mt-4" color={primary} />
              )}
            </ScrollView>
          )}
        </View>
      )}
    </Modal>
  );
}
