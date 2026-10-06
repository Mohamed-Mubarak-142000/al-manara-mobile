import { Platform, Pressable, Text } from "react-native";

import { background } from "../../../modules/almanara-background";

import { reportReminderError, useBackgroundStatus } from "./backgroundReminderStatus";

/**
 * Android only: the two device settings that decide whether reminders survive the app being
 * swiped away. Battery state is detected; the manufacturer autostart list cannot be read, so it is
 * offered on brands known to have one.
 */
export function BackgroundAccessHint({ exact = false }: { exact?: boolean }) {
  const { status } = useBackgroundStatus();
  if (Platform.OS !== "android" || !background || !status) return null;
  const openAlarms = background.openAlarmSettings;
  const openBattery = background.openBatterySettings;
  const openAutostart = background.openAutostartSettings;
  return (
    <>
      {exact && !status.exactAllowed && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            openAlarms().catch(reportReminderError);
          }}
          className="mt-3 rounded-2xl bg-accent-soft p-3"
        >
          <Text className="font-sans text-sm leading-6 text-accent-strong">
            اضغط واسمح بـ«المنبهات والتذكيرات» ليظهر التذكير في موعده والتطبيق مقفول.
          </Text>
        </Pressable>
      )}
      {status.batteryOptimized && openBattery && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            openBattery().catch(reportReminderError);
          }}
          className="mt-3 rounded-2xl bg-accent-soft p-3"
        >
          <Text className="font-sans text-sm leading-6 text-accent-strong">
            البطارية تمنع التذكير والتطبيق مقفول. اضغط، اختر «كل التطبيقات» ثم «المنارة» واجعلها «غير محسّنة» أو «غير مقيّدة».
          </Text>
        </Pressable>
      )}
      {status.autostartHint && openAutostart && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            openAutostart().catch(reportReminderError);
          }}
          className="mt-3"
        >
          <Text className="font-sans text-xs leading-5 text-fg-muted">
            في هذا الهاتف فعّل «التشغيل التلقائي» للمنارة، وإلا يتوقف التذكير بعد إغلاق التطبيق من قائمة التطبيقات الأخيرة.
          </Text>
          <Text className="mt-1 font-sans-bold text-sm text-primary">فتح إعداد التشغيل التلقائي</Text>
        </Pressable>
      )}
    </>
  );
}
