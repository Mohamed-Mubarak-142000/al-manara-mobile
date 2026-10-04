import { useEffect, useSyncExternalStore } from "react";

import {
  PAGES_PER_DAY_OPTIONS,
  buildJuzPages,
  nextCursor,
  planDay,
  recentRange,
  surahsToPages,
  todayNewRange,
  totalUnits,
  unitsToSegments,
} from "@/core/plan/schedule";
import { buildJuzRanges, type JuzRange } from "@/core/progress/juz";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { recordActivity, scheduleCompletedSurahs } from "@/features/journey/progress";
import { mushafStarts } from "@/features/mushaf/mushaf";
import { supabase } from "@/lib/supabase";

import { resolveSegments, spansToAyahs } from "./portion";
import { loggedOn, type PlanWithLog } from "./types";

/**
 * The memorization plan with the website's rules (features/plan/actions.ts), on the learner's own
 * memorization_plans / memorization_plan_log rows. Ayahs marked memorized go to memorized_ayahs, which
 * (with tasmee sessions) is what opens the juz exams.
 */

export type PlanState = { status: "loading" } | { status: "ready"; current: PlanWithLog | null; learnerId: string } | { status: "guest" };

export interface NewPlan {
  kind: "memorize" | "review";
  startJuz: number;
  endJuz: number;
  unitsPerDay: number;
  farPages: number;
  priorSurahs: number[];
  priorJuz: number[];
  newDays: number[];
  reviewDays: number[];
}

export type PlanResult = { ok: true; message?: string } | { ok: false; error: string };

const GENERIC_ERROR = "تعذّر حفظ الخطة، حاول مرة أخرى.";
const PICK_PRIOR = "اختر السور أو الأجزاء التي تحفظها لنراجعها معك";
const UNIQUE_VIOLATION = "23505";

let state: PlanState = { status: "loading" };
const listeners = new Set<() => void>();
let loadedFor: string | null | undefined;

function set(next: PlanState) {
  state = next;
  listeners.forEach((notify) => notify());
}

async function loadRemote(learnerId: string): Promise<PlanWithLog | null> {
  if (!supabase) return null;
  const { data: plan } = await supabase
    .from("memorization_plans")
    .select("*")
    .eq("learner_id", learnerId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;
  const { data: log } = await supabase
    .from("memorization_plan_log")
    .select("day, kind, from_unit, to_unit")
    .eq("plan_id", plan.id)
    .order("day", { ascending: false })
    .limit(400);
  return { plan, log: log ?? [] };
}

async function refresh(learnerId: string | null) {
  loadedFor = learnerId;
  if (!learnerId) {
    set({ status: "guest" });
    return;
  }
  const current = await loadRemote(learnerId).catch(() => null);
  if (loadedFor === learnerId) set({ status: "ready", current, learnerId });
}

export function usePlan(): PlanState {
  const learnerId = activeLearnerId(useAccount());
  useEffect(() => {
    if (loadedFor !== learnerId) refresh(learnerId);
  }, [learnerId]);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** Marks ayahs memorized on the account (the website's client does the same after a plan step). */
async function markMemorized(learnerId: string, groups: { surah: number; ayahs: number[] }[]) {
  if (!supabase || groups.length === 0) return;
  const rows = groups.flatMap(({ surah, ayahs }) => ayahs.map((ayah) => ({ learner_id: learnerId, surah, ayah })));
  for (let index = 0; index < rows.length; index += 500) {
    await supabase
      .from("memorized_ayahs")
      .upsert(rows.slice(index, index + 500), { onConflict: "learner_id,surah,ayah", ignoreDuplicates: true });
  }
  recordActivity(learnerId);
  await scheduleCompletedSurahs(
    learnerId,
    groups.map((group) => group.surah),
  );
}

/** Every ayah of the given whole surahs and juz, per surah (the website's knownAyahs). */
function knownAyahs(surahs: number[], juz: number[], juzRanges: JuzRange[]): { surah: number; ayahs: number[] }[] {
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

function validate(input: NewPlan): string | null {
  if (!(PAGES_PER_DAY_OPTIONS as readonly number[]).includes(input.unitsPerDay)) return "اختر مقدارًا من القائمة";
  if (input.kind === "memorize") {
    if (input.startJuz > input.endJuz) return "جزء النهاية يأتي بعد جزء البداية";
    if (input.newDays.length === 0) return "اختر يومًا واحدًا على الأقل للحفظ";
  } else {
    if (input.priorSurahs.length === 0 && input.priorJuz.length === 0) return PICK_PRIOR;
    if (input.farPages < 1) return "اختر عدد صفحات المراجعة";
    if (input.reviewDays.length === 0) return "اختر يومًا واحدًا على الأقل للمراجعة";
  }
  return null;
}

function owner(): string | null {
  return state.status === "ready" ? state.learnerId : null;
}

const sorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

export const planActions = {
  async create(input: NewPlan): Promise<PlanResult> {
    const learnerId = owner();
    if (!supabase || !learnerId) return { ok: false, error: "سجّل الدخول أولًا." };
    const problem = validate(input);
    if (problem) return { ok: false, error: problem };
    const priorSurahs = sorted(input.priorSurahs);
    const priorJuz = sorted(input.priorJuz);

    const { pageStarts, juzStarts } = mushafStarts();
    const juzPages = buildJuzPages(juzStarts, pageStarts);
    const range =
      input.kind === "memorize"
        ? { startPage: juzPages[input.startJuz - 1]!.startPage, endPage: juzPages[input.endJuz - 1]!.endPage }
        : null;
    // The plan's own pages come into review as they're memorized, so leave them out of the prior pool.
    const juzPrior = priorJuz.flatMap((juz) => {
      const { startPage, endPage } = juzPages[juz - 1]!;
      return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
    });
    const priorPages = [...new Set([...surahsToPages(pageStarts, priorSurahs, getSurahAyahCount), ...juzPrior])]
      .filter((page) => !range || page < range.startPage || page > range.endPage)
      .sort((a, b) => a - b);
    if (input.kind === "review" && priorPages.length === 0) return { ok: false, error: PICK_PRIOR };

    const { error: archiveError } = await supabase
      .from("memorization_plans")
      .update({ status: "archived" })
      .eq("learner_id", learnerId)
      .neq("status", "archived");
    if (archiveError) return { ok: false, error: GENERIC_ERROR };
    const { error } = await supabase.from("memorization_plans").insert({
      learner_id: learnerId,
      kind: input.kind,
      start_juz: range ? input.startJuz : null,
      end_juz: range ? input.endJuz : null,
      start_page: range?.startPage ?? null,
      end_page: range?.endPage ?? null,
      units_per_day: input.unitsPerDay,
      far_review_pages: input.farPages,
      prior_surahs: priorSurahs,
      prior_juz: priorJuz,
      prior_pages: priorPages,
      new_days: input.kind === "memorize" ? sorted(input.newDays) : [],
      review_days: sorted(input.reviewDays),
    });
    if (error) return { ok: false, error: GENERIC_ERROR };
    await markMemorized(learnerId, knownAyahs(priorSurahs, priorJuz, buildJuzRanges(juzStarts)));
    await refresh(learnerId);
    return { ok: true, message: "أُنشئت خطتك، بالتوفيق!" };
  },

  /** Marks today's new portion memorized and moves the plan forward. Safe to press twice. */
  async completeNew(): Promise<PlanResult> {
    const learnerId = owner();
    if (!supabase || !learnerId || state.status !== "ready" || !state.current) return { ok: false, error: "لا توجد خطة نشطة." };
    const { plan, log } = state.current;
    if (plan.status !== "active") return { ok: false, error: "لا توجد خطة نشطة." };
    const today = planDay();
    if (loggedOn(log, today, "new")) return { ok: true };
    const range = plan.kind === "memorize" ? todayNewRange(plan, null) : null;
    if (!range || plan.start_juz === null || plan.end_juz === null) return { ok: true };
    const segments = resolveSegments(unitsToSegments(plan, range), { start: plan.start_juz, end: plan.end_juz });

    const { error: logError } = await supabase
      .from("memorization_plan_log")
      .insert({ plan_id: plan.id, learner_id: learnerId, day: today, kind: "new", from_unit: range.from, to_unit: range.to });
    if (logError && logError.code !== UNIQUE_VIOLATION) return { ok: false, error: GENERIC_ERROR };
    if (!logError) {
      const finished = range.to >= totalUnits(plan);
      const { error } = await supabase
        .from("memorization_plans")
        .update({ progress_units: range.to, ...(finished && { status: "completed" as const, completed_at: new Date().toISOString() }) })
        .eq("id", plan.id)
        .eq("progress_units", range.from);
      if (error) return { ok: false, error: GENERIC_ERROR };
      await markMemorized(learnerId, spansToAyahs(segments));
    }
    await refresh(learnerId);
    return { ok: true };
  },

  /** Marks today's review done and rotates the older-pages slice. */
  async completeReview(): Promise<PlanResult> {
    const learnerId = owner();
    if (!supabase || !learnerId || state.status !== "ready" || !state.current) return { ok: false, error: "لا توجد خطة نشطة." };
    const { plan, log } = state.current;
    if (plan.status !== "active") return { ok: false, error: "لا توجد خطة نشطة." };
    const today = planDay();
    if (loggedOn(log, today, "review")) return { ok: true };
    const anchor = loggedOn(log, today, "new")?.from ?? plan.progress_units;
    const cursor = nextCursor(plan, recentRange(plan, anchor).from, plan.review_cursor);
    // For review rows: from_unit = the older-pages cursor and to_unit = the recent window's anchor.
    const { error: logError } = await supabase
      .from("memorization_plan_log")
      .insert({ plan_id: plan.id, learner_id: learnerId, day: today, kind: "review", from_unit: plan.review_cursor, to_unit: anchor });
    if (logError && logError.code !== UNIQUE_VIOLATION) return { ok: false, error: GENERIC_ERROR };
    if (!logError) {
      const { error } = await supabase.from("memorization_plans").update({ review_cursor: cursor }).eq("id", plan.id);
      if (error) return { ok: false, error: GENERIC_ERROR };
    }
    await refresh(learnerId);
    return { ok: true };
  },

  async archive(): Promise<PlanResult> {
    const learnerId = owner();
    if (!supabase || !learnerId) return { ok: false, error: "سجّل الدخول أولًا." };
    const { error } = await supabase
      .from("memorization_plans")
      .update({ status: "archived" })
      .eq("learner_id", learnerId)
      .neq("status", "archived");
    if (error) return { ok: false, error: GENERIC_ERROR };
    await refresh(learnerId);
    return { ok: true };
  },
};
