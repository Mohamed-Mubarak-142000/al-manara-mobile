// Ported from eslam-platform/src/features/quran/ayahAudio.ts — keep in sync by hand.
import { getSurahAyahCount } from "./surahAyahCounts";

const ISLAMIC_NETWORK = "https://cdn.islamic.network/quran/audio/128";
const EVERYAYAH = "https://everyayah.com/data";

function pad3(value: number): string {
  return String(value).padStart(3, "0");
}

/** Husary, murattal, ayah by ayah (global ayah number 1..6236). */
export function husaryAyahUrl(globalAyahNumber: number): string {
  return `${ISLAMIC_NETWORK}/ar.husary/${globalAyahNumber}.mp3`;
}

/** Husary "Muallim" teaching edition: recites, then leaves room for the learner to repeat. */
export function husaryMuallimAyahUrl(surah: number, ayahInSurah: number): string {
  return `${EVERYAYAH}/Husary_Muallim_128kbps/${pad3(surah)}${pad3(ayahInSurah)}.mp3`;
}

export function alafasyAyahUrl(globalAyahNumber: number): string {
  return `${ISLAMIC_NETWORK}/ar.alafasy/${globalAyahNumber}.mp3`;
}

// ---------------------------------------------------------------------------------------------
// App-only below (not on the website): one entry point for the ayah-by-ayah voices, so offline
// packs and the screens build the same URLs.


export type AyahVoice = "husary" | "muallim" | "alafasy";

export const AYAH_VOICES: Record<AyahVoice, { label: string }> = {
  husary: { label: "الحصري" },
  muallim: { label: "الحصري المعلّم" },
  alafasy: { label: "العفاسي" },
};

/** Global ayah number (1..6236) of `ayah` in `surah`, or 0 when out of range. */
export function globalAyahNumber(surah: number, ayah: number): number {
  if (surah < 1 || surah > 114 || ayah < 1 || ayah > getSurahAyahCount(surah)) return 0;
  let before = 0;
  for (let id = 1; id < surah; id += 1) before += getSurahAyahCount(id);
  return before + ayah;
}

/** The surah and ayah of a global ayah number (1..6236), or null when out of range. */
export function ayahOfGlobal(global: number): { surah: number; ayah: number } | null {
  if (!Number.isInteger(global) || global < 1) return null;
  let left = global;
  for (let surah = 1; surah <= 114; surah += 1) {
    const count = getSurahAyahCount(surah);
    if (left <= count) return { surah, ayah: left };
    left -= count;
  }
  return null;
}

/** The voice, surah and ayah behind a URL built by `remoteAyahUrl`, or null for any other URL. */
export function parseRemoteAyahUrl(url: string): { voice: AyahVoice; surah: number; ayah: number } | null {
  const muallim = /^https:\/\/everyayah\.com\/data\/Husary_Muallim_128kbps\/(\d{3})(\d{3})\.mp3$/.exec(url);
  if (muallim) {
    const surah = Number(muallim[1]);
    const ayah = Number(muallim[2]);
    return globalAyahNumber(surah, ayah) ? { voice: "muallim", surah, ayah } : null;
  }
  const network = /^https:\/\/cdn\.islamic\.network\/quran\/audio\/128\/ar\.(husary|alafasy)\/(\d+)\.mp3$/.exec(url);
  const place = network ? ayahOfGlobal(Number(network[2])) : null;
  return network && place ? { voice: network[1] as AyahVoice, ...place } : null;
}

/** The streaming URL of one ayah in one voice. */
export function remoteAyahUrl(voice: AyahVoice, surah: number, ayah: number): string {
  if (voice === "muallim") return husaryMuallimAyahUrl(surah, ayah);
  const id = globalAyahNumber(surah, ayah);
  return voice === "alafasy" ? alafasyAyahUrl(id) : husaryAyahUrl(id);
}
