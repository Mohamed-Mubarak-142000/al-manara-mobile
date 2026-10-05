import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { background } from "../../../modules/almanara-background";
import { getRadioMediaUrl } from "@/core/sounds/soundsApi";

import type { Track } from "@/features/audio/playerStore";

export type AdhanVoice = Track & { offlineKey?: string };
const KEY = "al-manara:adhan-voice:v1";
let cached: AdhanVoice | null | undefined;
let selection = 0;
const listeners = new Set<() => void>();

export function readAdhanVoice(): AdhanVoice | null {
  if (cached !== undefined) return cached;
  try {
    cached = JSON.parse(Storage.getItemSync(KEY) ?? "null") as AdhanVoice | null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function setAdhanVoice(track: Track | null) {
  const version = ++selection;
  let next: AdhanVoice | null = track;
  if (track && Platform.OS === "android") {
    if (!background) throw new Error("اختيار الأذان الكامل يحتاج نسخة أندرويد الجديدة.");
    const ref = track.url.startsWith("radio-ref:") ? track.url.slice("radio-ref:".length) : null;
    const url = ref ? await getRadioMediaUrl(ref) : track.url;
    if (!url) throw new Error("تعذّر تحميل تسجيل المؤذن. الصوت السابق لم يتغير.");
    const offlineKey = await background.downloadVoice(track.id, url);
    next = { ...track, offlineKey };
  }
  if (version !== selection) return;
  Storage.setItemSync(KEY, JSON.stringify(next));
  cached = next;
  listeners.forEach((notify) => notify());
}

export function useAdhanVoice(): AdhanVoice | null {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, readAdhanVoice);
}
