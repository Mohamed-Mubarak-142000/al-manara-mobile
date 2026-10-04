import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import type { Track } from "@/features/audio/playerStore";

/**
 * The muezzin the user picked from the app's adhan library (the website's /adhan sources). The
 * recordings stream rather than ship inside the app, so the notification keeps the system sound and
 * the full adhan plays in the app: straight away when it is open, or when the notification is tapped.
 */
const KEY = "al-manara:adhan-voice:v1";
let cached: Track | null | undefined;
const listeners = new Set<() => void>();

export function readAdhanVoice(): Track | null {
  if (cached !== undefined) return cached;
  try {
    cached = JSON.parse(Storage.getItemSync(KEY) ?? "null") as Track | null;
  } catch {
    cached = null;
  }
  return cached;
}

export function setAdhanVoice(track: Track | null) {
  cached = track;
  try {
    Storage.setItemSync(KEY, JSON.stringify(track));
  } catch {
    // Kept for this session only.
  }
  listeners.forEach((notify) => notify());
}

export function useAdhanVoice(): Track | null {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, readAdhanVoice);
}
