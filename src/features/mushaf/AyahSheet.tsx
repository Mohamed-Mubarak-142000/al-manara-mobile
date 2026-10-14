import { router } from "expo-router";
import { Bookmark, BookmarkCheck, BookOpenText, Headphones, ImageIcon, NotebookPen, Repeat, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Share, Text, TextInput, View } from "react-native";

import { AYAH_VOICES } from "@/core/quran/ayahAudio";
import { toArabicDigits } from "@/core/text/arabic";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
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

const pressScale = ({ pressed }: { pressed: boolean }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] });

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
  const state = useReaderState();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const fg = useThemeColor("fg");
  const onPrimary = useThemeColor("on-primary");
  // The sheet glides out after `ayah` is cleared: it keeps showing the last ayah meanwhile.
  const [shown, setShown] = useState(ayah);
  if (ayah && ayah !== shown) setShown(ayah);
  const current = ayah ?? shown;
  const name = current ? getSurah(current.surah)?.name : "";
  const marked = current ? isBookmarked(state, current.surah, current.ayah) : false;
  const note = current ? noteFor(state, current.surah, current.ayah) : undefined;
  const [noteDraft, setNoteDraft] = useState<{ id: number; text: string } | null>(null);
  const editing = current !== null && noteDraft?.id === current.id;
  // Bundled with the app, so it is there offline from the first launch.
  const tafsirText = current && !riwaya ? tafsirFor(current.id) : undefined;

  return (
    <BottomSheet
      visible={ayah !== null}
      onClose={onClose}
      title={current ? `سورة ${name} · الآية ${toArabicDigits(current.ayah)}` : ""}
      maxHeight={0.85}
    >
      {current && (
        <View className="gap-3">
          <View className="flex-row gap-2">
            {!riwaya &&
              (Object.keys(VOICES) as Voice[]).map((voice) => (
                <Pressable
                  key={voice}
                  accessibilityRole="button"
                  onPress={() => {
                    audio.playQueue(tracksFrom(current, voice), 0);
                    onClose();
                  }}
                  className="flex-1"
                  style={pressScale}
                >
                  <View className="h-12 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary">
                    <Headphones size={16} color={onPrimary} />
                    <Text className="font-sans-bold text-sm text-on-primary">{VOICES[voice].label}</Text>
                  </View>
                </Pressable>
              ))}
            {!riwaya && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={marked ? "إزالة العلامة" : "حفظ علامة"}
                onPress={() => reader.toggleBookmark({ surah: current.surah, ayah: current.ayah, page: current.page })}
                className={`size-12 items-center justify-center rounded-2xl border ${marked ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
                style={pressScale}
              >
                {marked ? <BookmarkCheck size={20} color={primary} /> : <Bookmark size={20} color={fg} strokeWidth={1.8} />}
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مشاركة"
              onPress={() =>
                Share.share({ message: `${current.text} ﴿${toArabicDigits(current.ayah)}﴾\n[سورة ${name}]\n\nمن تطبيق المنارة` })
              }
              className="size-12 items-center justify-center rounded-2xl border border-border bg-surface"
              style={pressScale}
            >
              <Share2 size={20} color={fg} strokeWidth={1.8} />
            </Pressable>
            {!riwaya && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="مشاركة كصورة"
                onPress={() => {
                  onClose();
                  router.push({ pathname: "/share-ayah", params: { surah: String(current.surah), ayah: String(current.ayah) } });
                }}
                className="size-12 items-center justify-center rounded-2xl border border-border bg-surface"
                style={pressScale}
              >
                <ImageIcon size={20} color={fg} strokeWidth={1.8} />
              </Pressable>
            )}
          </View>

          {!riwaya &&
            (editing ? (
              <View className="gap-3">
                <TextInput
                  value={noteDraft.text}
                  onChangeText={(text) => setNoteDraft({ id: current.id, text })}
                  placeholder="اكتب ملاحظتك على هذه الآية"
                  placeholderTextColor={muted}
                  multiline
                  autoFocus
                  className="min-h-24 rounded-2xl border border-border bg-surface p-4 font-sans text-base"
                  style={{ color: fg, textAlign: "right", textAlignVertical: "top" }}
                />
                <View className="flex-row gap-3">
                  <Button className="flex-1" variant="secondary" onPress={() => setNoteDraft(null)}>
                    إلغاء
                  </Button>
                  <Button
                    className="flex-1"
                    onPress={() => {
                      reader.setNote(current.surah, current.ayah, current.page, noteDraft.text);
                      setNoteDraft(null);
                    }}
                  >
                    حفظ الملاحظة
                  </Button>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setNoteDraft({ id: current.id, text: note?.text ?? "" })}
                style={pressScale}
              >
                <View className="flex-row items-start gap-3 rounded-2xl border border-border bg-surface p-4">
                  <NotebookPen size={18} color={primary} />
                  <Text className={`flex-1 font-sans text-sm leading-6 ${note ? "text-fg" : "text-fg-muted"}`}>
                    {note ? note.text : "أضف ملاحظة على هذه الآية"}
                  </Text>
                </View>
              </Pressable>
            ))}

          {!riwaya && (
            <Button
              variant="secondary"
              icon={Repeat}
              onPress={() => {
                onClose();
                router.push({ pathname: "/repeat", params: { surah: String(current.surah), from: String(current.ayah) } });
              }}
            >
              كرّر للحفظ (من آية إلى آية)
            </Button>
          )}

          {!riwaya && <AyahPackButton surah={current.surah} voices={PACK_VOICES} />}

          {riwaya ? (
            <Text className="mt-1 font-sans text-sm leading-6 text-fg-muted">
              أنت تقرأ برواية {riwaya}. التفسير والاستماع آية بآية متاحان برواية حفص.
            </Text>
          ) : (
            <View className="mt-2 border-t border-border pt-4">
              <View className="flex-row items-center gap-2">
                <BookOpenText size={16} color={primary} />
                <Text className="font-sans-bold text-base text-fg">التفسير الميسر</Text>
              </View>
              <Text className="mt-2 font-sans text-base leading-8 text-fg">{tafsirText}</Text>
            </View>
          )}
        </View>
      )}
    </BottomSheet>
  );
}
