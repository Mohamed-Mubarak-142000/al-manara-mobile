// Ported from eslam-platform/src/features/kids/progress/dailyChallenge.ts — keep in sync by hand.
import type { GameKind } from "@/lib/database.types";
import type { KidsProgressState } from "./progressTypes";

export type DailyTaskId = "listen" | "learn" | "play" | "quiz" | "recite";

export interface DailyTask {
  id: DailyTaskId;
  emoji: string;
  title: string;
}

const TASKS: Record<DailyTaskId, DailyTask> = {
  listen: { id: "listen", emoji: "🎧", title: "استمع إلى سورة كاملة" },
  learn: { id: "learn", emoji: "📖", title: "احفظ آية جديدة أو راجع سورة" },
  play: { id: "play", emoji: "🎮", title: "العب لعبة قرآنية" },
  quiz: { id: "quiz", emoji: "🧠", title: "جاوب على أسئلة الاختبار" },
  recite: { id: "recite", emoji: "🎤", title: "سمّع آية بصوتك" },
};

export const DAILY_TASK_COUNT = 3;

/** Same day format as the streak (UTC date), so a challenge and the streak roll over together. */
export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Three tasks for the day, always the same for that day; learning or listening is always one of them. */
export function buildDailyChallenge(day: string): DailyTask[] {
  const seed = Number(day.replaceAll("-", ""));
  const core: DailyTaskId = seed % 2 === 0 ? "learn" : "listen";
  const rest: DailyTaskId[] = (["listen", "learn", "play", "quiz", "recite"] as const).filter((id) => id !== core);
  const first = rest[seed % rest.length]!;
  const remaining = rest.filter((id) => id !== first);
  const second = remaining[Math.floor(seed / 7) % remaining.length]!;
  return [TASKS[core], TASKS[first], TASKS[second]];
}

export type DailyEvent = { type: "listen" } | { type: "learn" } | { type: "quiz" } | { type: "game"; game: GameKind };

function taskForEvent(event: DailyEvent): DailyTaskId {
  if (event.type !== "game") return event.type;
  if (event.game === "kids_recite") return "recite";
  if (event.game === "quiz" || event.game === "true_false") return "quiz";
  return "play";
}

/** Marks today's matching task done, if it is one of today's three. */
export function applyDailyEvent(state: KidsProgressState, event: DailyEvent, now: Date = new Date()): KidsProgressState {
  const day = todayKey(now);
  const task = taskForEvent(event);
  const done = state.dailyDone[day] ?? [];
  if (done.includes(task) || !buildDailyChallenge(day).some((entry) => entry.id === task)) return state;
  return { ...state, dailyDone: { ...state.dailyDone, [day]: [...done, task] } };
}

export function isDailyComplete(state: KidsProgressState, day: string): boolean {
  return (state.dailyDone[day]?.length ?? 0) >= DAILY_TASK_COUNT;
}

export function completedDailyDays(state: KidsProgressState): string[] {
  return Object.keys(state.dailyDone)
    .filter((day) => isDailyComplete(state, day))
    .sort();
}
