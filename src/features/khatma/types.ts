import type { KhatmaLogRow, KhatmaRow } from "@/lib/database.types";

/** The same shape the website's loadCurrentKhatma() returns, whether it came from Supabase or the device. */
export interface KhatmaWithLog {
  khatma: KhatmaRow;
  log: Pick<KhatmaLogRow, "day" | "from_ayah" | "to_ayah">[];
  /** How many khatmas this learner has finished, this one included. */
  finished: number;
}
