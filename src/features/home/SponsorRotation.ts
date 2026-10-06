/**
 * The sponsor carousel's pure parts: which slide comes next, which sponsors are still running, and a
 * small auto-advance timer that pauses for any number of reasons (touch, screen unfocused, app in the
 * background, reduce motion...). No React Native imports, so it is unit-tested directly.
 */

export interface SponsorItem {
  id: string;
  name: string;
  message: string;
  link_url: string | null;
  logo_url: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
}

/** The slide after `index`, wrapping from the last back to the first. */
export function nextIndex(index: number, count: number): number {
  if (count < 2) return 0;
  const current = Math.min(Math.max(Math.trunc(index), 0), count - 1);
  return (current + 1) % count;
}

/** The slide a scroll offset rests on, measured from the first slide (FlatList's own coordinates). */
export function indexFromOffset(offset: number, pageWidth: number, count: number): number {
  if (count < 1 || pageWidth <= 0 || !Number.isFinite(offset)) return 0;
  return Math.min(Math.max(Math.round(Math.abs(offset) / pageWidth), 0), count - 1);
}

/** The local calendar day as YYYY-MM-DD, the format of the sponsors' starts_on/ends_on dates. */
export function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Sponsors running on `today` (inclusive dates); a cached list must not outlive its sponsors. */
export function liveSponsors<T extends SponsorItem>(sponsors: T[], today: string): T[] {
  return sponsors.filter(
    (sponsor) => (!sponsor.starts_on || sponsor.starts_on.slice(0, 10) <= today) && (!sponsor.ends_on || sponsor.ends_on.slice(0, 10) >= today),
  );
}

/** Parses the cached list, dropping anything that is not a usable sponsor. */
export function parseSponsorCache(raw: string | null | undefined): SponsorItem[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is SponsorItem =>
        !!item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string" && typeof item.message === "string",
    );
  } catch {
    return [];
  }
}

export interface AutoAdvance {
  /** Sets pause reasons; ticking runs only while none is true. */
  update(flags: Record<string, boolean>): void;
  /** A finger is on the carousel: stop at once. */
  touchStart(): void;
  /** The finger lifted: ticking resumes `resumeAfterMs` later. */
  touchEnd(): void;
  isRunning(): boolean;
  dispose(): void;
}

interface AutoAdvanceOptions {
  intervalMs: number;
  resumeAfterMs: number;
  onAdvance: () => void;
  /** Initial pause reasons, so nothing ticks before the screen reports its state. */
  blocked?: string[];
}

/**
 * Calls `onAdvance` every `intervalMs` while nothing blocks it. Any change of state restarts the
 * interval, so a slide always gets its full time on screen after a pause.
 */
export function createAutoAdvance({ intervalMs, resumeAfterMs, onAdvance, blocked = [] }: AutoAdvanceOptions): AutoAdvance {
  const reasons = new Set(blocked);
  let touching = false;
  let cooling = false;
  let tick: ReturnType<typeof setTimeout> | null = null;
  let cooldown: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const canRun = () => !disposed && reasons.size === 0 && !touching && !cooling;

  function stop() {
    if (tick) clearTimeout(tick);
    tick = null;
  }

  function schedule() {
    stop();
    if (!canRun()) return;
    tick = setTimeout(() => {
      tick = null;
      if (!canRun()) return;
      onAdvance();
      schedule();
    }, intervalMs);
  }

  function clearCooldown() {
    if (cooldown) clearTimeout(cooldown);
    cooldown = null;
    cooling = false;
  }

  return {
    update(flags) {
      const before = canRun();
      for (const [reason, on] of Object.entries(flags)) {
        if (on) reasons.add(reason);
        else reasons.delete(reason);
      }
      const after = canRun();
      if (!after) stop();
      else if (!before) schedule();
    },
    touchStart() {
      clearCooldown();
      touching = true;
      stop();
    },
    touchEnd() {
      if (!touching) return;
      touching = false;
      cooling = true;
      cooldown = setTimeout(() => {
        cooldown = null;
        cooling = false;
        schedule();
      }, resumeAfterMs);
    },
    isRunning: () => tick !== null,
    dispose() {
      disposed = true;
      stop();
      clearCooldown();
    },
  };
}
