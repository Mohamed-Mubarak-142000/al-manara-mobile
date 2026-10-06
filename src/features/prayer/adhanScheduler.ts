import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Storage from "expo-sqlite/kv-store";

import { background, type NativeMoment } from "../../../modules/almanara-background";
import { replaceLocalSchedule } from "@/features/notifications/replaceLocalSchedule";
import { clearReminderError, refreshBackgroundStatus } from "@/features/notifications/backgroundReminderStatus";

import type { UserLocation } from "@/core/prayer/location";
import { PRAYER_LABELS, getPrayerMonth, type PrayerMonthDay } from "@/core/prayer/prayerTimesApi";
import { getHijriDate } from "@/core/calendar/hijriDate";
import { IMSAK_MINUTES } from "@/core/prayer/calculation";
import { toArabicDigits } from "@/core/text/arabic";

import { readAdhanSettings, type AdhanPrayer } from "./adhanSettings";
import { readAdhanVoice, setAdhanVoice } from "./adhanSound";
import { readPrayerCalcSettings } from "./prayerCalcSettings";
import { prayerMomentDate } from "./prayerMomentDate";

const CHANNEL_ID = "adhan";
const ORDER: readonly AdhanPrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
// iOS keeps at most 64 pending local notifications per app; leave room for adhkar reminders.
const MAX_PENDING = 40; // 15 hourly adhkar + 2 daily reminders + room for other notifications.
export const COVERAGE_KEY = "al-manara:adhan-through:v1";
let operation: Promise<unknown> = Promise.resolve();
let generation = 0;

export function rescheduleAdhan(location: UserLocation): Promise<number> {
  const version = ++generation;
  const next = operation.then(() => (version === generation ? replaceAdhan(location, version) : 0));
  operation = next.catch(() => {});
  return next;
}

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
  const granted =
    current.granted ||
    (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })).granted;
  if (!granted) return false;
  if (Platform.OS === "android") {
    if (!background) throw new Error("الأذان خارج التطبيق يحتاج نسخة أندرويد الجديدة.");
    if (!background.getStatus().exactAllowed) {
      await background.openAlarmSettings();
      return false;
    }
  }
  return true;
}

function minutesLabel(minutes: number): string {
  return minutes <= 10 ? `${toArabicDigits(minutes)} دقائق` : `${toArabicDigits(minutes)} دقيقة`;
}

function at(day: PrayerMonthDay, year: number, month: number, hhmm: string): Date {
  return prayerMomentDate(year, month, day.day, hhmm, day.timezone);
}

/**
 * Replaces every pending prayer notification with fresh ones for the coming days.
 * Called on launch, on return to the foreground, and whenever the settings or location change, so
 * the schedule keeps rolling forward without a background task.
 */
async function replaceAdhan(location: UserLocation, version: number): Promise<number> {
  const settings = readAdhanSettings();
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const old = pending.filter((request) => request.content.data?.kind === "adhan");
  if (!settings.enabled || !Object.values(settings.prayers).some(Boolean)) {
    await background?.replaceSchedule("[]");
    await background?.stopAdhan();
    await Promise.all(old.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
    Storage.removeItemSync(COVERAGE_KEY);
    refreshBackgroundStatus();
    return 0;
  }
  if (!(await Notifications.getPermissionsAsync()).granted) throw new Error("إشعارات الصلاة غير مسموح بها. راجع إعدادات الجهاز.");
  if (Platform.OS === "android" && !background) throw new Error("الأذان خارج التطبيق يحتاج بناء أندرويد الجديد.");
  if (background && !background.getStatus().exactAllowed) throw new Error("اسمح بالمنبهات والتذكيرات من إعدادات الجهاز لضبط وقت الأذان.");
  const voice = readAdhanVoice();
  if (background && voice && !voice.offlineKey) await setAdhanVoice(voice);

  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const calc = readPrayerCalcSettings();
  const [thisMonth, nextMonth] = await Promise.all([
    getPrayerMonth(location, now.getFullYear(), now.getMonth() + 1, calc),
    getPrayerMonth(location, next.getFullYear(), next.getMonth() + 1, calc),
  ]);
  if (!thisMonth.length || !nextMonth.length) throw new Error("تعذّر تحميل مواقيت الصلاة؛ التنبيهات السابقة محفوظة.");
  const days = [
    ...thisMonth.map((day) => ({ day, year: now.getFullYear(), month: now.getMonth() + 1 })),
    ...nextMonth.map((day) => ({ day, year: next.getFullYear(), month: next.getMonth() + 1 })),
  ];

  /** `play`: the prayer time itself, when the chosen muezzin's adhan is raised (not the reminders). */
  const moments: { date: Date; timezone: string; title: string; body: string; play?: boolean }[] = [];
  for (const { day, year, month } of days) {
    for (const key of ORDER) {
      if (!settings.prayers[key]) continue;
      const date = at(day, year, month, day.times[key]);
      if (settings.reminderMinutes > 0) {
        const before = new Date(date.getTime() - settings.reminderMinutes * 60_000);
        if (before > now) {
          moments.push({
            date: before,
            timezone: day.timezone,
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
          moments.push({
            date: imsak,
            timezone: day.timezone,
            title: "حان وقت الإمساك",
            body: `الفجر بعد ${minutesLabel(IMSAK_MINUTES)} · تقبّل الله صيامك`,
          });
      }
      if (date > now)
        moments.push(
          ramadan && key === "maghrib"
            ? {
                date,
                timezone: day.timezone,
                title: "حان الآن وقت الإفطار وصلاة المغرب",
                body: "ذهب الظمأ وابتلت العروق وثبت الأجر إن شاء الله",
                play: true,
              }
            : {
                date,
                timezone: day.timezone,
                title: `حان الآن وقت صلاة ${PRAYER_LABELS[key]}`,
                body: `حسب التوقيت المحلي لـ${location.label}`,
                play: true,
              },
        );
    }
  }

  if (version !== generation) return 0;
  const sorted = moments.sort((a, b) => a.date.getTime() - b.date.getTime() || Number(b.play === true) - Number(a.play === true));
  // Prefer the actual prayer when a reminder shares the same timestamp.
  const unique = sorted.filter(
    (moment, index) => !sorted.some((other, otherIndex) => otherIndex < index && other.date.getTime() === moment.date.getTime()),
  );
  const upcoming = Platform.OS === "android" ? unique : unique.slice(0, MAX_PENDING);
  if (!upcoming.length) throw new Error("تعذّر تجهيز مواقيت الصلاة؛ التنبيهات السابقة محفوظة.");
  if (background) {
    const native: NativeMoment[] = upcoming.map((moment) => ({
      id: `prayer-${moment.date.getTime()}`,
      at: moment.date.getTime(),
      title: moment.title,
      body: moment.body,
      timezone: moment.timezone,
      play: moment.play === true,
      voiceKey: moment.play ? (readAdhanVoice()?.offlineKey ?? null) : null,
    }));
    await background.replaceSchedule(JSON.stringify(native));
  } else {
    const desired: Notifications.NotificationRequestInput[] = upcoming.map((moment) => ({
      identifier: `adhan-${moment.date.getTime()}`,
      content: {
        title: moment.title,
        body: moment.body,
        sound: moment.play && readAdhanVoice() ? "adhan_short.wav" : "default",
        data: { kind: "adhan", url: "/prayer", at: moment.date.getTime() },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: moment.date, channelId: CHANNEL_ID },
    }));
    await replaceLocalSchedule("adhan", desired);
  }
  if (background) await Promise.all(old.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
  Storage.setItemSync(COVERAGE_KEY, String(upcoming[upcoming.length - 1].date.getTime()));
  clearReminderError();
  refreshBackgroundStatus();
  return upcoming.length;
}
