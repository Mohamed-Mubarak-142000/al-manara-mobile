import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { UserLocation } from "@/core/prayer/location";
import { PRAYER_LABELS, getPrayerMonth, type PrayerMonthDay } from "@/core/prayer/prayerTimesApi";
import { getHijriDate } from "@/core/calendar/hijriDate";
import { toArabicDigits } from "@/core/text/arabic";

import { readAdhanSettings, type AdhanPrayer } from "./adhanSettings";

const CHANNEL_ID = "adhan";
/** Minutes before Fajr that imsak is announced in Ramadan (as on Egyptian Ramadan calendars). */
const IMSAK_MINUTES = 10;
const ORDER: readonly AdhanPrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
// iOS keeps at most 64 pending local notifications per app; leave room for adhkar reminders.
const MAX_PENDING = 56;

export async function ensureAdhanPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "مواقيت الصلاة",
      description: "تنبيه عند دخول وقت كل صلاة",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return asked.granted;
}

function minutesLabel(minutes: number): string {
  return minutes <= 10 ? `${toArabicDigits(minutes)} دقائق` : `${toArabicDigits(minutes)} دقيقة`;
}

function at(day: PrayerMonthDay, year: number, month: number, hhmm: string): Date {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return new Date(year, month - 1, day.day, h, m, 0, 0);
}

/**
 * Replaces every pending prayer notification with fresh ones for the coming days.
 * Called on launch, on return to the foreground, and whenever the settings or location change, so
 * the schedule keeps rolling forward without a background task.
 */
export async function rescheduleAdhan(location: UserLocation): Promise<number> {
  const settings = readAdhanSettings();
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((request) => request.content.data?.kind === "adhan")
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
  if (!settings.enabled) return 0;

  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [thisMonth, nextMonth] = await Promise.all([
    getPrayerMonth(location, now.getFullYear(), now.getMonth() + 1),
    getPrayerMonth(location, next.getFullYear(), next.getMonth() + 1),
  ]);
  const days = [
    ...thisMonth.map((day) => ({ day, year: now.getFullYear(), month: now.getMonth() + 1 })),
    ...nextMonth.map((day) => ({ day, year: next.getFullYear(), month: next.getMonth() + 1 })),
  ];

  const moments: { date: Date; title: string; body: string }[] = [];
  for (const { day, year, month } of days) {
    for (const key of ORDER) {
      if (!settings.prayers[key]) continue;
      const date = at(day, year, month, day.times[key]);
      if (settings.reminderMinutes > 0) {
        const before = new Date(date.getTime() - settings.reminderMinutes * 60_000);
        if (before > now) {
          moments.push({
            date: before,
            title: `اقترب وقت ${PRAYER_LABELS[key]}`,
            body: `بعد ${minutesLabel(settings.reminderMinutes)} · ${location.label}`,
          });
        }
      }
      // Ramadan: imsak before Fajr, and Maghrib announced as iftar.
      const ramadan = getHijriDate(date).isRamadan;
      if (ramadan && key === "fajr") {
        const imsak = new Date(date.getTime() - IMSAK_MINUTES * 60_000);
        if (imsak > now)
          moments.push({ date: imsak, title: "حان وقت الإمساك", body: `الفجر بعد ${minutesLabel(IMSAK_MINUTES)} · تقبّل الله صيامك` });
      }
      if (date > now)
        moments.push(
          ramadan && key === "maghrib"
            ? { date, title: "حان الآن وقت الإفطار وصلاة المغرب", body: "ذهب الظمأ وابتلت العروق وثبت الأجر إن شاء الله" }
            : { date, title: `حان الآن وقت صلاة ${PRAYER_LABELS[key]}`, body: `حسب التوقيت المحلي لـ${location.label}` },
        );
    }
  }

  const upcoming = moments.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_PENDING);
  await Promise.all(
    upcoming.map((moment) =>
      Notifications.scheduleNotificationAsync({
        content: { title: moment.title, body: moment.body, sound: "default", data: { kind: "adhan", url: "/prayer" } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: moment.date, channelId: CHANNEL_ID },
      }),
    ),
  );
  return upcoming.length;
}
