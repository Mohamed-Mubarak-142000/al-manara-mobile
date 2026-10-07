import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import type { PrayerCalcSettings } from "@/core/prayer/calculation";
import type { UserLocation } from "@/core/prayer/location";
import { currentUserIdNow } from "@/features/account/accountStore";
import {
  readAdhkarReminders,
  readOutsideAdhkarNotifications,
  setAdhkarReminder,
  setOutsideAdhkarNotifications,
  type ReminderKind,
} from "@/features/adhkar/adhkarReminders";
import { readAdhkarToastEnabled, setAdhkarToastEnabled } from "@/features/adhkar/AdhkarToaster";
import { readReaderPrefs, reader, type ReaderTheme } from "@/features/mushaf/readerPrefs";
import type { RiwayaKey } from "@/features/mushaf/riwayat";
import { onboarding } from "@/features/onboarding/onboardingStore";
import { readAdhanSettings, writeAdhanSettings, type AdhanSettings } from "@/features/prayer/adhanSettings";
import { readAdhanVoice, setAdhanVoice } from "@/features/prayer/adhanSound";
import { readUserLocation, restoreUserLocation } from "@/features/prayer/locationStore";
import { readPrayerCalcSettings, writePrayerCalcSettings } from "@/features/prayer/prayerCalcSettings";
import { enqueue, registerHandler, throwIfError } from "@/lib/outbox";
import { supabase } from "@/lib/supabase";
import { readTextScale, setTextScale } from "@/theme/textScale";

/**
 * The app's settings on the account (user_preferences, one row per user), so they follow the user to
 * another phone or a reinstall, and so the app knows who hasn't finished setting up. The device stays
 * the source of truth while in use: changes are written through the outbox (offline-safe, the last one
 * wins); the account's copy is applied once, the first time an account signs in on this device.
 */

export interface AppPreferences {
  v: 1;
  adhan: AdhanSettings;
  adhanVoice: { id: string; title: string; artist: string; url: string } | null;
  calc: PrayerCalcSettings;
  location: UserLocation;
  adhkar: Record<ReminderKind, boolean>;
  outsideAdhkar: boolean;
  adhkarToast: boolean;
  textScale: number;
  reader: { theme: ReaderTheme; fontStep: number; tajweed: boolean; riwaya: RiwayaKey };
  favoriteReciterId: number | null;
}

export function snapshotPreferences(): AppPreferences {
  const reminders = readAdhkarReminders();
  const voice = readAdhanVoice();
  const prefs = readReaderPrefs();
  const calc = readPrayerCalcSettings();
  return {
    v: 1,
    adhan: readAdhanSettings(),
    adhanVoice: voice ? { id: voice.id, title: voice.title, artist: voice.artist, url: voice.url } : null,
    calc: { ...calc, offsets: { ...calc.offsets } },
    location: readUserLocation(),
    adhkar: { morning: reminders.morning.enabled, evening: reminders.evening.enabled, friday: reminders.friday.enabled },
    outsideAdhkar: readOutsideAdhkarNotifications(),
    adhkarToast: readAdhkarToastEnabled(),
    textScale: readTextScale(),
    reader: { theme: prefs.theme, fontStep: prefs.fontStep, tajweed: prefs.tajweed, riwaya: prefs.riwaya },
    favoriteReciterId: onboarding.favoriteReciter(),
  };
}

// ── What this device knows about the account's copy ──

const STATE_KEY = "al-manara:prefs-sync:v1";
interface SyncState {
  /** The account whose settings were applied here (once per account and device). */
  appliedFor: string | null;
  /** Setup saved on the settings screen: per account, and "guest" for the device without one. */
  completed: Record<string, boolean>;
  /** The last snapshot sent, to skip identical writes. */
  sent: string | null;
}

let state: SyncState | null = null;
const listeners = new Set<() => void>();

function readState(): SyncState {
  if (state) return state;
  try {
    state = { appliedFor: null, completed: {}, sent: null, ...(JSON.parse(Storage.getItemSync(STATE_KEY) ?? "{}") as Partial<SyncState>) };
  } catch {
    state = { appliedFor: null, completed: {}, sent: null };
  }
  return state;
}

function writeState(patch: Partial<SyncState>) {
  state = { ...readState(), ...patch };
  try {
    Storage.setItemSync(STATE_KEY, JSON.stringify(state));
  } catch {
    // Kept for this session.
  }
  listeners.forEach((notify) => notify());
}

/** Whether the settings screen was saved, for this account (or the guest on this device). */
export function useSetupComplete(userId: string | null): boolean {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readState,
  );
  return current.completed[userId ?? "guest"] === true;
}

// ── Writing ──

const PREFS_OP = "preferences";
type PrefsPayload = { userId: string; prefs: AppPreferences; completed: boolean };

registerHandler<PrefsPayload>(PREFS_OP, async ({ userId, prefs, completed }) => {
  if (!supabase) return;
  const now = new Date().toISOString();
  throwIfError(
    await supabase
      .from("user_preferences")
      .upsert(
        { user_id: userId, prefs: prefs as unknown as Record<string, unknown>, updated_at: now, ...(completed && { completed_at: now }) },
        { onConflict: "user_id" },
      ),
  );
});

/**
 * Sends the current settings to the account (signed in), skipping a copy identical to the last one.
 * `complete`: the user saved the settings screen, so setup counts as done.
 */
export function savePreferences({ complete = false }: { complete?: boolean } = {}) {
  const userId = currentUserIdNow();
  if (complete) writeState({ completed: { ...readState().completed, [userId ?? "guest"]: true } });
  if (!userId) return;
  const prefs = snapshotPreferences();
  const serialized = JSON.stringify(prefs);
  if (!complete && serialized === readState().sent) return;
  writeState({ sent: serialized });
  enqueue<PrefsPayload>({ kind: PREFS_OP, owner: userId, payload: { userId, prefs, completed: complete }, dedupeKey: `${PREFS_OP}:${userId}` });
}

// ── Reading ──

/** Puts the account's saved settings on this device. Each part is applied on its own, so one failure doesn't stop the rest. */
async function applyPreferences(prefs: Partial<AppPreferences>) {
  const steps: (() => unknown)[] = [
    () => prefs.location && restoreUserLocation(prefs.location),
    () => prefs.calc && writePrayerCalcSettings(prefs.calc),
    () => prefs.adhan && writeAdhanSettings(prefs.adhan),
    () => typeof prefs.textScale === "number" && setTextScale(prefs.textScale),
    () => typeof prefs.adhkarToast === "boolean" && setAdhkarToastEnabled(prefs.adhkarToast),
    () => prefs.favoriteReciterId !== undefined && onboarding.setFavoriteReciter(prefs.favoriteReciterId),
    () => {
      if (!prefs.reader) return;
      reader.setTheme(prefs.reader.theme);
      reader.setFontStep(prefs.reader.fontStep);
      reader.setTajweed(prefs.reader.tajweed);
      reader.setRiwaya(prefs.reader.riwaya);
    },
    // These may ask for notification permission (once), and the voice downloads its recording.
    async () => {
      if (!prefs.adhkar) return;
      for (const kind of ["morning", "evening", "friday"] as const) {
        if (readAdhkarReminders()[kind].enabled !== prefs.adhkar[kind]) await setAdhkarReminder(kind, prefs.adhkar[kind]);
      }
    },
    async () => typeof prefs.outsideAdhkar === "boolean" && prefs.outsideAdhkar !== readOutsideAdhkarNotifications() && setOutsideAdhkarNotifications(prefs.outsideAdhkar),
    async () => prefs.adhanVoice !== undefined && (await setAdhanVoice(prefs.adhanVoice)),
  ];
  for (const step of steps) {
    try {
      await step();
    } catch {
      // Left as it is on this device; the settings screen shows it.
    }
  }
}

let loading: string | null = null;

/**
 * After sign-in: the account's settings come to this device the first time it signs in here, and the
 * account's "setup done" mark is remembered. With nothing on the account yet, this device's settings
 * are sent up instead.
 */
export async function loadPreferences(userId: string) {
  if (!supabase || loading === userId) return;
  loading = userId;
  try {
    const { data, error } = await supabase.from("user_preferences").select("prefs, completed_at").eq("user_id", userId).maybeSingle();
    if (error) return;
    if (data?.completed_at) writeState({ completed: { ...readState().completed, [userId]: true } });
    if (readState().appliedFor === userId) return;
    if (data?.prefs && Object.keys(data.prefs).length > 0) await applyPreferences(data.prefs as Partial<AppPreferences>);
    writeState({ appliedFor: userId, sent: null });
    // The merged result (the account's, or this device's when the account had none) goes back up.
    savePreferences();
  } finally {
    loading = null;
  }
}
