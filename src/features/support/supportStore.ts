import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

/**
 * Store product ids, created with the same ids in App Store Connect and Google Play Console.
 * Everything is a one-time purchase: no subscriptions. Donations are consumable (can be given again);
 * the supporter pack is non-consumable (bought once, restored on a new phone).
 */
export const DONATIONS = [
  { id: "almanara.donation.small", label: "صدقة صغيرة", note: "تكفي لاستضافة المنارة لعشرات المستخدمين شهرًا" },
  { id: "almanara.donation.medium", label: "صدقة متوسطة", note: "تساعد في إضافة قرّاء وروايات جديدة" },
  { id: "almanara.donation.large", label: "صدقة كبيرة", note: "تدعم تطوير قسم الأطفال ولوحات الحلقات" },
] as const;

export const SUPPORTER_PACK = "almanara.supporter.lifetime";

/** What the supporter pack gives; shown on /support and in the onboarding support step. */
export const SUPPORTER_PERKS = ["ألوان إضافية لصفحات المصحف", "شكر خاص في صفحة الداعمين", "أجر المساهمة في نشر القرآن بإذن الله"] as const;

export const ALL_PRODUCT_IDS = [...DONATIONS.map((donation) => donation.id), SUPPORTER_PACK];

export function isDonation(productId: string): boolean {
  return DONATIONS.some((donation) => donation.id === productId);
}

// ── Supporter entitlement (cosmetic perks only; nothing in the app is locked behind it) ──

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
  supporter = value;
  try {
    Storage.setItemSync(KEY, value ? "1" : "0");
  } catch {
    // Restored again from the store next time.
  }
  listeners.forEach((notify) => notify());
}

export function useSupporter(): boolean {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, read);
}
