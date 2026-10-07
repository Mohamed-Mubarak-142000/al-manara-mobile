import { background } from "../../../modules/almanara-background";

/**
 * Android: nothing to open any more. Exact alarms come with USE_EXACT_ALARM at install, and the native
 * scheduler falls back to an inexact alarm without them, so turning a reminder on never jumps to a
 * system screen. Battery and autostart are explained by BackgroundAccessHint, on the settings screen.
 */
export async function requestBackgroundAccess() {
  if (!background) return;
}
