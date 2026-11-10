import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { TOAST_ADHKAR } from "@/core/adhkar/toastAdhkar";

/**
 * The bundled recording each outside dhikr notification speaks (assets/audio/dhikr_*.wav, listed in
 * app.json's expo-notifications `sounds`). An id without a voice falls back to the default sound.
 */
const VOICES: Record<string, string> = {
  istighfar: "dhikr_istighfar.wav",
  "salat-nabi": "dhikr_salat_nabi.wav",
  "subhan-bihamdih": "dhikr_subhan_bihamdih.wav",
  tahlil: "dhikr_tahlil.wav",
  hasbuna: "dhikr_hasbuna.wav",
  radeetu: "dhikr_radeetu.wav",
  yunus: "dhikr_yunus.wav",
  subhanaka: "dhikr_subhanaka.wav",
  aeni: "dhikr_aeni.wav",
  jannah: "dhikr_jannah.wav",
};

export function dhikrVoice(id: string): string | null {
  return VOICES[id] ?? null;
}

/**
 * Android (8+) takes a notification's sound from its channel, and a channel's sound is fixed once
 * created, so each voice has its own channel. Bump the suffix if a recording ever changes.
 */
export function dhikrVoiceChannel(id: string): string | null {
  return VOICES[id] ? `dhikr-voice-${id}-v1` : null;
}

export async function ensureDhikrVoiceChannels() {
  if (Platform.OS !== "android") return;
  for (const dhikr of TOAST_ADHKAR) {
    const channelId = dhikrVoiceChannel(dhikr.id);
    if (!channelId) continue;
    await Notifications.setNotificationChannelAsync(channelId, {
      name: `ذكر بصوت: ${dhikr.text.replace(/[ً-ْٰ]/g, "").slice(0, 40)}`,
      importance: Notifications.AndroidImportance.HIGH,
      sound: VOICES[dhikr.id],
    });
  }
}
