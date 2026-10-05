import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { replaceLocalSchedule } from "@/features/notifications/replaceLocalSchedule";
import { TOAST_ADHKAR } from "@/core/adhkar/toastAdhkar";

export interface AdhkarReminder {
  enabled: boolean;
  hour: number;
  minute: number;
}

export type ReminderKind = "morning" | "evening";
type Reminders = Record<ReminderKind, AdhkarReminder>;

const KEY = "al-manara:adhkar-reminders:v1";
const CHANNEL_ID = "adhkar";
const DEFAULTS: Reminders = {
  morning: { enabled: false, hour: 7, minute: 0 },
  evening: { enabled: false, hour: 17, minute: 0 },
};
const COPY: Record<ReminderKind, { title: string; body: string }> = {
  morning: { title: "أذكار الصباح", body: "ابدأ يومك بذكر الله، أذكار الصباح بانتظارك." },
  evening: { title: "أذكار المساء", body: "حان وقت أذكار المساء." },
};

let cached: Reminders | null = null;
const listeners = new Set<() => void>();
const OUTSIDE_KEY = "al-manara:outside-adhkar:v1";
let outsideEnabled: boolean | undefined;
let operation: Promise<unknown> = Promise.resolve();

function readOutside(): boolean {
  return (outsideEnabled ??= Storage.getItemSync(OUTSIDE_KEY) === "on");
}

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = operation.then(work);
  operation = result.catch(() => {});
  return result;
}

function read(): Reminders {
  if (cached) return cached;
  try {
    cached = { ...DEFAULTS, ...(JSON.parse(Storage.getItemSync(KEY) ?? "{}") as Partial<Reminders>) };
  } catch {
    cached = DEFAULTS;
  }
  return cached;
}

async function apply(reminders: Reminders) {
  const desired: Notifications.NotificationRequestInput[] = [];
  for (const kind of Object.keys(reminders) as ReminderKind[]) {
    const reminder = reminders[kind];
    if (!reminder.enabled) continue;
    desired.push({
      identifier: `adhkar-${kind}`,
      content: { ...COPY[kind], sound: "default", data: { kind: "adhkar", url: "/adhkar" } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
  if (Platform.OS === "ios" && readOutside()) {
    for (let hour = 7; hour < 22; hour++) {
      const dhikr = TOAST_ADHKAR[(hour - 7) % TOAST_ADHKAR.length];
      desired.push({
        identifier: `adhkar-hour-${hour}`,
        content: {
          title: "ذكّر قلبك",
          body: `${dhikr.text}\n${dhikr.source}`,
          sound: false,
          data: { kind: "adhkar", url: `/adhkar?toast=${dhikr.id}` },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
      });
    }
  }
  await replaceLocalSchedule("adhkar", desired);
}

async function channel() {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "تذكير الأذكار",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
}

export function restoreAdhkarReminders() {
  return serialize(async () => {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await channel();
    await apply(read());
  });
}

/** Turns a daily reminder on or off. Returns false when notification permission was refused. */
export async function setAdhkarReminder(kind: ReminderKind, enabled: boolean): Promise<boolean> {
  return serialize(async () => {
    if (enabled) {
      await channel();
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) return false;
    }
    const next = { ...read(), [kind]: { ...read()[kind], enabled } };
    await apply(next);
    cached = next;
    try {
      Storage.setItemSync(KEY, JSON.stringify(cached));
    } catch {
      // Keep the in-memory value.
    }
    listeners.forEach((notify) => notify());
    return true;
  });
}

export function setOutsideAdhkarNotifications(enabled: boolean) {
  return serialize(async () => {
    if (enabled && !(await Notifications.requestPermissionsAsync()).granted) throw new Error("اسمح بإشعارات الأذكار من إعدادات الجهاز.");
    const previous = readOutside();
    outsideEnabled = enabled;
    try {
      await apply(read());
      Storage.setItemSync(OUTSIDE_KEY, enabled ? "on" : "off");
      listeners.forEach((notify) => notify());
    } catch (error) {
      outsideEnabled = previous;
      throw error;
    }
  });
}

export function useOutsideAdhkarNotifications() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, readOutside);
}

export function useAdhkarReminders(): Reminders {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, read);
}
