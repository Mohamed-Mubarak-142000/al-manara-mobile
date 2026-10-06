import { CircleCheck, Download, RotateCcw, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AYAH_VOICES, type AyahVoice } from "@/core/quran/ayahAudio";
import { toArabicDigits } from "@/core/text/arabic";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useThemeColor } from "@/theme/useThemeColor";

import { cancelSurah, downloadSurah, removeSurah, useAyahPack } from "./ayahPacks";

export function megabytes(bytes: number): string {
  return `${toArabicDigits((bytes / (1024 * 1024)).toFixed(1))} م.ب`;
}

/**
 * Save a surah's ayahs in one voice for offline listening: download → progress (cancel keeps what is
 * done) → saved (delete). With several `voices`, a small switch picks which one to save.
 */
export function AyahPackButton({ surah, voices }: { surah: number; voices: readonly AyahVoice[] }) {
  const [picked, setPicked] = useState<AyahVoice>(voices[0]);
  const voice = voices.includes(picked) ? picked : voices[0];
  const state = useAyahPack(voice, surah);
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const label = AYAH_VOICES[voice].label;

  return (
    <View className="gap-2 rounded-2xl border border-border bg-surface p-3">
      {voices.length > 1 && (
        <View className="flex-row gap-1.5">
          {voices.map((key) => {
            const active = key === voice;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setPicked(key)}
                className={`rounded-full px-3 py-1 ${active ? "bg-primary-soft" : ""}`}
              >
                <Text className={`font-sans-bold text-xs ${active ? "text-primary" : "text-fg-muted"}`}>{AYAH_VOICES[key].label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {state.status === "downloading" ? (
        <View className="gap-1">
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 font-sans text-sm text-fg">
              جارٍ تنزيل الآيات بصوت {label} · {toArabicDigits(state.count)} من {toArabicDigits(state.total)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="إيقاف التنزيل"
              onPress={() => cancelSurah(voice, surah)}
              hitSlop={8}
              className="p-1"
            >
              <X size={18} color={muted} />
            </Pressable>
          </View>
          <ProgressBar value={state.progress} />
        </View>
      ) : state.status === "ready" ? (
        <View className="flex-row items-center gap-2">
          <CircleCheck size={18} color={primary} />
          <Text className="flex-1 font-sans text-sm text-fg">
            آيات السورة بصوت {label} محفوظة للاستماع بدون إنترنت · {megabytes(state.bytes)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`حذف آيات السورة بصوت ${label}`}
            onPress={() => removeSurah(voice, surah)}
            hitSlop={8}
            className="p-1"
          >
            <Trash2 size={18} color={muted} />
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            onPress={() => void downloadSurah(voice, surah)}
            className="flex-1 flex-row items-center gap-2"
          >
            {state.status === "partial" && state.failed ? (
              <RotateCcw size={18} color={primary} />
            ) : (
              <Download size={18} color={primary} />
            )}
            <View className="flex-1">
              <Text className="font-sans-bold text-sm text-primary">
                {state.status === "partial" ? "أكمل تنزيل آيات السورة" : "تنزيل آيات السورة للاستماع بدون إنترنت"}
              </Text>
              <Text className="font-sans text-xs text-fg-muted">
                {state.status === "partial"
                  ? `${state.failed ? "تعذّر تنزيل بعض الآيات · " : ""}محفوظ ${toArabicDigits(state.count)} من ${toArabicDigits(state.total)} آية بصوت ${label}`
                  : `بصوت ${label}`}
              </Text>
            </View>
          </Pressable>
          {state.status === "partial" && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`حذف آيات السورة بصوت ${label}`}
              onPress={() => removeSurah(voice, surah)}
              hitSlop={8}
              className="p-1"
            >
              <Trash2 size={18} color={muted} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
