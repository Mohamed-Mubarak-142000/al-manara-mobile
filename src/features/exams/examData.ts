import type { CertificateRow } from "@/lib/database.types";
import { api } from "@/lib/api";
import { track } from "@/lib/telemetry";
import { supabase } from "@/lib/supabase";

/** What the learner sees of a question; the answer key never leaves the server. */
export interface ExamQuestion {
  id: string;
  type: "next" | "complete" | "missing" | "surah";
  surah: number;
  ayah: number;
  prompt: string;
  options: string[];
}

export interface ExamSettings {
  exam_question_count: number;
  exam_pass_percent: number;
  exam_minutes: number;
  retry_cooldown_hours: number;
}

const DEFAULT_SETTINGS: ExamSettings = { exam_question_count: 20, exam_pass_percent: 80, exam_minutes: 30, retry_cooldown_hours: 24 };

/** The website's JuzExamStatus. */
export type JuzExamStatus =
  | { kind: "certified"; certificate: Pick<CertificateRow, "verification_code" | "score" | "total" | "issued_at"> }
  | { kind: "in-progress"; expiresAt: string }
  | { kind: "cooldown"; retryAt: string; lastScore: number | null; total: number }
  | { kind: "available"; lastScore: number | null; total: number | null };

export async function getExamSettings(): Promise<ExamSettings> {
  if (!supabase) return DEFAULT_SETTINGS;
  const { data } = await supabase
    .from("app_settings")
    .select("exam_question_count, exam_pass_percent, exam_minutes, retry_cooldown_hours")
    .eq("id", true)
    .maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

/** The website's getExamOverview(): the status of all 30 juz exams, read with the learner's own session. */
export async function getExamOverview(learnerId: string, cooldownHours: number): Promise<Record<number, JuzExamStatus>> {
  const overview: Record<number, JuzExamStatus> = {};
  if (!supabase) return overview;
  const [{ data: certificates }, { data: attempts }] = await Promise.all([
    supabase.from("certificates").select("juz, verification_code, score, total, issued_at, revoked_at").eq("learner_id", learnerId),
    supabase
      .from("exam_attempts")
      .select("juz, status, score, total, expires_at, submitted_at, started_at")
      .eq("learner_id", learnerId)
      .order("started_at", { ascending: false })
      .limit(300),
  ]);
  const now = Date.now();
  for (let juz = 1; juz <= 30; juz += 1) {
    const certificate = certificates?.find((entry) => entry.juz === juz && !entry.revoked_at);
    if (certificate) {
      overview[juz] = { kind: "certified", certificate };
      continue;
    }
    const latest = attempts?.find((attempt) => attempt.juz === juz);
    if (latest?.status === "in_progress" && new Date(latest.expires_at).getTime() > now) {
      overview[juz] = { kind: "in-progress", expiresAt: latest.expires_at };
      continue;
    }
    if (latest && latest.status !== "passed" && cooldownHours > 0) {
      const retryAt = new Date(latest.submitted_at ?? latest.expires_at).getTime() + cooldownHours * 3600_000;
      if (retryAt > now) {
        overview[juz] = { kind: "cooldown", retryAt: new Date(retryAt).toISOString(), lastScore: latest.score, total: latest.total };
        continue;
      }
    }
    overview[juz] = { kind: "available", lastScore: latest?.score ?? null, total: latest?.total ?? null };
  }
  return overview;
}

export interface ActiveAttempt {
  id: string;
  juz: number;
  questions: ExamQuestion[];
  expiresAt: string;
}

export async function getAttempt(attemptId: string): Promise<ActiveAttempt | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("exam_attempts").select("id, juz, questions, expires_at, status").eq("id", attemptId).maybeSingle();
  if (!data || data.status !== "in_progress") return null;
  return { id: data.id, juz: data.juz, questions: data.questions as unknown as ExamQuestion[], expiresAt: data.expires_at };
}

export interface SubmitResult {
  status: "passed" | "failed" | "expired";
  score: number;
  total: number;
  passPercent: number;
  perQuestion: boolean[];
  certificateCode?: string;
}

export const exams = {
  start: (juz: number) => api<{ attemptId: string; resumed: boolean }>("/api/v1/exams/start", { juz }),
  submit: async (attemptId: string, answers: number[]) => {
    const result = await api<SubmitResult>("/api/v1/exams/submit", { attemptId, answers });
    if (result.ok) track("exam_submitted", { status: result.status });
    return result;
  },
};

export async function getMyCertificates(learnerIds: string[]) {
  if (!supabase || learnerIds.length === 0) return [];
  const { data } = await supabase
    .from("certificates")
    .select("juz, verification_code, holder_name, score, total, issued_at, revoked_at, learner_id")
    .in("learner_id", learnerIds)
    .is("revoked_at", null)
    .order("issued_at", { ascending: false });
  return data ?? [];
}
