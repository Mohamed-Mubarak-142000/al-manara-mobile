import * as Notifications from "expo-notifications";
import { replaceLocalSchedule } from "@/features/notifications/replaceLocalSchedule";

jest.mock("expo-notifications", () => ({
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { CALENDAR: "calendar", DAILY: "daily" },
}));

describe("local notification rollback", () => {
  it("restores the old daily reminder when scheduling its replacement fails", async () => {
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValue([
      {
        identifier: "morning-old",
        content: { title: "الصباح", body: "ذكر", data: { kind: "adhkar" }, sound: "default" },
        trigger: { type: "calendar", repeats: true, dateComponents: { hour: 7, minute: 0 } },
      },
    ] as unknown as Notifications.NotificationRequest[]);
    jest.mocked(Notifications.scheduleNotificationAsync).mockRejectedValueOnce(new Error("failed")).mockResolvedValueOnce("morning-old");
    await expect(replaceLocalSchedule("adhkar", [{ identifier: "new", content: { title: "جديد" }, trigger: null }])).rejects.toThrow(
      "failed",
    );
    expect(Notifications.scheduleNotificationAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identifier: "morning-old",
        trigger: expect.objectContaining({ type: "calendar", hour: 7, minute: 0, repeats: true }),
      }),
    );
  });
});
