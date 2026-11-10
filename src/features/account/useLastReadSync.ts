import { useEffect, useRef } from "react";

import { recordActivity } from "@/features/journey/progress";
import { getSurah } from "@/features/mushaf/mushaf";
import { reader, useReaderState } from "@/features/mushaf/readerPrefs";
import { enqueue, registerHandler, throwIfError } from "@/lib/outbox";
import { supabase } from "@/lib/supabase";

import { activeLearnerId, currentUserIdNow, useAccount } from "./accountStore";

const PUSH_DELAY_MS = 1500;
const READING_POSITION_OP = "reading-position";

interface ReadingPositionRow {
  learner_id: string;
  surah: number;
  surah_name: string;
  page: number;
  updated_at: string;
}

registerHandler<ReadingPositionRow>(READING_POSITION_OP, async (row) => {
  if (!supabase) return;
  throwIfError(await supabase.from("reading_position").upsert(row, { onConflict: "learner_id" }));
});

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
    const timer = setTimeout(() => {
      const owner = currentUserIdNow();
      if (!owner) return;
      lastPushed.current = lastRead.at;
      recordActivity(learnerId);
      // Through the outbox, keyed per learner: offline page turns collapse into the newest one, which is
      // sent (and retried) once there is a connection instead of being dropped.
      enqueue<ReadingPositionRow>({
        kind: READING_POSITION_OP,
        owner,
        dedupeKey: `${READING_POSITION_OP}:${learnerId}`,
        payload: {
          learner_id: learnerId,
          surah: lastRead.surah,
          surah_name: getSurah(lastRead.surah)?.name ?? "",
          page: lastRead.page,
          updated_at: new Date(lastRead.at).toISOString(),
        },
      });
    }, PUSH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [learnerId, lastRead]);
}
