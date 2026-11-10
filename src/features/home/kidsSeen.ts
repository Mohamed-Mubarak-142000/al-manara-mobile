import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

/**
 * Whether this device has opened the kids' garden yet. Until it has, Home marks the garden's banner as
 * new, so a parent notices it on entering the app; the mark goes away for good on the first visit.
 */
const KEY = "al-manara:kids-seen:v1";
const listeners = new Set<() => void>();

let seen: boolean | null = null;

function read(): boolean {
  if (seen === null) {
    try {
      seen = Storage.getItemSync(KEY) === "1";
    } catch {
      seen = false;
    }
  }
  return seen;
}

export function markKidsSeen() {
  if (read()) return;
  seen = true;
  try {
    Storage.setItemSync(KEY, "1");
  } catch {
    // Shown as new again next launch; harmless.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useKidsSeen(): boolean {
  return useSyncExternalStore(subscribe, read, read);
}
