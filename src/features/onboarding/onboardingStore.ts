import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

/** First-run state and the choices made there (kept on this device). */
interface OnboardingState {
  done: boolean;
  favoriteReciterId: number | null;
  /**
   * Where an unfinished first run is, and what was chosen on it, kept so it resumes there when the app
   * comes back from a cold start (Android ending the app while Google's sign-in is in the browser).
   */
  step: string | null;
  wird: number | null;
  alerts: { adhan: boolean; adhkar: boolean } | null;
  /** A Google sign-in started on the account step and not back yet: once signed in, the step moves on. */
  googlePending: boolean;
}

const EMPTY: OnboardingState = { done: false, favoriteReciterId: null, step: null, wird: null, alerts: null, googlePending: false };

const KEY = "al-manara:onboarding:v1";
let cached: OnboardingState | null = null;
const listeners = new Set<() => void>();

function read(): OnboardingState {
  if (cached) return cached;
  try {
    cached = { ...EMPTY, ...(JSON.parse(Storage.getItemSync(KEY) ?? "{}") as Partial<OnboardingState>) };
  } catch {
    cached = EMPTY;
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
    write({ done: true, step: null, wird: null, alerts: null, googlePending: false });
  },
  /** The first run's place and choices, saved as they change. */
  saveProgress(progress: Partial<Pick<OnboardingState, "step" | "wird" | "alerts">>) {
    write(progress);
  },
  progress(): Pick<OnboardingState, "step" | "wird" | "alerts"> {
    const { step, wird, alerts } = read();
    return { step, wird, alerts };
  },
  setGooglePending(pending: boolean) {
    if (read().googlePending !== pending) write({ googlePending: pending });
  },
  googlePending(): boolean {
    return read().googlePending;
  },
  setFavoriteReciter(id: number | null) {
    write({ favoriteReciterId: id });
  },
  isDone(): boolean {
    return read().done;
  },
  favoriteReciter(): number | null {
    return read().favoriteReciterId;
  },
};

export function useOnboarding(): OnboardingState {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, read);
}
