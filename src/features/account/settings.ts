import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

import { account } from "./accountStore";

/**
 * The website's account actions (features/account/actions.ts, announcements and reminders actions),
 * done with the user's own session and RLS; only account deletion goes through the website's API.
 */

export type SettingsResult = { ok: true; message: string } | { ok: false; error: string };

const GENERIC_ERROR = "تعذّر حفظ التغييرات، حاول مرة أخرى.";
export const MAX_CHILDREN = 8;
export const REMINDER_TOPICS = [
  { column: "remind_friday", label: "تذكير الجمعة وسورة الكهف" },
  { column: "remind_fasting", label: "تذكير صيام الاثنين والخميس والأيام البيض" },
  { column: "remind_seasons", label: "المواسم: رمضان، العشر من ذي الحجة، عرفة، عاشوراء" },
] as const;
export type ReminderColumn = (typeof REMINDER_TOPICS)[number]["column"];

function nameProblem(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "الاسم قصير جدًا";
  if (trimmed.length > 60) return "الاسم طويل جدًا";
  return null;
}

function birthYearProblem(year: string): string | null {
  if (!year.trim()) return null;
  const value = Number(year);
  return Number.isInteger(value) && value >= 1990 && value <= new Date().getFullYear() ? null : "سنة الميلاد غير صحيحة";
}

async function userId(): Promise<string | null> {
  return (await supabase?.auth.getUser())?.data.user?.id ?? null;
}

export const settings = {
  async updateProfile(fullName: string, certificateName: string): Promise<SettingsResult> {
    const problem = nameProblem(fullName) ?? (certificateName.trim() ? nameProblem(certificateName) : null);
    if (problem) return { ok: false, error: problem };
    const id = await userId();
    if (!supabase || !id) return { ok: false, error: GENERIC_ERROR };
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), certificate_name: certificateName.trim() })
      .eq("id", id);
    if (error) return { ok: false, error: GENERIC_ERROR };
    await account.reload();
    return { ok: true, message: "تم حفظ بياناتك." };
  },

  async addChild(displayName: string, birthYear: string, childCount: number): Promise<SettingsResult> {
    if (childCount >= MAX_CHILDREN) return { ok: false, error: `يمكن إضافة ${MAX_CHILDREN} أطفال بحدّ أقصى.` };
    const problem = nameProblem(displayName) ?? birthYearProblem(birthYear);
    if (problem) return { ok: false, error: problem };
    const id = await userId();
    if (!supabase || !id) return { ok: false, error: GENERIC_ERROR };
    const { error } = await supabase
      .from("learners")
      .insert({ owner_id: id, kind: "child", display_name: displayName.trim(), birth_year: birthYear.trim() ? Number(birthYear) : null });
    if (error) return { ok: false, error: GENERIC_ERROR };
    await account.reload();
    return { ok: true, message: `أُضيف ${displayName.trim()} إلى حسابك.` };
  },

  async updateChild(learnerId: string, displayName: string, birthYear: string): Promise<SettingsResult> {
    const problem = nameProblem(displayName) ?? birthYearProblem(birthYear);
    if (problem) return { ok: false, error: problem };
    if (!supabase) return { ok: false, error: GENERIC_ERROR };
    const { error } = await supabase
      .from("learners")
      .update({ display_name: displayName.trim(), birth_year: birthYear.trim() ? Number(birthYear) : null })
      .eq("id", learnerId)
      .eq("kind", "child");
    if (error) return { ok: false, error: GENERIC_ERROR };
    await account.reload();
    return { ok: true, message: "تم الحفظ." };
  },

  /** Deletes the child's learner row, which removes all their progress (database cascade). */
  async removeChild(learnerId: string, name: string): Promise<SettingsResult> {
    if (!supabase) return { ok: false, error: GENERIC_ERROR };
    const { error } = await supabase.from("learners").delete().eq("id", learnerId).eq("kind", "child");
    if (error) return { ok: false, error: GENERIC_ERROR };
    await account.reload();
    return { ok: true, message: `حُذف ملف ${name} وكل تقدّمه.` };
  },

  async changePassword(password: string, confirm: string): Promise<SettingsResult> {
    if (password.length < 8) return { ok: false, error: "كلمة المرور ٨ أحرف على الأقل" };
    if (password.length > 72) return { ok: false, error: "كلمة المرور طويلة جدًا" };
    if (password !== confirm) return { ok: false, error: "كلمتا المرور غير متطابقتين" };
    if (!supabase) return { ok: false, error: GENERIC_ERROR };
    const { error } = await supabase.auth.updateUser({ password });
    if (error?.code === "same_password") return { ok: false, error: "كلمة المرور الجديدة يجب أن تختلف عن القديمة." };
    if (error) return { ok: false, error: GENERIC_ERROR };
    return { ok: true, message: "تم تغيير كلمة المرور." };
  },

  async setEmailUpdates(enabled: boolean): Promise<SettingsResult> {
    const id = await userId();
    if (!supabase || !id) return { ok: false, error: GENERIC_ERROR };
    const { error } = await supabase.from("profiles").update({ email_updates: enabled }).eq("id", id);
    if (error) return { ok: false, error: GENERIC_ERROR };
    await account.reload();
    return { ok: true, message: enabled ? "ستصلك رسائل التحديثات." : "لن تصلك رسائل التحديثات بعد الآن." };
  },

  async setReminder(column: ReminderColumn, enabled: boolean): Promise<SettingsResult> {
    const id = await userId();
    if (!supabase || !id) return { ok: false, error: GENERIC_ERROR };
    const patch: Partial<Record<ReminderColumn, boolean>> = { [column]: enabled };
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) return { ok: false, error: GENERIC_ERROR };
    await account.reload();
    return { ok: true, message: enabled ? "ستصلك هذه التذكيرات." : "لن تصلك هذه التذكيرات بعد الآن." };
  },

  /** Permanent: the website deletes the account and everything under it, then this device signs out. */
  async deleteAccount(confirm: string): Promise<SettingsResult> {
    const result = await api("/api/v1/account/delete", { confirm });
    if (!result.ok) return { ok: false, error: result.error };
    await supabase?.auth.signOut({ scope: "local" });
    return { ok: true, message: "حُذف حسابك." };
  },
};
