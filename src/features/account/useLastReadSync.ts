import { useEffect, useRef } from "react";

import { getSurah } from "@/features/mushaf/mushaf";
import { reader, useReaderState } from "@/features/mushaf/readerPrefs";
import { supabase } from "@/lib/supabase";

import { activeLearnerId, useAccount } from "./accountStore";

const PUSH_DELAY_MS = 1500;

/**
 * The website's LastReadSync: "continue reading" follows the signed-in learner between the app and
 * the website, through the same reading_position row. Newest position wins.
 */
export function useLastReadSync() {
  const learnerId = activeLearnerId(useAccount());
  const { lastRead } = useReaderState();
  const pulledFor = useRef<string | null>(null);
  const lastPushed = useRef<number>(0);

  useEffect(() => {
    if (!supabase || !learnerId || pulledFor.current === learnerId) return;
    pulledFor.current = learnerId;
    supabase
      .from("reading_position")
      .select("surah, page, updated_at")
      .eq("learner_id", learnerId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const remoteAt = Date.parse(data.updated_at);
        const local = reader.current().lastRead;
        if (!local || remoteAt > local.at) {
          lastPushed.current = remoteAt;
          reader.applyLastRead({ page: data.page, surah: data.surah, ayah: 1, at: remoteAt });
        }
      });
  }, [learnerId]);

  useEffect(() => {
    if (!supabase || !learnerId || !lastRead || lastRead.at === lastPushed.current) return;
    const client = supabase;
    const timer = setTimeout(() => {
      lastPushed.current = lastRead.at;
      client
        .from("reading_position")
        .upsert(
          {
            learner_id: learnerId,
            surah: lastRead.surah,
            surah_name: getSurah(lastRead.surah)?.name ?? "",
            page: lastRead.page,
            updated_at: new Date(lastRead.at).toISOString(),
          },
          { onConflict: "learner_id" },
        )
        .then(() => {});
    }, PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [learnerId, lastRead]);
}
