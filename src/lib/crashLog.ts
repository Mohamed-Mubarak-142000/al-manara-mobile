import Constants from "expo-constants";
import Storage from "expo-sqlite/kv-store";

/**
 * A small on-device crash log, for builds without Sentry. JS errors (fatal and not), unhandled promise
 * rejections and error-boundary catches are written synchronously to the kv-store (the process may be
 * about to die), the last few kept. The About screen shows them and shares them as text.
 *
 * Importing this module installs the handlers; index.ts imports it first so it sees startup errors too.
 */

export type CrashKind = "fatal" | "error" | "promise" | "boundary";

export interface CrashEntry {
  kind: CrashKind;
  message: string;
  stack: string;
  at: number;
  route: string;
  appVersion: string;
}

const KEY = "al-manara:crash-log:v1";
const MAX_ENTRIES = 5;
const MAX_STACK = 4000;

let lastRoute = "";

/** The screen the user is on, attached to the next error. */
export function setCrashRoute(route: string) {
  lastRoute = route;
}

export function readCrashLog(): CrashEntry[] {
  try {
    const parsed: unknown = JSON.parse(Storage.getItemSync(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as CrashEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearCrashLog() {
  try {
    Storage.removeItemSync(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Newest first, at most MAX_ENTRIES. Pure, for tests. */
export function appendEntry(list: CrashEntry[], entry: CrashEntry, max = MAX_ENTRIES): CrashEntry[] {
  return [entry, ...list].slice(0, max);
}

export function toEntry(error: unknown, kind: CrashKind, at = Date.now()): CrashEntry {
  const err = error instanceof Error ? error : null;
  const message = err ? `${err.name}: ${err.message}` : typeof error === "string" ? error : safeString(error);
  return {
    kind,
    message: message.slice(0, 500),
    stack: (err?.stack ?? "").slice(0, MAX_STACK),
    at,
    route: lastRoute,
    appVersion: Constants.expoConfig?.version ?? "?",
  };
}

function safeString(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Saves an error synchronously. Never throws. */
export function recordError(error: unknown, kind: CrashKind) {
  try {
    const next = appendEntry(readCrashLog(), toEntry(error, kind));
    Storage.setItemSync(KEY, JSON.stringify(next));
  } catch {
    // The log must never be the reason the app crashes.
  }
}

let installed = false;

function install() {
  if (installed) return;
  installed = true;
  const utils = (globalThis as { ErrorUtils?: typeof ErrorUtils }).ErrorUtils;
  if (utils?.setGlobalHandler) {
    const previous = utils.getGlobalHandler?.();
    utils.setGlobalHandler((error, isFatal) => {
      recordError(error, isFatal ? "fatal" : "error");
      previous?.(error, isFatal);
    });
  }
  // Hermes only tracks rejections in development (for LogBox); in release nobody hears them. Turning it on
  // there would replace LogBox's tracker, so only release builds get ours.
  const hermes = (globalThis as { HermesInternal?: { enablePromiseRejectionTracker?: (options: unknown) => void } }).HermesInternal;
  if (!__DEV__ && hermes?.enablePromiseRejectionTracker) {
    try {
      hermes.enablePromiseRejectionTracker({
        allRejections: true,
        onUnhandled: (_id: number, rejection: unknown) => recordError(rejection, "promise"),
        onHandled: () => {},
      });
    } catch {
      // Older Hermes: no rejection tracking.
    }
  }
}

install();

/** Native crashes (Thread uncaught handler) and Android's own record of why the process ended. */
export interface NativeCrash {
  at: number;
  thread: string;
  message: string;
  stack: string;
}

export interface ExitReason {
  at: number;
  reason: string;
  description: string;
  importance: number;
  status: number;
  pssKb: number;
  rssKb: number;
}

export interface NativeReport {
  native: NativeCrash[];
  exits: ExitReason[];
}

export function parseNativeReport(json: string | null | undefined): NativeReport {
  try {
    const parsed = JSON.parse(json ?? "{}") as Partial<NativeReport>;
    return { native: Array.isArray(parsed.native) ? parsed.native : [], exits: Array.isArray(parsed.exits) ? parsed.exits : [] };
  } catch {
    return { native: [], exits: [] };
  }
}

const IMPORTANCE: Record<number, string> = {
  100: "foreground",
  125: "fg-service",
  200: "visible",
  230: "perceptible",
  300: "service",
  325: "top-sleeping",
  400: "cached",
  1000: "gone",
};

export function importanceLabel(importance: number): string {
  return IMPORTANCE[importance] ?? String(importance);
}

/** A compact plain-text report to paste into a chat or email. */
export function buildCrashReportText(
  info: { appVersion: string; os: string; device: string; now: number },
  js: CrashEntry[],
  report: NativeReport,
): string {
  const iso = (at: number) => new Date(at).toISOString().replace("T", " ").slice(0, 19);
  const lines = [`Al-Manara crash report · app ${info.appVersion} · ${info.os} · ${info.device} · ${iso(info.now)}`];
  lines.push("", `== Process exits (${report.exits.length}) ==`);
  for (const e of report.exits) {
    lines.push(`${iso(e.at)} ${e.reason} [${importanceLabel(e.importance)}] status=${e.status} pss=${e.pssKb}KB rss=${e.rssKb}KB ${e.description ?? ""}`.trim());
  }
  lines.push("", `== Native crashes (${report.native.length}) ==`);
  for (const c of report.native) {
    lines.push(`${iso(c.at)} [${c.thread}] ${c.message}`, c.stack.slice(0, 1500), "");
  }
  lines.push("", `== JS errors (${js.length}) ==`);
  for (const e of js) {
    lines.push(`${iso(e.at)} ${e.kind} v${e.appVersion} @ ${e.route || "?"}: ${e.message}`, e.stack.slice(0, 1500), "");
  }
  return lines.join("\n").trim();
}
