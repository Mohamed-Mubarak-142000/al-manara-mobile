import { runWrites, type KidsWrite } from "@/core/kids/pushDiff";
import { remoteWriter } from "@/core/kids/remoteProgress";
import { registerHandler } from "@/lib/outbox";
import { supabase } from "@/lib/supabase";

/**
 * Sends a kids progress change to the account: the website's remoteWriter calls, in order. Registered at
 * startup (root layout), so changes made offline in the kids area are sent even if the app is reopened
 * somewhere else.
 */
export const KIDS_PROGRESS_OP = "kids-progress";

export interface KidsProgressPayload {
  learnerId: string;
  writes: KidsWrite[];
}

registerHandler<KidsProgressPayload>(KIDS_PROGRESS_OP, async ({ learnerId, writes }) => {
  if (!supabase) return;
  await runWrites(remoteWriter(supabase, learnerId), writes);
});
