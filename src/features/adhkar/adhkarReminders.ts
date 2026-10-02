import * as Notifications from "expo-notifications";
import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

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
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((request) => request.content.data?.kind === "adhkar")
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
  for (const kind of Object.keys(reminders) as ReminderKind[]) {
    const reminder = reminders[kind];
    if (!reminder.enabled) continue;
    await Notifications.scheduleNotificationAsync({
      content: { ...COPY[kind], sound: "default", data: { kind: "adhkar", url: "/adhkar" } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** Turns a daily reminder on or off. Returns false when notification permission was refused. */
export async function setAdhkarReminder(kind: ReminderKind, enabled: boolean): Promise<boolean> {
  if (enabled) {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "تذكير الأذكار",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return false;
  }
  cached = { ...read(), [kind]: { ...read()[kind], enabled } };
  try {
    Storage.setItemSync(KEY, JSON.stringify(cached));
  } catch {
    // Keep the in-memory value.
  }
  listeners.forEach((notify) => notify());
  await apply(cached);
  return true;
}

export function useAdhkarReminders(): Reminders {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, read);
}
