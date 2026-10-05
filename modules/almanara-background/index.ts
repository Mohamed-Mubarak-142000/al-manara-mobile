import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export interface NativeMoment {
  id: string;
  at: number;
  title: string;
  body: string;
  play: boolean;
  voiceKey: string | null;
  timezone: string;
}

export interface BackgroundStatus {
  overlayAllowed: boolean;
  overlayEnabled: boolean;
  overlayRunning: boolean;
  /** Optional for compatibility with APKs built before persistent overlay diagnostics. */
  overlayError?: string;
  exactAllowed: boolean;
  scheduleThrough: number;
  error: string;
}

interface BackgroundModule {
  getStatus(): BackgroundStatus;
  openOverlaySettings(): Promise<void>;
  openAlarmSettings(): Promise<void>;
  setOverlay(enabled: boolean, config: string): Promise<void>;
  updateOverlay(config: string): Promise<void>;
  downloadVoice(id: string, url: string): Promise<string>;
  replaceSchedule(moments: string): Promise<number>;
  stopAdhan(): Promise<void>;
}

export const background = Platform.OS === "android" ? requireOptionalNativeModule<BackgroundModule>("AlmanaraBackground") : null;
