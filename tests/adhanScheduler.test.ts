import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { background } from "../modules/almanara-background";
import { getPrayerMonth } from "@/core/prayer/prayerTimesApi";
import { readAdhanSettings } from "@/features/prayer/adhanSettings";
import { readAdhanVoice } from "@/features/prayer/adhanSound";
import { rescheduleAdhan } from "@/features/prayer/adhanScheduler";
import type { UserLocation } from "@/core/prayer/location";

jest.mock("expo-sqlite/kv-store", () => ({ __esModule: true, default: { setItemSync: jest.fn(), removeItemSync: jest.fn() } }));
jest.mock("expo-notifications", () => ({
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
}));
jest.mock("../modules/almanara-background", () => ({
  background: {
    replaceSchedule: jest.fn(),
    stopAdhan: jest.fn(),
    getStatus: jest.fn(),
  },
}));
jest.mock("@/features/notifications/backgroundReminderStatus", () => ({
  refreshBackgroundStatus: jest.fn(),
  clearReminderError: jest.fn(),
}));
jest.mock("@/features/prayer/adhanSettings", () => ({ readAdhanSettings: jest.fn() }));
jest.mock("@/features/prayer/adhanSound", () => ({ readAdhanVoice: jest.fn(), setAdhanVoice: jest.fn() }));
jest.mock("@/core/calendar/hijriDate", () => ({ getHijriDate: () => ({ isRamadan: false }) }));
jest.mock("@/core/prayer/prayerTimesApi", () => ({
  getPrayerMonth: jest.fn(),
  PRAYER_LABELS: { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" },
}));

const location: UserLocation = { source: "timezone", city: "Cairo", country: "Egypt", label: "القاهرة" };
const prayers = { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true };
const month = [
  {
    day: 20,
    times: { fajr: "05:00", sunrise: "06:30", dhuhr: "12:00", asr: "15:00", maghrib: "17:00", isha: "19:00" },
    timezone: "Africa/Cairo",
    latitude: 30,
    longitude: 31,
    gregorianDate: "20 Jan 2026",
  },
];

describe("Android prayer schedule replacement", () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, "OS", "android");
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date("2026-01-15T00:00:00Z"));
    jest.mocked(readAdhanSettings).mockReturnValue({ enabled: true, prayers, reminderMinutes: 0 });
    jest
      .mocked(readAdhanVoice)
      .mockReturnValue({ id: "voice", title: "أذان", artist: "مؤذن", url: "https://example.com/adhan.mp3", offlineKey: "saved" });
    jest.mocked(getPrayerMonth).mockResolvedValue(month);
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([{ identifier: "old", content: { data: { kind: "adhan" } } }] as unknown as Notifications.NotificationRequest[]);
    jest.mocked(background!.getStatus).mockReturnValue({ exactAllowed: true } as ReturnType<NonNullable<typeof background>["getStatus"]>);
    jest.mocked(background!.replaceSchedule).mockResolvedValue(10);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("retains existing alarms when either month's fetch fails", async () => {
    jest.mocked(getPrayerMonth).mockResolvedValueOnce(month).mockResolvedValueOnce([]);
    await expect(rescheduleAdhan(location)).rejects.toThrow();
    expect(background!.replaceSchedule).not.toHaveBeenCalled();
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
  it("commits native offline alarms before removing legacy Expo notices", async () => {
    await expect(rescheduleAdhan(location)).resolves.toBe(10);
    const saved = JSON.parse(jest.mocked(background!.replaceSchedule).mock.calls[0][0]);
    expect(saved).toHaveLength(10);
    expect(saved[0]).toMatchObject({ at: Date.parse("2026-01-20T03:00:00Z"), play: true, voiceKey: "saved", timezone: "Africa/Cairo" });
    expect(jest.mocked(background!.replaceSchedule).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(Notifications.cancelScheduledNotificationAsync).mock.invocationCallOrder[0],
    );
  });
  it("retains legacy alarms if native commit fails", async () => {
    jest.mocked(background!.replaceSchedule).mockRejectedValueOnce(new Error("alarm permission"));
    await expect(rescheduleAdhan(location)).rejects.toThrow("alarm permission");
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
  it("clears alarms and playing audio when all prayers are disabled", async () => {
    jest.mocked(readAdhanSettings).mockReturnValue({
      enabled: true,
      prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      reminderMinutes: 0,
    });
    await expect(rescheduleAdhan(location)).resolves.toBe(0);
    expect(background!.replaceSchedule).toHaveBeenCalledWith("[]");
    expect(background!.stopAdhan).toHaveBeenCalled();
    expect(getPrayerMonth).not.toHaveBeenCalled();
  });
  it("coalesces overlapping requests into one native replacement", async () => {
    await Promise.all([rescheduleAdhan(location), rescheduleAdhan(location)]);
    expect(background!.replaceSchedule).toHaveBeenCalledTimes(1);
  });
});
