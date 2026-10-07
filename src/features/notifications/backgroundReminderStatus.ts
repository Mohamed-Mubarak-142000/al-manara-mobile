import { useSyncExternalStore } from "react";

import { recordError } from "@/lib/crashLog";

import { background, type BackgroundStatus } from "../../../modules/almanara-background";

let status: BackgroundStatus | null = null;
let error = "";
let revision = 0;
const listeners = new Set<() => void>();

function notify() {
  revision++;
  listeners.forEach((listener) => listener());
}

/** Polled every few seconds while the app is open: listeners only hear about an actual change. */
export function refreshBackgroundStatus() {
  const next = background?.getStatus() ?? null;
  if (JSON.stringify(next) === JSON.stringify(status)) return;
  status = next;
  notify();
}

const FALLBACK = "تعذّر حفظ التذكير على هذا الهاتف. أغلق التطبيق وافتحه من جديد، ثم حاول مرة أخرى.";
const ARABIC = /[؀-ۿ]/;

/**
 * Our own messages are Arabic and shown as they are; a raw native error (English, e.g. an SQLite
 * failure) goes to the crash log and the card shows a plain Arabic line instead.
 */
export function reportReminderError(value: unknown) {
  const message = value instanceof Error ? value.message : String(value);
  if (ARABIC.test(message)) error = message;
  else {
    recordError(value, "error");
    error = FALLBACK;
  }
  notify();
}

export function clearReminderError() {
  error = "";
  notify();
}

export function useBackgroundStatus() {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => revision,
  );
  return { status, error };
}
