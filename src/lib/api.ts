import { activeLearnerIdNow } from "@/features/account/accountStore";

import { supabase } from "./supabase";

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string; status: number };

/**
 * Calls the website's /api/v1 routes (eslam-platform), the server half of this app for anything that
 * needs a secret: account codes, exams, certificates. Sends the Supabase session as a Bearer token and
 * the active learner, like the website's cookie session.
 */
export async function api<T extends object>(path: `/api/v1/${string}`, body: unknown): Promise<ApiResult<T>> {
  if (!SITE_URL) return { ok: false, error: "عنوان الموقع غير مضبوط في هذه النسخة.", status: 0 };
  const headers: Record<string, string> = { "content-type": "application/json" };
  const session = (await supabase?.auth.getSession())?.data.session;
  if (session) headers.authorization = `Bearer ${session.access_token}`;
  const learnerId = activeLearnerIdNow();
  if (learnerId) headers["x-learner-id"] = learnerId;

  try {
    const response = await fetch(`${SITE_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    const json = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) return { ok: false, error: json.error ?? "حدث خطأ، حاول مرة أخرى.", status: response.status };
    return { ok: true, ...json };
  } catch {
    return { ok: false, error: "تعذّر الاتصال. تحقق من الإنترنت وحاول مجددًا.", status: 0 };
  }
}
