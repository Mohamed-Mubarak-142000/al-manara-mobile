import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export type OtpType = "signup" | "recovery" | "email";
export type FlowResult = { ok: true } | { ok: false; error: string };

/**
 * Account creation, codes and password reset through the website's /api/v1/auth routes, which send
 * the same 6-digit emails as the website. Sign-in with a password goes straight to Supabase.
 */
export const authFlows = {
  async register(fullName: string, email: string, password: string): Promise<FlowResult> {
    const result = await api("/api/v1/auth/register", { fullName, email, password });
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  },

  async sendCode(email: string, type: OtpType): Promise<FlowResult> {
    const result = await api("/api/v1/auth/code", { email, type });
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  },

  /** Checks the code on the server, then starts the session on this device with the returned token hash. */
  async verify(email: string, type: OtpType, code: string): Promise<FlowResult> {
    if (!supabase) return { ok: false, error: "الحسابات غير مفعّلة في هذه النسخة." };
    const result = await api<{ tokenHash: string }>("/api/v1/auth/verify", { email, type, code });
    if (!result.ok) return { ok: false, error: result.error };
    const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: result.tokenHash });
    return error ? { ok: false, error: "انتهت صلاحية الكود، اطلب كودًا جديدًا." } : { ok: true };
  },

  /** After a recovery code signed the user in, the new password is set with their own session. */
  async setPassword(password: string): Promise<FlowResult> {
    if (!supabase) return { ok: false, error: "الحسابات غير مفعّلة في هذه النسخة." };
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) return { ok: true };
    if (error.code === "same_password") return { ok: false, error: "كلمة المرور الجديدة يجب أن تختلف عن القديمة." };
    if (error.code === "weak_password") return { ok: false, error: "كلمة المرور ضعيفة — استخدم ٨ أحرف على الأقل مع أرقام وحروف." };
    return { ok: false, error: "تعذّر تغيير كلمة المرور، حاول مرة أخرى." };
  },
};
