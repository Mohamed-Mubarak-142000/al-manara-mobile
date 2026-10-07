import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

/**
 * Support goes by InstaPay: the user transfers to this number, then sends the screenshot from /support.
 * An admin checks the transfer on the website (/admin/supporters) before anything shows.
 */
export const INSTAPAY_NUMBER = "01050867135";

/** Quick amounts in EGP on /support; any other amount can be typed. */
export const QUICK_AMOUNTS = [50, 100, 200, 500] as const;

/** What an approved supporter gets; shown on /support and in the onboarding support step. */
export const SUPPORTER_PERKS = ["اسمك في قسم «داعمي المنارة» بالرئيسية", "ألوان إضافية لصفحات المصحف", "أجر المساهمة في نشر القرآن بإذن الله"] as const;

// ── Supporter flag (cosmetic perks only; nothing in the app is locked behind it) ──
// Set once the account has an approved donation (features/support/donationApi.ts), and kept on the
// device so the mushaf colours stay unlocked offline.

const KEY = "al-manara:supporter:v1";
let supporter: boolean | null = null;
const listeners = new Set<() => void>();

function read(): boolean {
  if (supporter !== null) return supporter;
  try {
    supporter = Storage.getItemSync(KEY) === "1";
  } catch {
    supporter = false;
  }
  return supporter;
}

export function setSupporter(value: boolean) {
  if (read() === value) return;
  supporter = value;
  try {
    Storage.setItemSync(KEY, value ? "1" : "0");
  } catch {
    // Set again from the account next time.
  }
  listeners.forEach((notify) => notify());
}

export function useSupporter(): boolean {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, read);
}
