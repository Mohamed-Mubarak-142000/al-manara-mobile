import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { useCallback, useEffect, useState } from "react";

import { useAccount } from "@/features/account/accountStore";
import type { SupporterRow } from "@/lib/database.types";
import { track } from "@/lib/telemetry";
import { supabase } from "@/lib/supabase";

import { setSupporter } from "./supportStore";

/**
 * InstaPay donations (supabase/migrations/20261007000001_supporters.sql on the website). The screenshot
 * goes to the private donation_receipts bucket under the user's own folder, then a pending row is added;
 * RLS lets users add and read only their own. An admin approves or rejects it at /admin/supporters.
 */

const RECEIPT_BUCKET = "donation_receipts";
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const FAILED = "تعذّر إرسال طلبك الآن، حاول مرة أخرى بعد قليل.";

export type MyDonation = Pick<SupporterRow, "id" | "status" | "reject_reason" | "amount" | "created_at">;

export interface NewDonation {
  amount: number;
  sender: string;
  displayName: string;
  message: string;
  showName: boolean;
  receipt: { uri: string; mimeType?: string | null | undefined };
}

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

/** Field problems in Arabic, or null when the form can be sent. */
export function donationProblem(input: Omit<NewDonation, "receipt"> & { receipt: NewDonation["receipt"] | null }): string | null {
  if (!Number.isInteger(input.amount) || input.amount < 1) return "اكتب المبلغ الذي حوّلته";
  if (input.amount > 1_000_000) return "المبلغ كبير جدًا";
  if (input.displayName.trim().length < 2) return "اكتب اسمك";
  if (input.displayName.trim().length > 60) return "الاسم طويل جدًا";
  if (input.sender.trim().length < 2) return "اكتب اسم أو رقم المحوِّل في إنستاباي";
  if (input.sender.trim().length > 60) return "اسم المحوِّل طويل جدًا";
  const message = input.message.trim();
  if (message.length === 1 || message.length > 140) return "الرسالة من حرفين إلى ١٤٠ حرفًا";
  if (!input.receipt) return "ارفع صورة التحويل";
  return null;
}

export async function submitDonation(input: NewDonation): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: FAILED };
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: "سجّل الدخول أولًا لإرسال دعمك." };

  const contentType = input.receipt.mimeType && EXTENSIONS[input.receipt.mimeType] ? input.receipt.mimeType : "image/jpeg";
  let body: ArrayBuffer;
  try {
    body = await new File(input.receipt.uri).arrayBuffer();
  } catch {
    return { ok: false, error: "تعذّر قراءة الصورة، اختر صورة أخرى." };
  }
  if (body.byteLength > MAX_RECEIPT_BYTES) return { ok: false, error: "حجم الصورة كبير، اختر صورة أصغر من ٥ ميجابايت." };

  const path = `${userId}/${Crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
  const storage = supabase.storage.from(RECEIPT_BUCKET);
  const upload = await storage.upload(path, body, { contentType, upsert: false });
  if (upload.error) return { ok: false, error: FAILED };

  const message = input.message.trim();
  const { error } = await supabase.from("supporters").insert({
    display_name: input.displayName.trim(),
    message: message || null,
    show_name: input.showName,
    amount: input.amount,
    sender: input.sender.trim(),
    receipt_path: path,
  });
  if (error) {
    // The user can't delete from the bucket; an orphaned screenshot in their own folder is harmless.
    // One pending request at a time (supporters_one_pending_idx).
    return { ok: false, error: error.code === "23505" ? "لديك طلب قيد المراجعة بالفعل." : FAILED };
  }
  track("donation_submitted", { amount: input.amount });
  return { ok: true };
}

let supporterChecked: string | null = null;

/** Once per session and account: turns the supporter perks on when a request was approved since. */
export function syncSupporterFlag(userId: string) {
  if (!supabase || supporterChecked === userId) return;
  supporterChecked = userId;
  void Promise.resolve(supabase.from("supporters").select("id", { count: "exact", head: true }).eq("status", "approved"))
    .then(({ count, error }) => {
      if (!error && (count ?? 0) > 0) setSupporter(true);
    })
    .catch(() => {
      supporterChecked = null;
    });
}

/**
 * The signed-in user's latest request (null for none or a guest). Also turns the supporter perks on
 * once any of their requests was approved.
 */
export function useMyDonation(): { donation: MyDonation | null; loading: boolean; reload: () => void } {
  const account = useAccount();
  const userId = account.status === "signed-in" ? account.userId : null;
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  // Which load the result belongs to, so loading is derived instead of set at the start of the effect.
  const key = userId ? `${userId}:${version}` : null;
  const [result, setResult] = useState<{ key: string; donation: MyDonation | null } | null>(null);

  useEffect(() => {
    if (!supabase || !userId || !key) return;
    let cancelled = false;
    void Promise.all([
      supabase
        .from("supporters")
        .select("id, status, reject_reason, amount, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("supporters").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ])
      .then(([latest, approved]) => {
        if (cancelled) return;
        setResult({ key, donation: latest.data ?? null });
        if (!approved.error && (approved.count ?? 0) > 0) setSupporter(true);
      })
      .catch(() => {
        if (!cancelled) setResult({ key, donation: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key, userId]);

  if (!key) return { donation: null, loading: account.status === "loading", reload };
  const current = result?.key === key ? result : null;
  return { donation: current?.donation ?? null, loading: !current, reload };
}
