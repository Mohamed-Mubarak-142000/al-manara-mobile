import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

/** First-run state and the choices made there (kept on this device). */
interface OnboardingState {
  done: boolean;
  favoriteReciterId: number | null;
}

const KEY = "al-manara:onboarding:v1";
let cached: OnboardingState | null = null;
const listeners = new Set<() => void>();

function read(): OnboardingState {
  if (cached) return cached;
  try {
    cached = { done: false, favoriteReciterId: null, ...(JSON.parse(Storage.getItemSync(KEY) ?? "{}") as Partial<OnboardingState>) };
  } catch {
    cached = { done: false, favoriteReciterId: null };
  }
  return cached;
}

function write(patch: Partial<OnboardingState>) {
  cached = { ...read(), ...patch };
  try {
    Storage.setItemSync(KEY, JSON.stringify(cached));
  } catch {
    // Asked again next launch at worst.
  }
  listeners.forEach((notify) => notify());
}

export const onboarding = {
  finish() {
    write({ done: true });
  },
  setFavoriteReciter(id: number | null) {
    write({ favoriteReciterId: id });
  },
  isDone(): boolean {
    return read().done;
  },
};

export function useOnboarding(): OnboardingState {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, read);
}
