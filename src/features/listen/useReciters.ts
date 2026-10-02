import { useEffect, useState } from "react";

import { getReciters, getRiwayat, type Reciter } from "@/core/quran/api";

let memory: { reciters: Reciter[]; riwayat: Map<number, string> } | null = null;

/** All reciters plus the riwaya names their mushafs refer to. Cached for the session and on disk. */
export function useReciters() {
  const [data, setData] = useState(memory);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (memory && attempt === 0) return;
    let cancelled = false;
    Promise.all([getReciters(), getRiwayat()]).then(([reciters, riwayat]) => {
      if (cancelled) return;
      if (!reciters.length) {
        setFailed(true);
        return;
      }
      memory = { reciters, riwayat: new Map(riwayat.map((riwaya) => [riwaya.id, riwaya.name])) };
      setData(memory);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return {
    reciters: data?.reciters ?? null,
    riwayat: data?.riwayat ?? new Map<number, string>(),
    failed,
    reload: () => {
      setFailed(false);
      setAttempt((value) => value + 1);
    },
  };
}
