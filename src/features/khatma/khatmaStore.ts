import Storage from "expo-sqlite/kv-store";
import { useEffect, useSyncExternalStore } from "react";

import { nextPortion, pagesForDuration, TOTAL_AYAHS } from "@/core/khatma/schedule";
import { planDay } from "@/core/plan/schedule";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { mushafBoundaries } from "@/features/mushaf/mushaf";
import type { KhatmaRow, KhatmaUnit } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import type { KhatmaWithLog } from "./types";

/**
 * The current khatma, with the website's rules (features/khatma/actions.ts). Signed in: the learner's
 * own khatmas/khatma_log rows, so it follows them to the website. Guest: the same shape on this device.
 */

export type KhatmaState = { status: "loading" } | { status: "ready"; current: KhatmaWithLog | null; owner: string | null };

export interface NewKhatma {
  mode: "amount" | "duration";
  unit: KhatmaUnit;
  perSession: number;
  targetDay: string;
  days: number[];
}

export type KhatmaResult = { ok: true } | { ok: false; error: string };

const LOCAL_KEY = "al-manara:khatma:v1";
const GENERIC_ERROR = "تعذّر حفظ الختمة، حاول مرة أخرى.";
const UNIQUE_VIOLATION = "23505";

let state: KhatmaState = { status: "loading" };
const listeners = new Set<() => void>();

function set(next: KhatmaState) {
  state = next;
  listeners.forEach((notify) => notify());
}

// ── Guest storage ────────────────────────────────────────────────────────────

interface LocalKhatmas {
  current: KhatmaWithLog | null;
  finished: number;
}

function readLocal(): LocalKhatmas {
  try {
    return (JSON.parse(Storage.getItemSync(LOCAL_KEY) ?? "null") as LocalKhatmas | null) ?? { current: null, finished: 0 };
  } catch {
    return { current: null, finished: 0 };
  }
}

function writeLocal(next: LocalKhatmas) {
  Storage.setItemSync(LOCAL_KEY, JSON.stringify(next));
  set({ status: "ready", current: next.current ? { ...next.current, finished: next.finished } : null, owner: null });
}

// ── Account storage (the website's loadCurrentKhatma) ────────────────────────

async function loadRemote(learnerId: string): Promise<KhatmaWithLog | null> {
  if (!supabase) return null;
  const [{ data: khatma }, { count }] = await Promise.all([
    supabase
      .from("khatmas")
      .select("*")
      .eq("learner_id", learnerId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("khatmas").select("id", { count: "exact", head: true }).eq("learner_id", learnerId).not("completed_at", "is", null),
  ]);
  if (!khatma) return null;
  const { data: log } = await supabase
    .from("khatma_log")
    .select("day, from_ayah, to_ayah")
    .eq("khatma_id", khatma.id)
    .order("day", { ascending: false })
    .limit(400);
  return { khatma, log: log ?? [], finished: count ?? 0 };
}

let loadedFor: string | null | undefined;

async function refresh(learnerId: string | null) {
  loadedFor = learnerId;
  if (!learnerId) {
    const local = readLocal();
    set({ status: "ready", current: local.current ? { ...local.current, finished: local.finished } : null, owner: null });
    return;
  }
  const current = await loadRemote(learnerId).catch(() => null);
  if (loadedFor === learnerId) set({ status: "ready", current, owner: learnerId });
}

/** The khatma for whoever is using the app now (the active learner, or the guest). */
export function useKhatma(): KhatmaState {
  const learnerId = activeLearnerId(useAccount());
  useEffect(() => {
    if (loadedFor !== learnerId) refresh(learnerId);
  }, [learnerId]);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

function owner(): string | null {
  return state.status === "ready" ? state.owner : null;
}

/** The validation of the website's createKhatmaAction schema. */
function validate(input: NewKhatma): { unit: KhatmaUnit; perSession: number } | string {
  if (input.days.length === 0) return "اختر يومًا واحدًا على الأقل للقراءة";
  if (input.mode === "duration") {
    if (!input.targetDay) return "اختر تاريخ الختم";
    if (input.targetDay < planDay()) return "اختر تاريخًا قادمًا";
    const pages = pagesForDuration(planDay(), input.targetDay, input.days);
    if (pages === null) return "لا يوم قراءة قبل هذا التاريخ، اختر تاريخًا أبعد أو أيامًا أكثر.";
    return { unit: "pages", perSession: pages };
  }
  return { unit: input.unit, perSession: input.perSession };
}

export const khatma = {
  async create(input: NewKhatma): Promise<KhatmaResult> {
    const amount = validate(input);
    if (typeof amount === "string") return { ok: false, error: amount };
    const days = [...new Set(input.days)].sort();
    const learnerId = owner();

    if (!learnerId || !supabase) {
      const local = readLocal();
      const row: KhatmaRow = {
        id: `local-${Date.now()}`,
        learner_id: "guest",
        unit: amount.unit,
        per_session: amount.perSession,
        mode: input.mode,
        target_day: input.mode === "duration" ? input.targetDay : null,
        days,
        position: 0,
        status: "active",
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      writeLocal({ current: { khatma: row, log: [], finished: local.finished }, finished: local.finished });
      return { ok: true };
    }

    const { error: archiveError } = await supabase
      .from("khatmas")
      .update({ status: "archived" })
      .eq("learner_id", learnerId)
      .neq("status", "archived");
    if (archiveError) return { ok: false, error: GENERIC_ERROR };
    const { error } = await supabase.from("khatmas").insert({
      learner_id: learnerId,
      unit: amount.unit,
      per_session: amount.perSession,
      mode: input.mode,
      target_day: input.mode === "duration" ? input.targetDay : null,
      days,
    });
    if (error) return { ok: false, error: GENERIC_ERROR };
    await refresh(learnerId);
    return { ok: true };
  },

  /** Marks today's portion read and moves on; the last one finishes the khatma. Safe to press twice. */
  async completeToday(): Promise<KhatmaResult> {
    if (state.status !== "ready" || !state.current || state.current.khatma.status !== "active")
      return { ok: false, error: "لا توجد ختمة جارية." };
    const { khatma: row, log } = state.current;
    const today = planDay();
    if (log.some((entry) => entry.day === today)) return { ok: true };
    const portion = nextPortion(row, mushafBoundaries());
    if (!portion) return { ok: true };
    const finished = portion.to >= TOTAL_AYAHS;
    const learnerId = owner();

    if (!learnerId || !supabase) {
      const local = readLocal();
      if (!local.current) return { ok: false, error: "لا توجد ختمة جارية." };
      const updated: KhatmaRow = {
        ...local.current.khatma,
        position: portion.to,
        ...(finished && { status: "completed" as const, completed_at: new Date().toISOString() }),
      };
      const total = local.finished + (finished ? 1 : 0);
      writeLocal({
        current: {
          khatma: updated,
          log: [{ day: today, from_ayah: portion.from, to_ayah: portion.to }, ...local.current.log],
          finished: total,
        },
        finished: total,
      });
      return { ok: true };
    }

    const { error: logError } = await supabase
      .from("khatma_log")
      .insert({ khatma_id: row.id, learner_id: learnerId, day: today, from_ayah: portion.from, to_ayah: portion.to });
    if (logError && logError.code !== UNIQUE_VIOLATION) return { ok: false, error: GENERIC_ERROR };
    if (!logError) {
      const { error } = await supabase
        .from("khatmas")
        .update({ position: portion.to, ...(finished && { status: "completed" as const, completed_at: new Date().toISOString() }) })
        .eq("id", row.id)
        .eq("position", portion.from);
      if (error) return { ok: false, error: GENERIC_ERROR };
    }
    await refresh(learnerId);
    return { ok: true };
  },

  /** Ends the current khatma (kept in history on the account) so a new one can begin. */
  async archive(): Promise<KhatmaResult> {
    const learnerId = owner();
    if (!learnerId || !supabase) {
      writeLocal({ current: null, finished: readLocal().finished });
      return { ok: true };
    }
    const { error } = await supabase.from("khatmas").update({ status: "archived" }).eq("learner_id", learnerId).neq("status", "archived");
    if (error) return { ok: false, error: GENERIC_ERROR };
    await refresh(learnerId);
    return { ok: true };
  },
};
