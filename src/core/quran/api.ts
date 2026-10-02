// Ported from eslam-platform/src/features/quran/api.ts — keep in sync by hand; Next-only caching swapped for cachedFetch.
import { cachedFetch } from "@/core/http";
import { EXTRA_RECITERS } from "./extraReciters";

export interface Moshaf {
  id: number;
  name: string;
  rewayaId: number;
  moshafType: number;
  server: string;
  surahList: number[];
  /** Per-surah file paths under `server`, for sources without the NNN.mp3 layout. */
  files?: Record<number, string>;
}

export interface Reciter {
  id: number;
  name: string;
  letter: string;
  moshaf: Moshaf[];
}

export interface Surah {
  id: number;
  name: string;
  meccan: boolean;
}

export interface Riwaya {
  id: number;
  name: string;
}

interface RawMoshaf {
  id: number;
  name: string;
  rewaya_id: number;
  server: string;
  surah_total: number;
  moshaf_type: number;
  surah_list: string;
}

interface RawReciter {
  id: number;
  name: string;
  letter: string;
  moshaf: RawMoshaf[];
}

interface RawSurah {
  id: number;
  name: string;
  makkia: number;
}

interface RawRiwaya {
  id: number;
  name: string;
}

const RECITERS_URL = "https://www.mp3quran.net/api/v3/reciters?language=ar";
const SUWAR_URL = "https://www.mp3quran.net/api/v3/suwar";
const RIWAYAT_URL = "https://www.mp3quran.net/api/v3/riwayat";
const REVALIDATE_SECONDS = 86400;

function parseSurahList(value: string): number[] {
  return value
    .split(",")
    .map((entry) => Number.parseInt(entry, 10))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export async function getReciters(): Promise<Reciter[]> {
  return [...(await getMp3QuranReciters()), ...EXTRA_RECITERS];
}

async function getMp3QuranReciters(): Promise<Reciter[]> {
  try {
    const response = await cachedFetch(RECITERS_URL, REVALIDATE_SECONDS);
    if (!response.ok) return [];
    const data = (await response.json()) as { reciters: RawReciter[] };
    return data.reciters.map((reciter) => ({
      id: reciter.id,
      name: reciter.name,
      letter: reciter.letter,
      moshaf: reciter.moshaf.map((moshaf) => ({
        id: moshaf.id,
        name: moshaf.name,
        rewayaId: moshaf.rewaya_id,
        moshafType: moshaf.moshaf_type,
        server: moshaf.server,
        surahList: parseSurahList(moshaf.surah_list),
      })),
    }));
  } catch {
    return [];
  }
}

export async function getSurahs(): Promise<Surah[]> {
  try {
    const response = await cachedFetch(SUWAR_URL, REVALIDATE_SECONDS);
    if (!response.ok) return [];
    const data = (await response.json()) as { suwar: RawSurah[] };
    return data.suwar.map((surah) => ({ id: surah.id, name: surah.name, meccan: surah.makkia === 1 }));
  } catch {
    return [];
  }
}

export async function getRiwayat(): Promise<Riwaya[]> {
  try {
    const response = await cachedFetch(RIWAYAT_URL, REVALIDATE_SECONDS);
    if (!response.ok) return [];
    const data = (await response.json()) as { riwayat: RawRiwaya[] };
    return data.riwayat.map((riwaya) => ({ id: riwaya.id, name: riwaya.name }));
  } catch {
    return [];
  }
}

export function buildSurahAudioUrl(moshaf: Pick<Moshaf, "server" | "files">, surahId: number): string {
  return `${moshaf.server}${moshaf.files?.[surahId] ?? `${String(surahId).padStart(3, "0")}.mp3`}`;
}

export const TEACHING_MOSHAF_TYPE = 213;

export function getKidsReciters(reciters: Reciter[]): Reciter[] {
  return reciters
    .map((reciter) => ({ ...reciter, moshaf: reciter.moshaf.filter((moshaf) => moshaf.moshafType === TEACHING_MOSHAF_TYPE) }))
    .filter((reciter) => reciter.moshaf.length > 0);
}
