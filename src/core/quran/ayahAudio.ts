// Ported from eslam-platform/src/features/quran/ayahAudio.ts — keep in sync by hand.
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
