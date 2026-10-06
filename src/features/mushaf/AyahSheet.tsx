import { router } from "expo-router";
import { Bookmark, BookmarkCheck, Headphones, ImageIcon, NotebookPen, Repeat, Share2, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AYAH_VOICES } from "@/core/quran/ayahAudio";
import { toArabicDigits } from "@/core/text/arabic";
import { audio, type Track } from "@/features/audio/playerStore";
import { AyahPackButton } from "@/features/downloads/AyahPackButton";
import { ayahSource } from "@/features/downloads/ayahPacks";
import { useThemeColor } from "@/theme/useThemeColor";

import { getSurah, getSurahAyahs, type MushafAyah } from "./mushaf";
import { isBookmarked, noteFor, reader, useReaderState } from "./readerPrefs";
import { tafsirFor } from "./tafsir";

type Voice = "husary" | "alafasy";
const VOICES: Record<Voice, { label: string }> = {
  husary: AYAH_VOICES.husary,
  alafasy: AYAH_VOICES.alafasy,
};
const PACK_VOICES: readonly Voice[] = ["husary", "alafasy"];

/** Ayah tracks from `ayah` to the end of its surah, so "listen" keeps reciting the way the reader reads. */
function tracksFrom(ayah: MushafAyah, voice: Voice): Track[] {
  const surahName = getSurah(ayah.surah)?.name ?? "";
  return getSurahAyahs(ayah.surah)
    .filter((entry) => entry.ayah >= ayah.ayah)
    .map((entry) => ({
      id: `ayah-${voice}-${entry.id}`,
      title: `${surahName} · الآية ${toArabicDigits(entry.ayah)}`,
      artist: `الشيخ ${VOICES[voice].label}`,
      // A saved ayah plays from the device (the stream stays as backup).
      ...ayahSource(voice, entry.surah, entry.ayah),
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
  const name = ayah ? getSurah(ayah.surah)?.name : "";
  const marked = ayah ? isBookmarked(state, ayah.surah, ayah.ayah) : false;
  const note = ayah ? noteFor(state, ayah.surah, ayah.ayah) : undefined;
  const fg = useThemeColor("fg");
  const [noteDraft, setNoteDraft] = useState<{ id: number; text: string } | null>(null);
  const editing = ayah !== null && noteDraft?.id === ayah.id;
  // Bundled with the app, so it is there offline from the first launch.
  const tafsirText = ayah && !riwaya ? tafsirFor(ayah.id) : undefined;

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

          {!riwaya &&
            (editing ? (
              <View className="mt-3 gap-2">
                <TextInput
                  value={noteDraft.text}
                  onChangeText={(text) => setNoteDraft({ id: ayah.id, text })}
                  placeholder="اكتب ملاحظتك على هذه الآية"
                  multiline
                  autoFocus
                  className="min-h-20 rounded-2xl border border-border bg-bg p-3 font-sans text-base"
                  style={{ color: fg, textAlign: "right", textAlignVertical: "top" }}
                />
                <View className="flex-row gap-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      reader.setNote(ayah.surah, ayah.ayah, ayah.page, noteDraft.text);
                      setNoteDraft(null);
                    }}
                    className="flex-1 items-center rounded-2xl bg-primary py-2.5"
                  >
                    <Text className="font-sans-bold text-sm text-on-primary">حفظ الملاحظة</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setNoteDraft(null)}
                    className="items-center rounded-2xl border border-border px-4 py-2.5"
                  >
                    <Text className="font-sans-bold text-sm text-fg">إلغاء</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setNoteDraft({ id: ayah.id, text: note?.text ?? "" })}
                className="mt-3 flex-row items-start gap-2 rounded-2xl bg-accent-soft p-3"
              >
                <NotebookPen size={16} color={primary} />
                <Text className={`flex-1 font-sans text-sm leading-6 ${note ? "text-fg" : "text-fg-muted"}`}>
                  {note ? note.text : "أضف ملاحظة على هذه الآية"}
                </Text>
              </Pressable>
            ))}

          {!riwaya && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                router.push({ pathname: "/repeat", params: { surah: String(ayah.surah), from: String(ayah.ayah) } });
              }}
              className="mt-2 flex-row items-center justify-center gap-1.5 rounded-2xl border border-primary/40 py-2.5"
            >
              <Repeat size={16} color={primary} />
              <Text className="font-sans-bold text-sm text-primary">كرّر للحفظ (من آية إلى آية)</Text>
            </Pressable>
          )}

          {!riwaya && (
            <View className="mt-2">
              <AyahPackButton surah={ayah.surah} voices={PACK_VOICES} />
            </View>
          )}

          {riwaya ? (
            <Text className="mt-4 font-sans text-sm leading-6 text-fg-muted">
              أنت تقرأ برواية {riwaya}. التفسير والاستماع آية بآية متاحان برواية حفص.
            </Text>
          ) : (
            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              <Text className="font-sans-bold text-sm text-accent-strong">التفسير الميسر</Text>
              <Text className="mt-2 font-sans text-base leading-8 text-fg">{tafsirText}</Text>
            </ScrollView>
          )}
        </View>
      )}
    </Modal>
  );
}
