import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export type OtpType = "signup" | "recovery" | "email";
export type FlowResult = { ok: true } | { ok: false; error: string };

/**
 * Account creation and password reset through the website's /api/v1/auth routes. Like the website,
 * sign-up needs no emailed code: the account is created confirmed and signed in right away. Codes are
 * only for "forgot password". Sign-in with a password goes straight to Supabase.
 */
export const authFlows = {
  async register(fullName: string, email: string, password: string): Promise<FlowResult> {
    const result = await api("/api/v1/auth/register", { fullName, email, password });
    if (!result.ok) return { ok: false, error: result.error };
    if (!supabase) return { ok: false, error: "الحسابات غير مفعّلة في هذه النسخة." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { ok: false, error: "أُنشئ حسابك، لكن تعذّر تسجيل الدخول الآن. سجّل الدخول من جديد." } : { ok: true };
  },

  /** An account left unconfirmed by the old signup-code flow: the server confirms it once the password checks out. */
  async confirmLegacy(email: string, password: string): Promise<FlowResult> {
    const result = await api("/api/v1/auth/confirm", { email, password });
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

/** The app's deep link Supabase sends the user back to after Google (allow-listed in Supabase Auth). */
export const OAUTH_REDIRECT = Linking.createURL("auth/callback");

/**
 * Google sign-in with the website's Supabase Google provider: a secure browser sheet to Google, back to
 * the app with a PKCE code, exchanged for a session here. Returns ok: false with no error when the user
 * closes the sheet.
 */
export async function signInWithGoogle(): Promise<FlowResult | { ok: false; error: null }> {
  if (!supabase) return { ok: false, error: "الحسابات غير مفعّلة في هذه النسخة." };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) return { ok: false, error: "تعذّر بدء الدخول بجوجل الآن." };
  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT);
  if (result.type !== "success") return { ok: false, error: null };
  const params = new URL(result.url).searchParams;
  const code = params.get("code");
  if (!code) return { ok: false, error: params.get("error_description") ?? "لم يكتمل الدخول بجوجل." };
  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  return exchanged.error ? { ok: false, error: "لم يكتمل الدخول بجوجل، حاول مرة أخرى." } : { ok: true };
}
