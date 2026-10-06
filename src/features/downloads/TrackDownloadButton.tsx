import { Check, Download, RotateCcw } from "lucide-react-native";
import { Pressable } from "react-native";

import { AYAH_VOICES, type AyahVoice } from "@/core/quran/ayahAudio";
import { toArabicDigits } from "@/core/text/arabic";
import type { Track } from "@/features/audio/playerStore";
import { getSurah } from "@/features/mushaf/mushaf";

import { cancelSurah, downloadSurah, removeSurah, useAyahPack } from "./ayahPacks";
import { DownloadButton, DownloadProgressRing, useDownloadColors, type DownloadTone } from "./DownloadButton";
import { canDownloadHls } from "./downloadStore";
import { ayahRefOf, trackDownloadKind } from "./trackIds";

/**
 * The compact icon for a surah's ayah pack in one voice, with the same states as DownloadButton:
 * download → ring (tap to stop, keeps what is saved) → check (long-press to delete).
 */
export function AyahPackIconButton({
  voice,
  surah,
  tone = "dark",
  tint,
}: {
  voice: AyahVoice;
  surah: number;
  tone?: DownloadTone;
  tint?: string;
}) {
  const state = useAyahPack(voice, surah);
  const colors = useDownloadColors(tone, tint);
  const what = `آيات سورة ${getSurah(surah)?.name ?? toArabicDigits(surah)} بصوت ${AYAH_VOICES[voice].label}`;

  if (state.status === "downloading") {
    return <DownloadProgressRing progress={state.progress} tone={tone} tint={tint} onCancel={() => cancelSurah(voice, surah)} />;
  }
  if (state.status === "ready") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="محفوظ"
        accessibilityHint={`${what} محفوظة للاستماع دون إنترنت، اضغط مطولًا للحذف`}
        hitSlop={8}
        onLongPress={() => removeSurah(voice, surah)}
        className="size-9 items-center justify-center"
      >
        <Check size={20} color={colors.done} />
      </Pressable>
    );
  }
  const failed = state.status === "partial" && state.failed;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={state.status === "partial" ? `أكمل تنزيل ${what}` : `تنزيل ${what}`}
      accessibilityHint="للاستماع دون إنترنت"
      hitSlop={8}
      onPress={() => void downloadSurah(voice, surah)}
      className="size-9 items-center justify-center"
    >
      {failed ? <RotateCcw size={19} color={colors.idle} /> : <Download size={20} color={colors.idle} />}
    </Pressable>
  );
}

/** Whether `TrackDownloadButton` draws anything for this track (callers keep their layout otherwise). */
export function isTrackDownloadable(track: Track): boolean {
  return trackDownloadKind(track, canDownloadHls()) !== null;
}

/**
 * The download control for whatever is playing: one file for a surah or a recording, the surah's
 * ayah pack for ayah-by-ayah audio, and nothing for live radio or clips that can't be saved.
 */
export function TrackDownloadButton({ track, tone = "dark", tint }: { track: Track; tone?: DownloadTone; tint?: string }) {
  const kind = trackDownloadKind(track, canDownloadHls());
  if (kind === "ayah-pack") {
    const ref = ayahRefOf(track)!;
    return <AyahPackIconButton voice={ref.voice} surah={ref.surah} tone={tone} tint={tint} />;
  }
  if (kind === "file") return <DownloadButton track={track} tone={tone} tint={tint} />;
  return null;
}
