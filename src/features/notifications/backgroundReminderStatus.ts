import { useSyncExternalStore } from "react";

import { background, type BackgroundStatus } from "../../../modules/almanara-background";

let status: BackgroundStatus | null = null;
let error = "";
let revision = 0;
const listeners = new Set<() => void>();

function notify() {
  revision++;
  listeners.forEach((listener) => listener());
}

export function refreshBackgroundStatus() {
  status = background?.getStatus() ?? null;
  notify();
}

export function reportReminderError(value: unknown) {
  error = value instanceof Error ? value.message : String(value);
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
