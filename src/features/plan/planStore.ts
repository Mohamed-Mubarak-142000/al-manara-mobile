import * as Crypto from "expo-crypto";
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
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import { activeLearnerId, activeLearnerIdNow, currentUserIdNow, useAccount } from "@/features/account/accountStore";
import { recordActivity } from "@/features/journey/progress";
import { mushafStarts } from "@/features/mushaf/mushaf";
import type { MemorizationPlanRow } from "@/lib/database.types";
import { enqueue, onDrained, onSettled, pendingOps, readOwned, writeOwned } from "@/lib/outbox";
import { track } from "@/lib/telemetry";
import { supabase } from "@/lib/supabase";

import { resolveSegments, spansToAyahs } from "./portion";
import { rebasePlan, reducePlan, type PlanOp, type PlanSnapshot } from "./reducer";
import { PLAN_OP, type PlanSyncPayload } from "./sync";
import { loggedOn, type PlanWithLog } from "./types";

/**
 * The memorization plan with the website's rules (features/plan/actions.ts), on the learner's own
 * memorization_plans / memorization_plan_log rows. Ayahs marked memorized go to memorized_ayahs, which
 * (with tasmee sessions) is what opens the juz exams.
 *
 * Local-first like the khatma: steps apply on the device and sync through the outbox; what's shown is
 * the last server state seen (cached per learner) with the waiting steps replayed on top.
 */

export type PlanState =
  | { status: "loading" }
  | { status: "ready"; current: PlanWithLog | null; learnerId: string }
  | { status: "guest" }
  /** Never loaded on this device and the server can't be reached: we don't know yet. */
  | { status: "unavailable"; learnerId: string };

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

const PICK_PRIOR = "اختر السور أو الأجزاء التي تحفظها لنراجعها معك";
const NO_PLAN = "لا توجد خطة نشطة.";
const SIGN_IN_FIRST = "سجّل الدخول أولًا.";
const snapshotKey = (learnerId: string) => `al-manara:plan:snap:v1:${learnerId}`;

let state: PlanState = { status: "loading" };
const listeners = new Set<() => void>();
/** Whose plan the screens show: a learner id, null for the guest, undefined before the first load. */
let viewing: string | null | undefined;
/** Bumped whenever a step leaves the outbox, so a load that raced it is redone. */
let settledSeq = 0;

function set(next: PlanState) {
  state = next;
  listeners.forEach((notify) => notify());
}

/** Throws when the server can't be reached, so a failed load never reads as "no plan". */
async function loadRemote(learnerId: string): Promise<PlanSnapshot> {
  if (!supabase) throw new Error("no backend");
  const { data: plan, error } = await supabase
    .from("memorization_plans")
    .select("*")
    .eq("learner_id", learnerId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!plan) return null;
  const log = await supabase
    .from("memorization_plan_log")
    .select("day, kind, from_unit, to_unit")
    .eq("plan_id", plan.id)
    .order("day", { ascending: false })
    .limit(400);
  if (log.error) throw log.error;
  return { plan, log: log.data ?? [] };
}

/** The last server state seen per learner; `{ current: null }` means "known: no plan". */
const bases = new Map<string, { current: PlanSnapshot }>();

function baseFor(learnerId: string): { current: PlanSnapshot } | null {
  const cached = bases.get(learnerId) ?? readOwned<{ current: PlanSnapshot }>(snapshotKey(learnerId));
  if (cached) bases.set(learnerId, cached);
  return cached;
}

function saveBase(learnerId: string, current: PlanSnapshot) {
  const entry = { current };
  bases.set(learnerId, entry);
  writeOwned(snapshotKey(learnerId), entry);
}

function pendingFor(learnerId: string): PlanOp[] {
  return pendingOps()
    .filter((op) => op.kind === PLAN_OP && (op.payload as PlanSyncPayload).learnerId === learnerId)
    .map((op) => op.payload as PlanSyncPayload);
}

/** The server's plan with the waiting steps on top; undefined when nothing is known yet. */
function displayed(learnerId: string): PlanSnapshot | undefined {
  const base = baseFor(learnerId);
  const pending = pendingFor(learnerId);
  if (!base && pending.length === 0) return undefined;
  return rebasePlan(base?.current ?? null, pending);
}

function publish(learnerId: string, failed = false) {
  if (viewing !== learnerId) return;
  const shown = displayed(learnerId);
  if (shown !== undefined) set({ status: "ready", current: shown, learnerId });
  else set(failed ? { status: "unavailable", learnerId } : { status: "loading" });
}

async function refresh(learnerId: string | null): Promise<void> {
  viewing = learnerId;
  if (!learnerId) {
    set({ status: "guest" });
    return;
  }
  publish(learnerId);
  const seq = settledSeq;
  try {
    const remote = await loadRemote(learnerId);
    // A step reached the server while this was loading; the answer may predate it.
    if (seq !== settledSeq) return refresh(learnerId);
    saveBase(learnerId, remote);
    publish(learnerId);
  } catch {
    // Offline or the server failed: keep showing what this device knows.
    publish(learnerId, true);
  }
}

onSettled((op, outcome) => {
  if (op.kind !== PLAN_OP) return;
  settledSeq += 1;
  const payload = op.payload as PlanSyncPayload;
  const base = baseFor(payload.learnerId);
  // Confirmed: it's part of the server's state now. Rejected: it just disappears from the view.
  if (outcome === "done" && base) saveBase(payload.learnerId, reducePlan(base.current, payload));
  publish(payload.learnerId);
});

onDrained(() => {
  if (viewing) void refresh(viewing);
});

export function usePlan(): PlanState {
  const learnerId = activeLearnerId(useAccount());
  useEffect(() => {
    if (viewing !== learnerId) void refresh(learnerId);
  }, [learnerId]);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

/** Reloads the signed-in learner's plan from the server (e.g. a "retry" button). */
export function reloadPlan() {
  return refresh(activeLearnerIdNow());
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

interface Actor {
  learnerId: string;
  userId: string;
}

/** The signed-in learner and the account that owns their sync, or null (plans need an account). */
function actor(): Actor | null {
  const learnerId = activeLearnerIdNow();
  const userId = currentUserIdNow();
  return supabase && learnerId && userId ? { learnerId, userId } : null;
}

function apply(op: PlanOp, who: Actor) {
  const createdAt = op.type === "archive" ? (displayed(who.learnerId)?.plan.created_at ?? undefined) : undefined;
  enqueue<PlanSyncPayload>({ kind: PLAN_OP, owner: who.userId, payload: { ...op, learnerId: who.learnerId, createdAt } });
  // Shown at once if it's on screen; otherwise the next load replays it from the outbox.
  publish(who.learnerId);
}

/** The running plan of the signed-in learner, or null. */
function activePlan(who: Actor): PlanWithLog | null {
  const current = displayed(who.learnerId);
  return current && current.plan.status === "active" ? current : null;
}

const sorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

export const planActions = {
  async create(input: NewPlan): Promise<PlanResult> {
    const who = actor();
    if (!who) return { ok: false, error: SIGN_IN_FIRST };
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

    const row: MemorizationPlanRow = {
      id: Crypto.randomUUID(),
      learner_id: who.learnerId,
      kind: input.kind,
      start_juz: range ? input.startJuz : null,
      end_juz: range ? input.endJuz : null,
      start_page: range?.startPage ?? null,
      end_page: range?.endPage ?? null,
      units_per_day: input.unitsPerDay,
      far_review_pages: input.farPages,
      progress_units: 0,
      review_cursor: 0,
      status: "active",
      prior_surahs: priorSurahs,
      prior_juz: priorJuz,
      prior_pages: priorPages,
      new_days: input.kind === "memorize" ? sorted(input.newDays) : [],
      review_days: sorted(input.reviewDays),
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    // Marking the prior surahs memorized counts as today's activity, as on the website.
    if (priorSurahs.length > 0 || priorJuz.length > 0) recordActivity(who.learnerId);
    apply({ type: "create", row }, who);
    track("plan_created", { kind: input.kind });
    return { ok: true, message: "أُنشئت خطتك، بالتوفيق!" };
  },

  /** Marks today's new portion memorized and moves the plan forward. Safe to press twice. */
  async completeNew(): Promise<PlanResult> {
    const who = actor();
    const current = who ? activePlan(who) : null;
    if (!who || !current) return { ok: false, error: NO_PLAN };
    const { plan, log } = current;
    const today = planDay();
    if (loggedOn(log, today, "new")) return { ok: true };
    const range = plan.kind === "memorize" ? todayNewRange(plan, null) : null;
    if (!range || plan.start_juz === null || plan.end_juz === null) return { ok: true };
    const segments = resolveSegments(unitsToSegments(plan, range), { start: plan.start_juz, end: plan.end_juz });
    recordActivity(who.learnerId);
    apply(
      {
        type: "completeNew",
        planId: plan.id,
        day: today,
        from: range.from,
        to: range.to,
        finished: range.to >= totalUnits(plan),
        at: new Date().toISOString(),
        ayahs: spansToAyahs(segments),
      },
      who,
    );
    return { ok: true };
  },

  /** Marks today's review done and rotates the older-pages slice. */
  async completeReview(): Promise<PlanResult> {
    const who = actor();
    const current = who ? activePlan(who) : null;
    if (!who || !current) return { ok: false, error: NO_PLAN };
    const { plan, log } = current;
    const today = planDay();
    if (loggedOn(log, today, "review")) return { ok: true };
    const anchor = loggedOn(log, today, "new")?.from ?? plan.progress_units;
    const cursor = nextCursor(plan, recentRange(plan, anchor).from, plan.review_cursor);
    // For review rows: from_unit = the older-pages cursor and to_unit = the recent window's anchor.
    apply({ type: "completeReview", planId: plan.id, day: today, from: plan.review_cursor, to: anchor, cursor }, who);
    return { ok: true };
  },

  async archive(): Promise<PlanResult> {
    const who = actor();
    if (!who) return { ok: false, error: SIGN_IN_FIRST };
    const current = displayed(who.learnerId);
    if (current) apply({ type: "archive", planId: current.plan.id }, who);
    return { ok: true };
  },
};
