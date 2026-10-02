import type { Session } from "@supabase/supabase-js";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import type { Database } from "@/lib/database.types";
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

/** Mirrors the website's getSession(): profile, learners, and the active learner (own learner by default). */
async function loadSession(session: Session | null) {
  if (!supabase || !session) {
    set({ status: "guest", configured: !!supabase });
    return;
  }
  const userId = session.user.id;
  const [{ data: profile }, { data: learners }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("learners").select("*").eq("owner_id", userId).order("created_at"),
  ]);
  const list = learners ?? [];
  let chosen: string | null = null;
  try {
    chosen = Storage.getItemSync(ACTIVE_LEARNER_KEY);
  } catch {
    // Default below.
  }
  const activeLearner = list.find((learner) => learner.id === chosen) ?? list.find((learner) => learner.kind === "self") ?? list[0] ?? null;
  set({
    status: "signed-in",
    userId,
    email: session.user.email ?? profile?.email ?? "",
    profile: profile ?? null,
    learners: list,
    activeLearner,
  });
}

if (supabase) {
  supabase.auth.getSession().then(({ data }) => loadSession(data.session));
  supabase.auth.onAuthStateChange((event, session) => {
    // Token refreshes don't change who is signed in; skip the extra round trip.
    if (event === "TOKEN_REFRESHED") return;
    loadSession(session);
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

export type SignInResult = { ok: true } | { ok: false; message: string };

/** Same messages as the website's authErrorMessage() for the cases a sign-in form can hit. */
function signInMessage(code: string | undefined, message: string): string {
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (code === "email_not_confirmed") return "لم يتم تأكيد البريد بعد. أكمل التأكيد من الموقع ثم سجّل الدخول.";
  if (code === "over_request_rate_limit" || /rate limit/i.test(message)) return "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.";
  return "تعذّر تسجيل الدخول الآن. تحقق من الاتصال وحاول مجددًا.";
}

export const account = {
  async signIn(email: string, password: string): Promise<SignInResult> {
    if (!supabase) return { ok: false, message: "تسجيل الدخول غير مفعّل في هذه النسخة." };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return error ? { ok: false, message: signInMessage(error.code, error.message) } : { ok: true };
  },
  async signOut() {
    await supabase?.auth.signOut();
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
