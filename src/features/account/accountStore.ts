import type { Session } from "@supabase/supabase-js";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import type { Database } from "@/lib/database.types";
import { flushOutbox, pendingCount, setOutboxUser, waitForSync } from "@/lib/outbox";
import { supabase } from "@/lib/supabase";

type Tables = Database["public"]["Tables"];
export type Profile = Tables["profiles"]["Row"];
export type Learner = Tables["learners"]["Row"];

export type AccountState =
  | { status: "loading" }
  /** No account: everything works on this device only (the website's guest mode). */
  | { status: "guest"; configured: boolean }
  | { status: "signed-in"; userId: string; email: string; profile: Profile | null; learners: Learner[]; activeLearner: Learner | null };

const ACTIVE_LEARNER_KEY = "al-manara:active-learner";

let state: AccountState = supabase ? { status: "loading" } : { status: "guest", configured: false };
const listeners = new Set<() => void>();

function set(next: AccountState) {
  state = next;
  listeners.forEach((notify) => notify());
}

/** The last profile and learners loaded per account, so a signed-in cold start offline still has them. */
const ACCOUNT_CACHE_KEY = "al-manara:account-cache:v1";
type AccountCache = { userId: string; profile: Profile | null; learners: Learner[] };

function readCache(userId: string): AccountCache | null {
  try {
    const cached = JSON.parse(Storage.getItemSync(ACCOUNT_CACHE_KEY) ?? "null") as AccountCache | null;
    return cached?.userId === userId ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(cache: AccountCache) {
  try {
    Storage.setItemSync(ACCOUNT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Loaded from the server next time.
  }
}

/** Bumped on every load, so an older load finishing late can't overwrite a newer state (e.g. a sign-out). */
let loadGeneration = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 3000;
let currentSession: Session | null = null;

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void loadSession(currentSession);
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 60_000);
}

function publishSignedIn(session: Session, profile: Profile | null, learners: Learner[]) {
  let chosen: string | null = null;
  try {
    chosen = Storage.getItemSync(ACTIVE_LEARNER_KEY);
  } catch {
    // Default below.
  }
  const activeLearner = learners.find((learner) => learner.id === chosen) ?? learners.find((learner) => learner.kind === "self") ?? learners[0] ?? null;
  set({
    status: "signed-in",
    userId: session.user.id,
    email: session.user.email ?? profile?.email ?? "",
    profile,
    learners,
    activeLearner,
  });
}

/** Mirrors the website's getSession(): profile, learners, and the active learner (own learner by default). */
async function loadSession(session: Session | null) {
  const generation = ++loadGeneration;
  currentSession = session;
  if (!supabase || !session) {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    // The signed-out account's unsynced steps wait for it; another account signing in drops them.
    setOutboxUser(null);
    set({ status: "guest", configured: !!supabase });
    return;
  }
  const userId = session.user.id;
  setOutboxUser(userId);
  const cached = readCache(userId);
  // Never a guest screen (sign-in prompts, "متابعة كضيف") while a session is loading.
  if (cached) publishSignedIn(session, cached.profile, cached.learners);
  else if (state.status !== "signed-in" || state.userId !== userId) set({ status: "loading" });

  const [profile, learners] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("learners").select("*").eq("owner_id", userId).order("created_at"),
  ]);
  if (generation !== loadGeneration) return;
  if (profile.error || learners.error) {
    // Offline or the server failed: an empty learner list would quietly turn the user into a guest
    // (khatma written to the device only). Keep what's known and try again.
    scheduleRetry();
    return;
  }
  retryDelay = 3000;
  writeCache({ userId, profile: profile.data ?? null, learners: learners.data ?? [] });
  publishSignedIn(session, profile.data ?? null, learners.data ?? []);
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    // Token refreshes don't change who is signed in; skip the extra round trip, but a fresh token may
    // be what the waiting steps needed (and a load that failed offline can try again).
    if (event === "TOKEN_REFRESHED") {
      void flushOutbox({ force: true });
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
        void loadSession(session);
      }
      return;
    }
    // Outside the callback: Supabase's guidance, so the client isn't called while it holds its auth lock.
    setTimeout(() => void loadSession(session), 0);
  });
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

export function activeLearnerId(account: AccountState): string | null {
  return account.status === "signed-in" ? (account.activeLearner?.id ?? null) : null;
}

/** For non-React callers (the API client). */
export function activeLearnerIdNow(): string | null {
  return activeLearnerId(state);
}

/** The signed-in account's id (the owner of the steps waiting to sync), or null. */
export function currentUserIdNow(): string | null {
  return state.status === "signed-in" ? state.userId : null;
}

/** Steps (khatma, plan, activity…) saved on this device that haven't reached the account yet. */
export function pendingSyncCount(): number {
  return pendingCount();
}

const SIGN_OUT_SYNC_MS = 5000;

export type SignInResult = { ok: true } | { ok: false; message: string; needsVerification?: boolean };

/** Same messages as the website's authErrorMessage() for the cases a sign-in form can hit. */
function signInMessage(code: string | undefined, message: string): string {
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (code === "email_not_confirmed") return "لم يتم تأكيد بريدك بعد.";
  if (code === "over_request_rate_limit" || /rate limit/i.test(message)) return "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.";
  return "تعذّر تسجيل الدخول الآن، حاول مجددًا بعد قليل.";
}

export const account = {
  /** Re-reads the profile and learners after an edit. */
  async reload() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await loadSession(data.session);
  },
  async signIn(email: string, password: string): Promise<SignInResult> {
    if (!supabase) return { ok: false, message: "تسجيل الدخول غير مفعّل في هذه النسخة." };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (!error) return { ok: true };
    return { ok: false, message: signInMessage(error.code, error.message), needsVerification: error.code === "email_not_confirmed" };
  },
  /**
   * Tries to send what's waiting (up to 5 seconds) and resolves with how many steps are still unsynced,
   * so the account screen can warn before signing out.
   */
  async syncBeforeSignOut(): Promise<number> {
    return waitForSync(SIGN_OUT_SYNC_MS);
  },
  /** `synced`: the caller already waited with syncBeforeSignOut(), so don't wait a second time. */
  async signOut(options?: { synced?: boolean }) {
    // Last chance to send what's waiting; whatever is left syncs the next time this account signs in.
    if (!options?.synced && pendingCount() > 0) await waitForSync(SIGN_OUT_SYNC_MS);
    // Only this device: the website (and other phones) stay signed in.
    await supabase?.auth.signOut({ scope: "local" });
  },
  chooseLearner(id: string) {
    if (state.status !== "signed-in") return;
    const learner = state.learners.find((entry) => entry.id === id);
    if (!learner) return;
    try {
      Storage.setItemSync(ACTIVE_LEARNER_KEY, id);
    } catch {
      // Only this session remembers it.
    }
    set({ ...state, activeLearner: learner });
  },
};
