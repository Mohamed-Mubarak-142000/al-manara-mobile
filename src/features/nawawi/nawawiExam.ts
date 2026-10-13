import { partStatuses, type NawawiPartStatus } from "@/core/nawawi/overview";
import type { NawawiQuestion } from "@/core/nawawi/nawawiData";
import type { NawawiCertificateRow } from "@/lib/database.types";
import { api } from "@/lib/api";
import type { SubmitResult } from "@/features/exams/examData";
import { track } from "@/lib/telemetry";
import { supabase } from "@/lib/supabase";

export interface NawawiOverview {
  /** Parts 1–4 and the final (5). */
  parts: Record<number, NawawiPartStatus>;
  certificate: Pick<NawawiCertificateRow, "verification_code" | "score" | "total" | "issued_at"> | null;
}

/** The website's getNawawiOverview(), read with the learner's own session (RLS lets owners read). Null when it failed. */
export async function getNawawiOverview(learnerId: string): Promise<NawawiOverview | null> {
  if (!supabase) return null;
  try {
    const [certificate, attempts] = await Promise.all([
      supabase
        .from("nawawi_certificates")
        .select("verification_code, score, total, issued_at, revoked_at")
        .eq("learner_id", learnerId)
        .maybeSingle(),
      supabase
        .from("nawawi_attempts")
        .select("part, status, score, total, expires_at")
        .eq("learner_id", learnerId)
        .order("started_at", { ascending: false })
        .limit(200),
    ]);
    if (certificate.error || attempts.error) return null;
    const row = certificate.data;
    return { parts: partStatuses(attempts.data ?? []), certificate: row && !row.revoked_at ? row : null };
  } catch {
    return null;
  }
}

export interface ActiveNawawiAttempt {
  id: string;
  part: number;
  questions: NawawiQuestion[];
  expiresAt: string;
}

/** The attempt's questions (never the key, which only the server reads). */
export async function getNawawiAttempt(attemptId: string): Promise<ActiveNawawiAttempt | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("nawawi_attempts")
    .select("id, part, questions, expires_at, status")
    .eq("id", attemptId)
    .maybeSingle();
  if (!data || data.status !== "in_progress") return null;
  return { id: data.id, part: data.part, questions: data.questions as NawawiQuestion[], expiresAt: data.expires_at };
}

/** Same response shape as the juz exams'. */
export const nawawiExams = {
  start: (part: number) => api<{ attemptId: string; resumed: boolean }>("/api/v1/nawawi/start", { part }),
  submit: async (attemptId: string, answers: number[]) => {
    const result = await api<SubmitResult>("/api/v1/nawawi/submit", { attemptId, answers });
    if (result.ok) track("exam_submitted", { status: result.status, course: "nawawi" });
    return result;
  },
};
