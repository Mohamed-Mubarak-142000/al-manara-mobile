import { router } from "expo-router";
import { Bell, BellOff, ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { Linking, Platform, Pressable, Switch, Text, View } from "react-native";
import Storage from "expo-sqlite/kv-store";

import { background } from "../../../modules/almanara-background";
import { BackgroundAccessHint } from "@/features/notifications/BackgroundAccessHint";
import { reportReminderError, useBackgroundStatus } from "@/features/notifications/backgroundReminderStatus";

import { PRAYER_LABELS } from "@/core/prayer/prayerTimesApi";
import { toArabicDigits } from "@/core/text/arabic";
import { useThemeColor } from "@/theme/useThemeColor";

import { COVERAGE_KEY, ensureAdhanPermission } from "./adhanScheduler";
import { useAdhanVoice } from "./adhanSound";
import { useAdhanSettings, writeAdhanSettings, type AdhanPrayer, type AdhanSettings } from "./adhanSettings";

const PRAYERS: readonly AdhanPrayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const REMINDERS: readonly AdhanSettings["reminderMinutes"][] = [0, 10, 15, 30];

/** Prayer notifications: a master switch, one switch per prayer, and an optional heads-up. */
export function AdhanSettingsCard() {
  const settings = useAdhanSettings();
  const voice = useAdhanVoice();
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const { status, error } = useBackgroundStatus();
  const through = status?.scheduleThrough || Number(Storage.getItemSync(COVERAGE_KEY) ?? 0);

  async function toggleEnabled(next: boolean) {
    setBusy(true);
    try {
      if (next && !(await ensureAdhanPermission())) {
        setDenied(true);
        return;
      }
      setDenied(false);
      writeAdhanSettings({ enabled: next });
    } catch (cause) {
      reportReminderError(cause);
    } finally {
      setBusy(false);
    }
  }

  const track = { false: border, true: primary };

  return (
    <View className="mt-5 rounded-3xl border border-border bg-surface p-4 shadow-soft">
      <View className="flex-row items-center gap-3">
        <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
          {settings.enabled ? <Bell size={20} color={primary} /> : <BellOff size={20} color={primary} />}
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">تنبيه الأذان</Text>
          <Text className="font-sans text-xs text-fg-muted">إشعار عند دخول وقت كل صلاة، حتى والتطبيق مغلق.</Text>
        </View>
        <Switch disabled={busy} value={settings.enabled} onValueChange={toggleEnabled} trackColor={track} thumbColor={surface} />
      </View>

      {denied && (
        <Pressable onPress={() => Linking.openSettings()} className="mt-3 rounded-2xl bg-accent-soft p-3">
          <Text className="font-sans text-sm text-accent-strong">
            اسمح للمنارة بالإشعارات من إعدادات الجهاز، ثم فعّل الأذان مرة أخرى.
          </Text>
        </Pressable>
      )}

      {settings.enabled && (
        <>
          {Platform.OS === "android" && status && !status.exactAllowed && (
            <Pressable
              onPress={() => {
                void background?.openAlarmSettings().catch(reportReminderError);
              }}
              className="mt-3 rounded-2xl bg-accent-soft p-3"
            >
              <Text className="font-sans text-sm text-accent-strong">الأذان يعمل، وقد يتأخر دقائق قليلة. اضغط للسماح بالمنبهات ليصل في وقته بالضبط.</Text>
            </Pressable>
          )}
          <BackgroundAccessHint />
          {through > 0 && (
            <Text className="mt-3 font-sans text-xs text-fg-muted">
              المواقيت محفوظة حتى {new Date(through).toLocaleDateString("ar-EG")}. افتح التطبيق قبل هذا التاريخ لتجديدها.
            </Text>
          )}
          {!!(error || status?.error) && <Text className="mt-2 font-sans text-sm text-accent-strong">{error || status?.error}</Text>}
          <View className="mt-4 border-t border-border pt-2">
            {PRAYERS.map((key) => (
              <View key={key} className="flex-row items-center justify-between py-2">
                <Text className="font-sans-semibold text-base text-fg">{PRAYER_LABELS[key]}</Text>
                <Switch
                  value={settings.prayers[key]}
                  onValueChange={(value) => writeAdhanSettings({ prayers: { ...settings.prayers, [key]: value } })}
                  trackColor={track}
                  thumbColor={surface}
                />
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/adhan-voice")}
            className="mt-3 flex-row items-center justify-between rounded-2xl bg-bg px-4 py-3"
          >
            <View className="flex-1">
              <Text className="font-sans-bold text-sm text-fg">صوت الأذان</Text>
              <Text className="font-sans text-xs text-fg-muted" numberOfLines={1}>
                {voice ? voice.artist : "الأذان الافتراضي"}
              </Text>
            </View>
            <ChevronLeft size={18} color={primary} />
          </Pressable>
          <Text className="mt-3 font-sans-bold text-sm text-fg">تذكير قبل الصلاة</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {REMINDERS.map((minutes) => {
              const active = settings.reminderMinutes === minutes;
              return (
                <Pressable
                  key={minutes}
                  accessibilityRole="button"
                  onPress={() => writeAdhanSettings({ reminderMinutes: minutes })}
                  className={`rounded-full border px-4 py-1.5 ${active ? "border-primary bg-primary" : "border-border bg-bg"}`}
                >
                  <Text className={`font-sans-bold text-xs ${active ? "text-on-primary" : "text-fg"}`}>
                    {minutes === 0 ? "بدون" : `${toArabicDigits(minutes)} د`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
