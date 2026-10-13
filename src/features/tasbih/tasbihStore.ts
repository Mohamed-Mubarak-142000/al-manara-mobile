import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import { applyTasbih, normalizeTasbih, tapCompletesRound, type TasbihAction, type TasbihState } from "@/core/tasbih/tasbih";

/**
 * The tasbih screen's counts, adhkar and look, kept on this device like the website's localStorage.
 * Separate from the home-screen widget's count (al-manara:widget-tasbih:v1), which has its own rules.
 */
const KEY = "al-manara:tasbih:v1";

let cached: TasbihState | null = null;
const listeners = new Set<() => void>();

function read(): TasbihState {
  if (cached) return cached;
  try {
    cached = normalizeTasbih(JSON.parse(Storage.getItemSync(KEY) ?? "null"));
  } catch {
    cached = normalizeTasbih(null);
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateTasbih(action: TasbihAction) {
  cached = applyTasbih(read(), action);
  try {
    Storage.setItemSync(KEY, JSON.stringify(cached));
  } catch {
    // Keep the in-memory count.
  }
  listeners.forEach((notify) => notify());
}

/** Counts one tap; returns true when it completes a round. */
export function countTap(): boolean {
  const completed = tapCompletesRound(read());
  updateTasbih({ type: "tap" });
  return completed;
}

export function useTasbih(): TasbihState {
  return useSyncExternalStore(subscribe, read);
}
