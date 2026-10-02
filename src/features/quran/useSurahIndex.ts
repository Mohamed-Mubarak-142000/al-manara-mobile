import { useEffect, useState } from "react";

import { getSurahs } from "@/core/quran/api";
import { getQuranMeta } from "@/core/quran/textApi";

export interface SurahEntry {
  number: number;
  name: string;
  ayahCount: number;
  meccan: boolean;
  juzStart: number;
}

let memory: SurahEntry[] | null = null;

/** The 114 surahs with their names and metadata, joined from the two cached sources the website uses. */
export function useSurahIndex(): { surahs: SurahEntry[] | null; failed: boolean; reload: () => void } {
  const [surahs, setSurahs] = useState<SurahEntry[] | null>(memory);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (memory && attempt === 0) return;
    let cancelled = false;
    Promise.all([getSurahs(), getQuranMeta()]).then(([names, meta]) => {
      if (cancelled) return;
      if (names.length === 0 || meta.length === 0) {
        setFailed(true);
        return;
      }
      const byNumber = new Map(names.map((surah) => [surah.id, surah.name]));
      memory = meta.map((entry) => ({ ...entry, name: byNumber.get(entry.number) ?? String(entry.number) }));
      setSurahs(memory);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return {
    surahs,
    failed,
    reload: () => {
      setFailed(false);
      setAttempt((value) => value + 1);
    },
  };
}
