// Ported from eslam-platform/src/features/plan/view.ts — keep in sync by hand (no hrefs; the app opens page numbers).
import type { AyahRef } from "@/core/quran/textApi";
import { loggedOn, type PlanWithLog } from "./types";
import { resolveSegments } from "./portion";
import {
  daysLabel,
  farPages,
  farPool,
  finishDay,
  juzLabel,
  nextScheduledDay,
  pagesLabel,
  planDay,
  recentRange,
  sessionsLeft,
  shiftDay,
  streak,
  surahAtPage,
  todayNewRange,
  totalUnits,
  unitsLabel,
  unitsToSegments,
  weekday,
  WEEKDAY_NAMES,
  type PageSegment,
} from "@/core/plan/schedule";

export interface PageLink {
  page: number;
  half: PageSegment["half"];
  surahName: string;
}

export interface PortionPart extends PageLink {
  spans: { surah: number; surahName: string; from: number; to: number }[];
  opening: string;
}

export interface DaySchedule {
  /** Whether today is one of the chosen days. */
  today: boolean;
  label: string;
  /** "غدًا" or a weekday name, for "your next session is …". */
  next: string | null;
}

export interface TodayView {
  kind: "memorize" | "review";
  status: "active" | "completed";
  startJuz: number | null;
  endJuz: number | null;
  totalPages: number;
  pagesDone: number;
  percent: number;
  /** YYYY-MM-DD of the expected last session, keeping to the chosen days. */
  finishDay: string | null;
  streak: number;
  dailyLabel: string;
  reviewLabel: string;
  /** What the learner knew before the plan: whole juz first, then surahs. */
  known: string[];
  /** Pages in the older-pages rotation, and how far into the current round it is. */
  pool: { pages: number; position: number };
  newDays: DaySchedule;
  reviewDays: DaySchedule;
  /** Null when there's nothing new to memorize; `parts` is null when the Quran API is unreachable. */
  newPortion: { done: boolean; parts: PortionPart[] | null } | null;
  recent: PageLink[];
  far: PageLink[];
  reviewDone: boolean;
}

function schedule(days: number[], today: string): DaySchedule {
  const next = nextScheduledDay(days, shiftDay(today, 1));
  return {
    today: days.includes(weekday(today)),
    label: daysLabel(days),
    next: next === null ? null : next === shiftDay(today, 1) ? "غدًا" : `يوم ${WEEKDAY_NAMES[weekday(next)]}`,
  };
}

export function buildTodayView({ plan, log }: PlanWithLog, pageStarts: AyahRef[], surahNames: Record<number, string>): TodayView {
  const today = planDay();
  const newToday = loggedOn(log, today, "new");
  const reviewToday = loggedOn(log, today, "review");
  const name = (surah: number) => surahNames[surah] ?? String(surah);
  const link = (segment: PageSegment): PageLink => {
    const surah = surahAtPage(pageStarts, segment.page);
    return { ...segment, surahName: name(surah) };
  };

  const range = plan.status === "active" && plan.kind === "memorize" ? todayNewRange(plan, newToday) : null;
  let newPortion: TodayView["newPortion"] = null;
  if (range && plan.start_juz !== null && plan.end_juz !== null) {
    const segments = unitsToSegments(plan, range);
    const resolved = resolveSegments(segments, { start: plan.start_juz, end: plan.end_juz });
    newPortion = {
      done: newToday !== null,
      parts: resolved.map((segment) => ({
        ...link(segment),
        spans: segment.spans.map((span) => ({ ...span, surahName: name(span.surah) })),
        opening: segment.opening,
      })),
    };
  }

  // Review rows keep the cursor and anchor they were made with (see completeReviewAction).
  const anchor = reviewToday?.to ?? newToday?.from ?? plan.progress_units;
  const cursor = reviewToday?.from ?? plan.review_cursor;
  const recent = recentRange(plan, anchor);
  const total = totalUnits(plan);

  const pool = farPool(plan, recent.from).length;
  const memorize = plan.kind === "memorize";

  return {
    kind: plan.kind,
    status: plan.status === "completed" ? "completed" : "active",
    startJuz: plan.start_juz,
    endJuz: plan.end_juz,
    totalPages: total / 2,
    pagesDone: plan.progress_units / 2,
    percent: total > 0 ? Math.round((plan.progress_units / total) * 100) : 0,
    finishDay: memorize ? finishDay(sessionsLeft(plan), plan.new_days, today, newToday !== null) : null,
    streak: streak(
      log.filter((row) => row.kind === (memorize ? "new" : "review")).map((row) => row.day),
      today,
      memorize ? plan.new_days : plan.review_days,
    ),
    dailyLabel: unitsLabel(plan.units_per_day),
    reviewLabel: pagesLabel(plan.far_review_pages),
    known: [...plan.prior_juz.map(juzLabel), ...plan.prior_surahs.map((surah) => `سورة ${name(surah)}`)],
    pool: { pages: pool, position: pool === 0 ? 0 : cursor % pool },
    newDays: schedule(plan.new_days, today),
    reviewDays: schedule(plan.review_days, today),
    newPortion,
    recent: plan.status === "active" ? unitsToSegments(plan, recent).map(link) : [],
    far: plan.status === "active" ? farPages(plan, recent.from, cursor).map((page) => link({ page, half: "full" })) : [],
    reviewDone: reviewToday !== null,
  };
}
