import { buildJuzRanges, type JuzRange } from "@/core/progress/juz";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import { scheduleCompletedSurahs } from "@/features/journey/progress";
import { mushafStarts } from "@/features/mushaf/mushaf";
import { registerHandler, throwIfError as check } from "@/lib/outbox";
import { supabase } from "@/lib/supabase";

import type { AyahGroup, PlanOp } from "./reducer";

/**
 * Sends a plan step to the account, with the website's rules (features/plan/actions.ts). Safe to run
 * twice: rows carry their client id or primary key and are inserted with "ignore duplicates", and the
 * progress/cursor updates only apply from the value the step started at.
 */

export const PLAN_OP = "plan";

export type PlanSyncPayload = PlanOp & { learnerId: string; createdAt?: string };

/** Every ayah of the given whole surahs and juz, per surah (the website's knownAyahs). */
export function knownAyahs(surahs: number[], juz: number[], juzRanges: JuzRange[]): AyahGroup[] {
  const bySurah = new Map<number, Set<number>>();
  const add = (surah: number, from: number, to: number) => {
    const set = bySurah.get(surah) ?? new Set<number>();
    for (let ayah = from; ayah <= to; ayah++) set.add(ayah);
    bySurah.set(surah, set);
  };
  for (const surah of surahs) add(surah, 1, getSurahAyahCount(surah));
  for (const segment of juz.flatMap((number) => juzRanges[number - 1]?.segments ?? [])) add(segment.surah, segment.from, segment.to);
  return [...bySurah].map(([surah, set]) => ({ surah, ayahs: [...set].sort((a, b) => a - b) }));
}

/** Marks ayahs memorized on the account (the website's client does the same after a plan step). */
async function markMemorized(learnerId: string, groups: AyahGroup[]) {
  if (!supabase || groups.length === 0) return;
  const rows = groups.flatMap(({ surah, ayahs }) => ayahs.map((ayah) => ({ learner_id: learnerId, surah, ayah })));
  for (let index = 0; index < rows.length; index += 500) {
    check(
      await supabase
        .from("memorized_ayahs")
        .upsert(rows.slice(index, index + 500), { onConflict: "learner_id,surah,ayah", ignoreDuplicates: true }),
    );
  }
  await scheduleCompletedSurahs(
    learnerId,
    groups.map((group) => group.surah),
  );
}

export async function sendPlanOp(payload: PlanSyncPayload) {
  if (!supabase) return;
  const { learnerId } = payload;
  switch (payload.type) {
    case "create": {
      const { id, kind, start_juz, end_juz, start_page, end_page, units_per_day, far_review_pages } = payload.row;
      const { prior_surahs, prior_juz, prior_pages, new_days, review_days, created_at } = payload.row;
      check(
        await supabase
          .from("memorization_plans")
          .update({ status: "archived" })
          .eq("learner_id", learnerId)
          .neq("status", "archived")
          .neq("id", id),
      );
      check(
        await supabase.from("memorization_plans").upsert(
          {
            id,
            learner_id: learnerId,
            kind,
            start_juz,
            end_juz,
            start_page,
            end_page,
            units_per_day,
            far_review_pages,
            prior_surahs,
            prior_juz,
            prior_pages,
            new_days,
            review_days,
            created_at,
          },
          { onConflict: "id", ignoreDuplicates: true },
        ),
      );
      await markMemorized(learnerId, knownAyahs(prior_surahs, prior_juz, buildJuzRanges(mushafStarts().juzStarts)));
      return;
    }
    case "completeNew": {
      check(
        await supabase
          .from("memorization_plan_log")
          .upsert(
            { plan_id: payload.planId, learner_id: learnerId, day: payload.day, kind: "new", from_unit: payload.from, to_unit: payload.to },
            { onConflict: "plan_id,day,kind", ignoreDuplicates: true },
          ),
      );
      check(
        await supabase
          .from("memorization_plans")
          .update({ progress_units: payload.to, ...(payload.finished && { status: "completed" as const, completed_at: payload.at }) })
          .eq("id", payload.planId)
          .eq("progress_units", payload.from),
      );
      await markMemorized(learnerId, payload.ayahs);
      return;
    }
    case "completeReview": {
      check(
        await supabase.from("memorization_plan_log").upsert(
          {
            plan_id: payload.planId,
            learner_id: learnerId,
            day: payload.day,
            kind: "review",
            from_unit: payload.from,
            to_unit: payload.to,
          },
          { onConflict: "plan_id,day,kind", ignoreDuplicates: true },
        ),
      );
      check(
        await supabase
          .from("memorization_plans")
          .update({ review_cursor: payload.cursor })
          .eq("id", payload.planId)
          .eq("review_cursor", payload.from),
      );
      return;
    }
    case "archive": {
      let query = supabase.from("memorization_plans").update({ status: "archived" }).eq("learner_id", learnerId).neq("status", "archived");
      query = payload.createdAt ? query.lte("created_at", payload.createdAt) : query.eq("id", payload.planId);
      check(await query);
      return;
    }
  }
}

registerHandler<PlanSyncPayload>(PLAN_OP, sendPlanOp);
