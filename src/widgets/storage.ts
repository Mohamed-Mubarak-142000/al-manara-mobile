import Storage from "expo-sqlite/kv-store";

import type { LastRead } from "@/features/mushaf/readerPrefs";

/*
 * The device storage the app's stores save to. Widgets and deep links read it directly: the widget
 * task runs headless (the app may not be open), so it can't use the React stores, only their saved state.
 */

export function readJson<T>(key: string): T | null {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    Storage.setItemSync(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the widget just shows its default next time.
  }
}

export function readLastRead(): LastRead | null {
  return readJson<{ lastRead?: LastRead | null }>("al-manara:reader:v1")?.lastRead ?? null;
}
