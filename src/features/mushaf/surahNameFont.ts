import * as Font from "expo-font";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useSyncExternalStore } from "react";

/*
 * quran.com's surah-name font (the calligraphic «سورة …» headers it and QUL use), fetched once from
 * its CDN and kept on the device beside the printed pages' fonts. It isn't bundled: the font carries
 * no licence statement, so it is used as the page fonts are, from quran.com. Until it loads (or
 * offline on a first run) the header draws the name in the Hafs face instead.
 */

const URL = "https://static.qurancdn.com/fonts/quran/surah-names/v1/sura_names.ttf";
export const SURAH_NAME_FAMILY = "QCF_SurahNames";
const MIN_BYTES = 50_000;

let ready = Font.isLoaded(SURAH_NAME_FAMILY);
let loading: Promise<void> | null = null;
/** After a failure (offline), wait this long before asking again, not on every page turned. */
const RETRY_MS = 60_000;
let failedAt = 0;
const listeners = new Set<() => void>();

async function load() {
  const dir = new Directory(Paths.document, "mushaf-glyphs");
  if (!dir.exists) dir.create({ intermediates: true });
  const file = new File(dir, "sura_names.ttf");
  if (!file.exists || (file.size ?? 0) < MIN_BYTES) {
    const part = new File(dir, "sura_names.part");
    if (part.exists) part.delete();
    const downloaded = await File.downloadFileAsync(URL, part);
    if ((downloaded.size ?? 0) < MIN_BYTES) {
      part.delete();
      throw new Error("not a font");
    }
    if (file.exists) file.delete();
    part.rename(file.name);
  }
  await Font.loadAsync({ [SURAH_NAME_FAMILY]: { uri: new File(dir, "sura_names.ttf").uri } });
  ready = true;
  listeners.forEach((listener) => listener());
}

/** Whether the surah-name font can be used; asks for it once per session (again after a failure). */
export function useSurahNameFont(): boolean {
  useEffect(() => {
    if (ready || loading || Date.now() - failedAt < RETRY_MS) return;
    loading = load()
      .catch(() => {
        failedAt = Date.now();
      })
      .finally(() => {
        loading = null;
      });
  }, []);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => ready,
  );
}
