// Ported from eslam-platform/src/features/khatma/view.ts — keep in sync by hand (no href: the app opens the page number).
import { daysLabel, finishDay, nextScheduledDay, planDay, shiftDay, streak, weekday, WEEKDAY_NAMES } from "@/core/plan/schedule";
import type { KhatmaWithLog } from "./types";
import {
  amountLabel,
  nextPortion,
  pageOfIndex,
  pagesInJuz,
  sessionsLeft,
  toRef,
  TOTAL_AYAHS,
  type Boundaries,
} from "@/core/khatma/schedule";

export interface KhatmaPortion {
  done: boolean;
  from: { surah: number; surahName: string; ayah: number };
  to: { surah: number; surahName: string; ayah: number };
  startPage: number;
  endPage: number;
}

export interface KhatmaView {
  status: "active" | "completed";
  amount: string;
  daysLabel: string;
  readsToday: boolean;
  /** "غدًا" or "يوم السبت", when today isn't a reading day. */
  nextDay: string | null;
  pagesDone: number;
  percent: number;
  /** YYYY-MM-DD the last session lands on, keeping to the chosen days. */
  finishDay: string | null;
  targetDay: string | null;
  streak: number;
  finished: number;
  portion: KhatmaPortion | null;
}

export function buildKhatmaView(
  { khatma, log, finished }: KhatmaWithLog,
  boundaries: Boundaries,
  surahNames: Record<number, string>,
): KhatmaView {
  const today = planDay();
  const logged = log.find((row) => row.day === today);
  const range =
    khatma.status === "active" ? (logged ? { from: logged.from_ayah, to: logged.to_ayah } : nextPortion(khatma, boundaries)) : null;
  const end = (index: number) => {
    const ref = toRef(index);
    return { surah: ref.surah, surahName: surahNames[ref.surah] ?? String(ref.surah), ayah: ref.ayah };
  };
  const pagesDone = khatma.position >= TOTAL_AYAHS ? 604 : pageOfIndex(boundaries, khatma.position) - 1;
  const next = nextScheduledDay(khatma.days, shiftDay(today, 1));
  const juzHint = khatma.unit === "pages" ? pagesInJuz(khatma.per_session) : null;

  return {
    status: khatma.status === "completed" ? "completed" : "active",
    amount: `${amountLabel(khatma.unit, khatma.per_session)}${juzHint ? ` (${juzHint})` : ""}`,
    daysLabel: daysLabel(khatma.days),
    readsToday: khatma.days.includes(weekday(today)),
    nextDay: next === null ? null : next === shiftDay(today, 1) ? "غدًا" : `يوم ${WEEKDAY_NAMES[weekday(next)]}`,
    pagesDone,
    percent: Math.round((pagesDone / 604) * 100),
    finishDay: finishDay(sessionsLeft(khatma, boundaries), khatma.days, today, logged !== undefined),
    targetDay: khatma.target_day,
    streak: streak(
      log.map((row) => row.day),
      today,
      khatma.days,
    ),
    finished,
    portion: range && {
      done: logged !== undefined,
      from: end(range.from),
      to: end(range.to - 1),
      startPage: pageOfIndex(boundaries, range.from),
      endPage: pageOfIndex(boundaries, range.to - 1),
    },
  };
}
