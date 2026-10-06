import { background } from "../../../modules/almanara-background";

/**
 * Android: after a reminder is turned on, ask for exact alarms so Doze cannot postpone it. Battery
 * and autostart are explained by BackgroundAccessHint instead: their settings are system lists that
 * would confuse if opened unannounced.
 */
export async function requestBackgroundAccess() {
  if (!background) return;
  try {
    if (!background.getStatus().exactAllowed) await background.openAlarmSettings();
  } catch {
    // The reminder is already saved; BackgroundAccessHint still offers these settings.
  }
}
