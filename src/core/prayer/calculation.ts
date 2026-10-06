// App-only (not on the website): the user's prayer-time calculation settings, shared by the
// aladhan request and the on-device calculation so both give the same times.
import type { PrayerKey } from "./prayerTimesApi";

/** adhan-js names; each maps to an aladhan `method` id below. */
export type CalcMethodId =
  | "Egyptian"
  | "UmmAlQura"
  | "MuslimWorldLeague"
  | "NorthAmerica"
  | "Karachi"
  | "Dubai"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Turkey";

export type AsrMadhab = "shafi" | "hanafi";

export type PrayerOffsets = Record<PrayerKey, number>;

export interface PrayerCalcSettings {
  method: CalcMethodId;
  /** Asr: the majority (shadow = 1×) or Hanafi (2×). */
  madhab: AsrMadhab;
  /** Minutes added to each computed time, −30…+30. */
  offsets: PrayerOffsets;
}

export interface CalcMethodInfo {
  id: CalcMethodId;
  label: string;
  /** aladhan.com `method` parameter. */
  aladhanId: number;
}

export const CALC_METHODS: readonly CalcMethodInfo[] = [
  { id: "Egyptian", label: "الهيئة المصرية العامة للمساحة", aladhanId: 5 },
  { id: "UmmAlQura", label: "أم القرى (مكة المكرمة)", aladhanId: 4 },
  { id: "MuslimWorldLeague", label: "رابطة العالم الإسلامي", aladhanId: 3 },
  { id: "NorthAmerica", label: "الجمعية الإسلامية لأمريكا الشمالية (ISNA)", aladhanId: 2 },
  { id: "Karachi", label: "جامعة العلوم الإسلامية بكراتشي", aladhanId: 1 },
  { id: "Dubai", label: "دبي", aladhanId: 16 },
  { id: "Kuwait", label: "الكويت", aladhanId: 9 },
  { id: "Qatar", label: "قطر", aladhanId: 10 },
  { id: "Singapore", label: "سنغافورة", aladhanId: 11 },
  { id: "Turkey", label: "رئاسة الشؤون الدينية التركية", aladhanId: 13 },
];

export const MADHAB_LABELS: Record<AsrMadhab, string> = {
  shafi: "الجمهور (شافعي، مالكي، حنبلي)",
  hanafi: "حنفي",
};

export const OFFSET_LIMIT = 30;

/** Minutes before Fajr that imsak is announced in Ramadan (as on Egyptian Ramadan calendars). */
export const IMSAK_MINUTES = 10;

export const ZERO_OFFSETS: PrayerOffsets = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };

export const DEFAULT_CALC_SETTINGS: PrayerCalcSettings = { method: "Egyptian", madhab: "shafi", offsets: ZERO_OFFSETS };

/** Device storage key the app (and the headless widget task) read the settings from. */
export const PRAYER_CALC_STORAGE_KEY = "al-manara:prayer-calc:v1";

export function calcMethodInfo(id: CalcMethodId): CalcMethodInfo {
  return CALC_METHODS.find((method) => method.id === id) ?? CALC_METHODS[0]!;
}

function clampOffset(value: unknown): number {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, number)) : 0;
}

/** Whatever was saved (or nothing) → valid settings. */
export function normalizeCalcSettings(raw: unknown): PrayerCalcSettings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<PrayerCalcSettings>;
  const method = CALC_METHODS.some((entry) => entry.id === value.method) ? value.method! : DEFAULT_CALC_SETTINGS.method;
  const madhab: AsrMadhab = value.madhab === "hanafi" ? "hanafi" : "shafi";
  const saved = (value.offsets ?? {}) as Partial<PrayerOffsets>;
  const offsets = Object.fromEntries((Object.keys(ZERO_OFFSETS) as PrayerKey[]).map((key) => [key, clampOffset(saved[key] ?? 0)])) as PrayerOffsets;
  return { method, madhab, offsets };
}

/** A stable string for cache and effect keys. */
export function calcSettingsKey(settings: PrayerCalcSettings): string {
  const { offsets } = settings;
  return `${settings.method}|${settings.madhab}|${offsets.fajr},${offsets.sunrise},${offsets.dhuhr},${offsets.asr},${offsets.maghrib},${offsets.isha}`;
}

/** aladhan query parameters: `method`, `school` (1 = Hanafi) and `tune` (Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight). */
export function aladhanParams(settings: PrayerCalcSettings): string {
  const { offsets } = settings;
  const method = `method=${calcMethodInfo(settings.method).aladhanId}`;
  const school = settings.madhab === "hanafi" ? "&school=1" : "";
  // Untuned requests keep the exact URL older builds cached, so those stay usable offline.
  if (!Object.values(offsets).some(Boolean)) return method + school;
  const tune = [0, offsets.fajr, offsets.sunrise, offsets.dhuhr, offsets.asr, offsets.maghrib, 0, offsets.isha, 0].join(",");
  return `${method}${school}&tune=${tune}`;
}

/** "HH:mm" shifted by some minutes, wrapping round midnight. */
export function shiftClock(hhmm: string, minutes: number): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
