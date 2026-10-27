import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import { normalizeUmrah, type UmrahState } from "@/core/umrah/umrahState";

/** The umrah guide's place, miqat, text size and tawaf/sa'i counts, kept on this device like the website's. */
const KEY = "al-manara:umrah:v1";

let cached: UmrahState | null = null;
const listeners = new Set<() => void>();

function read(): UmrahState {
  if (cached) return cached;
  try {
    cached = normalizeUmrah(JSON.parse(Storage.getItemSync(KEY) ?? "null"));
  } catch {
    cached = normalizeUmrah(null);
  }
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Saved synchronously on every change, so closing the app (or the system killing it) mid-tawaf keeps
 * the count.
 */
export function updateUmrah(change: (current: UmrahState) => UmrahState) {
  cached = change(read());
  try {
    Storage.setItemSync(KEY, JSON.stringify(cached));
  } catch {
    // Keep the in-memory state.
  }
  listeners.forEach((notify) => notify());
}

export function useUmrah(): UmrahState {
  return useSyncExternalStore(subscribe, read);
}
