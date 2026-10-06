import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";
import { setAdhkarReminder, setOutsideAdhkarNotifications, restoreAdhkarReminders } from "@/features/adhkar/adhkarReminders";
import { replaceLocalSchedule } from "@/features/notifications/replaceLocalSchedule";

jest.mock("expo-notifications", () => ({
  setNotificationChannelAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly" },
}));
jest.mock("expo-sqlite/kv-store", () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    setItemSync: jest.fn(),
  },
}));
jest.mock("@/features/notifications/replaceLocalSchedule", () => ({ replaceLocalSchedule: jest.fn() }));

describe("outside adhkar system notifications", () => {
  beforeEach(async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as Notifications.NotificationPermissionsStatus);
    jest.mocked(replaceLocalSchedule).mockResolvedValue(undefined);
    await setOutsideAdhkarNotifications(false);
    jest.clearAllMocks();
  });

  it("schedules repeating Android notices with a channel before requesting permission", async () => {
    await setOutsideAdhkarNotifications(true);
    expect(jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(Notifications.requestPermissionsAsync).mock.invocationCallOrder[0],
    );
    const desired = jest.mocked(replaceLocalSchedule).mock.calls[0][1];
    expect(desired).toHaveLength(15);
    expect(desired[0].trigger).toEqual({ type: "daily", hour: 7, minute: 0, channelId: "adhkar-outside-v1" });
    expect(desired[14].trigger).toEqual({ type: "daily", hour: 21, minute: 0, channelId: "adhkar-outside-v1" });
    expect(Storage.setItemSync).toHaveBeenCalledWith("al-manara:outside-adhkar:v1", "on");
    await restoreAdhkarReminders();
    expect(jest.mocked(replaceLocalSchedule).mock.calls[1][1]).toHaveLength(15);
    await setOutsideAdhkarNotifications(false);
    expect(replaceLocalSchedule).toHaveBeenLastCalledWith("adhkar", []);
  });

  it("does not schedule or persist enabled reminders when permission is denied", async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: false } as Notifications.NotificationPermissionsStatus);
    await expect(setOutsideAdhkarNotifications(true)).rejects.toThrow();
    expect(replaceLocalSchedule).not.toHaveBeenCalled();
    expect(Storage.setItemSync).not.toHaveBeenCalled();
  });

  it("rolls back enabled state if the system rejects the schedule", async () => {
    jest.mocked(replaceLocalSchedule).mockRejectedValueOnce(new Error("schedule failed"));
    await expect(setOutsideAdhkarNotifications(true)).rejects.toThrow("schedule failed");
    expect(Storage.setItemSync).not.toHaveBeenCalled();
    await restoreAdhkarReminders();
    expect(replaceLocalSchedule).toHaveBeenLastCalledWith("adhkar", []);
  });

  it("schedules the Friday reminder weekly at 10:00 and opens Surah Al-Kahf", async () => {
    await expect(setAdhkarReminder("friday", true)).resolves.toBe(true);
    const desired = jest.mocked(replaceLocalSchedule).mock.calls[0][1];
    expect(desired).toHaveLength(1);
    expect(desired[0].identifier).toBe("adhkar-friday");
    // expo-notifications counts weekdays from Sunday = 1, so Friday is 6.
    expect(desired[0].trigger).toEqual({ type: "weekly", weekday: 6, hour: 10, minute: 0, channelId: "adhkar" });
    expect(desired[0].content.title).toBe("يوم الجمعة");
    expect(desired[0].content.data).toEqual({ kind: "adhkar", url: "/mushaf?page=293" });
    await setAdhkarReminder("friday", false);
    expect(replaceLocalSchedule).toHaveBeenLastCalledWith("adhkar", []);
  });
});
