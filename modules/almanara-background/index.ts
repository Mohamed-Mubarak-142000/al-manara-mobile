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
  /** The prayer itself: the adhan screen's route (adhan-now?…) it opens, full screen; null for none. */
  screen?: string | null;
}

export interface BackgroundStatus {
  overlayAllowed: boolean;
  overlayEnabled: boolean;
  overlayRunning: boolean;
  /** Optional for compatibility with APKs built before persistent overlay diagnostics. */
  overlayError?: string;
  exactAllowed: boolean;
  /** Optional for APKs built before battery diagnostics. True while Android may freeze the app. */
  batteryOptimized?: boolean;
  /** The manufacturer has its own autostart/background list that can block alarms. */
  autostartHint?: boolean;
  scheduleThrough: number;
  error: string;
  /** Optional for APKs built before the adhan screen. False when Android 14+ full-screen notifications are off for the app. */
  fullScreenAllowed?: boolean;
}

interface BackgroundModule {
  getStatus(): BackgroundStatus;
  openOverlaySettings(): Promise<void>;
  openAlarmSettings(): Promise<void>;
  openBatterySettings?(): Promise<void>;
  openAutostartSettings?(): Promise<boolean>;
  setOverlay(enabled: boolean, config: string): Promise<void>;
  updateOverlay(config: string): Promise<void>;
  downloadVoice(id: string, url: string): Promise<string>;
  replaceSchedule(moments: string): Promise<number>;
  stopAdhan(): Promise<void>;
  /** The adhan screen (optional for APKs built before it): is the adhan still playing, its notice, the lock screen. */
  isAdhanPlaying?(): boolean;
  dismissPrayerNotice?(): Promise<void>;
  setShowOverLock?(on: boolean): Promise<void>;
  isLocked?(): boolean;
  openFullScreenSettings?(): Promise<void>;
  /** Optional for APKs built before it: wakes the NextPrayer widget at `at` (epoch ms) to redraw. */
  scheduleWidgetRefresh?(at: number): Promise<boolean>;
  /** Optional for APKs built before crash diagnostics: JSON { native: [...], exits: [...] } (see CrashRecorder.kt). */
  getCrashReports?(): string;
  clearCrashReports?(): void;
}

export const background = Platform.OS === "android" ? requireOptionalNativeModule<BackgroundModule>("AlmanaraBackground") : null;
