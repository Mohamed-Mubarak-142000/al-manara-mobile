import type { RuqyahPassage } from "@/core/ruqyah/ruqyahData";
import { toArabicDigits } from "@/core/text/arabic";
import type { Track } from "@/features/audio/playerStore";
import { ayahSource } from "@/features/downloads/ayahPacks";

/** "ruqyah-<passage>-<round>-<ayah>": the passage and ayah a ruqyah track recites. */
export const RUQYAH_PREFIX = "ruqyah-";

/** One Alafasy track per ayah, the passage read `repeat` times over (the website's passageTracks). */
export function passageTracks(passage: RuqyahPassage): Track[] {
  return Array.from({ length: passage.repeat ?? 1 }, (_, round) =>
    passage.ayahs.map((ayah) => ({
      id: `${RUQYAH_PREFIX}${passage.id}-${round}-${ayah.numberInSurah}`,
      title: `${passage.title} — الآية ${toArabicDigits(ayah.numberInSurah)}`,
      artist: "الرقية الشرعية — مشاري العفاسي",
      // A saved Alafasy pack plays from the device, the stream as backup.
      ...ayahSource("alafasy", passage.surah, ayah.numberInSurah),
    })),
  ).flat();
}

/** Whether a track id belongs to this passage (ids of other passages never share the prefix). */
export function isPassageTrack(trackId: string | null, passage: RuqyahPassage): boolean {
  return (
    trackId?.startsWith(`${RUQYAH_PREFIX}${passage.id}-`) === true &&
    /^\d+-\d+$/.test(trackId.slice(RUQYAH_PREFIX.length + passage.id.length + 1))
  );
}
