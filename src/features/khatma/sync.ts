import { registerHandler, throwIfError as check } from "@/lib/outbox";
import { supabase } from "@/lib/supabase";

import type { KhatmaOp } from "./reducer";

/**
 * Sends a khatma step to the account, with the website's rules (features/khatma/actions.ts). Every
 * handler is safe to run twice: rows carry their client id or primary key and are inserted with
 * "ignore duplicates", and the position only moves from where the step expected it.
 */

export const KHATMA_OP = "khatma";

export type KhatmaSyncPayload = KhatmaOp & { learnerId: string; createdAt?: string };

export async function sendKhatmaOp(payload: KhatmaSyncPayload) {
  if (!supabase) return;
  const { learnerId } = payload;
  switch (payload.type) {
    case "create": {
      // One running khatma per learner: the new one replaces whatever came before.
      check(
        await supabase
          .from("khatmas")
          .update({ status: "archived" })
          .eq("learner_id", learnerId)
          .neq("status", "archived")
          .neq("id", payload.row.id),
      );
      const { id, unit, per_session, mode, target_day, days, created_at } = payload.row;
      check(
        await supabase
          .from("khatmas")
          .upsert(
            { id, learner_id: learnerId, unit, per_session, mode, target_day, days, created_at },
            { onConflict: "id", ignoreDuplicates: true },
          ),
      );
      return;
    }
    case "complete": {
      check(
        await supabase
          .from("khatma_log")
          .upsert(
            { khatma_id: payload.khatmaId, learner_id: learnerId, day: payload.day, from_ayah: payload.from, to_ayah: payload.to },
            { onConflict: "khatma_id,day", ignoreDuplicates: true },
          ),
      );
      check(
        await supabase
          .from("khatmas")
          .update({ position: payload.to, ...(payload.finished && { status: "completed" as const, completed_at: payload.at }) })
          .eq("id", payload.khatmaId)
          .eq("position", payload.from),
      );
      return;
    }
    case "archive": {
      // This khatma and any older one still open, but not one started later (e.g. on the website).
      let query = supabase.from("khatmas").update({ status: "archived" }).eq("learner_id", learnerId).neq("status", "archived");
      query = payload.createdAt ? query.lte("created_at", payload.createdAt) : query.eq("id", payload.khatmaId);
      check(await query);
      return;
    }
  }
}

registerHandler<KhatmaSyncPayload>(KHATMA_OP, sendKhatmaOp);
