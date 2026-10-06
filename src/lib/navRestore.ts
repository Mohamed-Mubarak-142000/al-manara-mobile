import Storage from "expo-sqlite/kv-store";

/**
 * Brings the user back to the screen they were on when Android ended the process in the background
 * (memory, a permission changed in Settings, a crash). Expo Router itself always starts at Home.
 *
 * The current route is saved on every change (debounced, flushed when the app goes to the background);
 * on a cold start with no deep link or notification, a recent saved route is pushed on top of Home.
 */

export interface SavedRoute {
  href: string;
  at: number;
}

const KEY = "al-manara:last-route:v1";
const RESTORE_KEY = "al-manara:last-restore:v1";
export const MAX_AGE_MS = 30 * 60 * 1000;
/** A restore this recent means the restored screen probably crashed: don't loop into it again. */
export const LOOP_GUARD_MS = 60 * 1000;

const EXCLUDED = new Set([
  "/",
  "/onboarding",
  "/login",
  "/register",
  "/verify",
  "/forgot-password",
  "/reset-password",
  "/player",
  "/share-ayah",
  "/share-card",
  "/repeat",
  "/adhan-voice",
]);

export function pathOf(href: string): string {
  const path = href.split(/[?#]/)[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function isRestorable(href: string): boolean {
  if (!href.startsWith("/")) return false;
  const path = pathOf(href);
  return !EXCLUDED.has(path) && !path.startsWith("/auth/") && path !== "/auth";
}

/**
 * Home is saved (being on Home means nothing to restore); modals and sign-in screens are not, so the
 * screen underneath a modal stays the one remembered.
 */
export function shouldSave(href: string): boolean {
  return pathOf(href) === "/" || isRestorable(href);
}

/**
 * Builds a href from the pathname and the global params, leaving out the params that fill dynamic
 * segments (they are already in the pathname): segments ["hadith", "[id]"] → drop `id`.
 */
export function buildHref(pathname: string, params: Record<string, string | string[] | undefined>, segments: readonly string[]): string {
  const dynamic = new Set(segments.map((s) => s.match(/^\[(?:\.\.\.)?([^\]]+)\]$/)?.[1]).filter((k): k is string => !!k));
  const query = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (dynamic.has(key) || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) query.append(key, v);
  }
  const qs = query.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export interface RestoreInput {
  saved: SavedRoute | null;
  now: number;
  /** A deep link, shortcut, widget or notification opened the app: that wins. */
  launchedByLink: boolean;
  onboardingDone: boolean;
  lastRestoreAt: number | null;
}

/** The href to open on a cold start, or null to stay on Home. */
export function decideRestore({ saved, now, launchedByLink, onboardingDone, lastRestoreAt }: RestoreInput): string | null {
  if (!saved || launchedByLink || !onboardingDone) return null;
  const age = now - saved.at;
  if (!(age >= 0 && age < MAX_AGE_MS)) return null;
  if (lastRestoreAt !== null && now - lastRestoreAt >= 0 && now - lastRestoreAt < LOOP_GUARD_MS) return null;
  return isRestorable(saved.href) ? saved.href : null;
}

/** The dev client launches with its own URL; that isn't a link the user opened. */
export function isUserLaunchUrl(url: string | null): boolean {
  return !!url && !url.includes("expo-development-client");
}

export function readSavedRoute(): SavedRoute | null {
  try {
    const parsed = JSON.parse(Storage.getItemSync(KEY) ?? "null") as SavedRoute | null;
    return parsed && typeof parsed.href === "string" && typeof parsed.at === "number" ? parsed : null;
  } catch {
    return null;
  }
}

export function readLastRestoreAt(): number | null {
  try {
    const value = Number(Storage.getItemSync(RESTORE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function markRestored(at = Date.now()) {
  try {
    Storage.setItemSync(RESTORE_KEY, String(at));
  } catch {
    // Worst case the loop guard misses once.
  }
}

let pending: { href: string; timer: ReturnType<typeof setTimeout> } | null = null;

function write(href: string) {
  try {
    Storage.setItemSync(KEY, JSON.stringify({ href, at: Date.now() } satisfies SavedRoute));
  } catch {
    // Not restored next time at worst.
  }
}

/** Saves the route after a short pause, so quick hops don't each hit storage. */
export function saveRoute(href: string, delayMs = 400) {
  if (pending) clearTimeout(pending.timer);
  const timer = setTimeout(() => {
    pending = null;
    write(href);
  }, delayMs);
  pending = { href, timer };
}

/** Writes a pending route now (the app is going to the background and may not come back). */
export function flushRoute() {
  if (!pending) return;
  clearTimeout(pending.timer);
  const { href } = pending;
  pending = null;
  write(href);
}

/** Refreshes the timestamp of the saved route, so time spent on one screen doesn't age it out. */
export function touchRoute(href: string) {
  flushRoute();
  write(href);
}
