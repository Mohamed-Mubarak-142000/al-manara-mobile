import * as Notifications from "expo-notifications";

let operation: Promise<unknown> = Promise.resolve();

function restoreInput(request: Notifications.NotificationRequest): Notifications.NotificationRequestInput {
  const raw = request.trigger as unknown as Record<string, unknown>;
  let trigger = request.trigger as Notifications.NotificationTriggerInput;
  if (raw?.type === "calendar" && raw.dateComponents) {
    const parts = raw.dateComponents as Record<string, number | string>;
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      repeats: raw.repeats === true,
      year: typeof parts.year === "number" ? parts.year : undefined,
      month: typeof parts.month === "number" ? parts.month : undefined,
      day: typeof parts.day === "number" ? parts.day : undefined,
      hour: typeof parts.hour === "number" ? parts.hour : undefined,
      minute: typeof parts.minute === "number" ? parts.minute : undefined,
      second: typeof parts.second === "number" ? parts.second : undefined,
      timezone: typeof parts.timeZone === "string" ? parts.timeZone : undefined,
    };
  }
  const content = request.content;
  return {
    identifier: request.identifier,
    trigger,
    content: { title: content.title ?? undefined, body: content.body ?? undefined, data: content.data, sound: content.sound ?? false },
  };
}

/** iOS's 64-slot limit prevents staging two complete schedules. Prepare first, then rollback on failure. */
export function replaceLocalSchedule(kind: string, desired: Notifications.NotificationRequestInput[]) {
  const result = operation.then(async () => {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const old = pending.filter((request) => request.content.data?.kind === kind);
    const retired: Notifications.NotificationRequest[] = [];
    const created: string[] = [];
    try {
      for (const request of old) {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
        retired.push(request);
      }
      for (const request of desired) created.push(await Notifications.scheduleNotificationAsync(request));
    } catch (error) {
      await Promise.allSettled(created.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
      const restored = await Promise.allSettled(retired.map((request) => Notifications.scheduleNotificationAsync(restoreInput(request))));
      if (restored.some((entry) => entry.status === "rejected")) {
        throw new Error("تعذّر تحديث بعض التنبيهات واستعادتها؛ افتح التطبيق لتجديد الجدولة.");
      }
      throw error;
    }
  });
  operation = result.catch(() => {});
  return result;
}
