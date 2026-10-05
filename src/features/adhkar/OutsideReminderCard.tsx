import { useState } from "react";
import { Linking, Platform, Pressable, Switch, Text, View } from "react-native";

import { background } from "../../../modules/almanara-background";
import { enableOverlay, disableOverlay, useOverlayConfig } from "@/features/notifications/BackgroundReminders";
import { clearReminderError, reportReminderError, useBackgroundStatus } from "@/features/notifications/backgroundReminderStatus";
import { useThemeColor } from "@/theme/useThemeColor";

import { setOutsideAdhkarNotifications, useOutsideAdhkarNotifications } from "./adhkarReminders";

export function OutsideReminderCard({ embedded = false }: { embedded?: boolean }) {
  const { status, error } = useBackgroundStatus();
  const config = useOverlayConfig();
  const notificationsEnabled = useOutsideAdhkarNotifications();
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  const android = Platform.OS === "android";
  const enabled = android ? status?.overlayEnabled === true : notificationsEnabled;
  const overlayError = android ? status?.overlayError : "";
  return (
    <View className={`${embedded ? "" : "mx-4 mt-4 "}rounded-3xl border border-border bg-surface p-4`}>
      {android && (
        <View className="mb-4 flex-row items-center gap-3 border-b border-border pb-4">
          <View className="flex-1">
            <Text className="font-display-bold text-base text-fg">إشعارات أذكار خارج التطبيق</Text>
            <Text className="mt-1 font-sans text-xs leading-5 text-fg-muted">
              ذكر كل ساعة من ٧ صباحًا إلى ١٠ مساءً، حتى والتطبيق مقفول أو الشاشة مقفولة. اسمح بالإشعارات لإظهار التذكير.
            </Text>
          </View>
          <Switch
            accessibilityLabel="إشعارات أذكار خارج التطبيق"
            value={notificationsEnabled}
            disabled={notificationsBusy}
            trackColor={{ false: border, true: primary }}
            thumbColor={surface}
            onValueChange={async (next) => {
              setNotificationsBusy(true);
              clearReminderError();
              try {
                await setOutsideAdhkarNotifications(next);
              } catch (cause) {
                reportReminderError(cause);
              } finally {
                setNotificationsBusy(false);
              }
            }}
          />
        </View>
      )}
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">{android ? "ذكر كل دقيقة فوق التطبيقات" : "إشعارات أذكار اليوم"}</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-fg-muted">
            {android
              ? "بطاقة لمدة ٥ ثوانٍ كل دقيقة من ٧ صباحًا إلى ١٠ مساءً، حتى والتطبيق مقفول، طالما الشاشة مفتوحة. اضغط عليها لإغلاقها."
              : "ذكر في إشعار كل ساعة من ٧ صباحًا إلى ١٠ مساءً، حتى والتطبيق مقفول أو الشاشة مقفولة. آيفون لا يدعم الظهور فوق التطبيقات أو التوقيت كل دقيقة في الخلفية."}
          </Text>
        </View>
        <Switch
          accessibilityLabel={android ? "ذكر كل دقيقة فوق التطبيقات" : "إشعارات أذكار اليوم"}
          value={enabled}
          disabled={busy || Platform.OS === "web"}
          trackColor={{ false: border, true: primary }}
          thumbColor={surface}
          onValueChange={async (next) => {
            setBusy(true);
            clearReminderError();
            setWaiting(false);
            try {
              if (android) {
                if (next) {
                  await enableOverlay(config);
                  setWaiting(!background?.getStatus().overlayAllowed);
                } else await disableOverlay();
              } else await setOutsideAdhkarNotifications(next);
            } catch (cause) {
              reportReminderError(cause);
            } finally {
              setBusy(false);
            }
          }}
        />
      </View>
      {waiting && !enabled && (
        <Text className="mt-2 font-sans text-sm text-fg-muted">
          فعّل «السماح بالظهور فوق التطبيقات»، ثم ارجع للتطبيق. لإلغاء الطلب اضغط إيقاف.
        </Text>
      )}
      {waiting && !enabled && (
        <Pressable
          onPress={() => {
            void disableOverlay().catch(reportReminderError);
            setWaiting(false);
          }}
        >
          <Text className="mt-2 font-sans-bold text-sm text-primary">إيقاف</Text>
        </Pressable>
      )}
      {enabled && !status?.overlayRunning && android && (
        <Text className="mt-2 font-sans text-xs text-fg-muted">التذكير متوقف حاليًا. راجع إذن الظهور فوق التطبيقات.</Text>
      )}
      {android && enabled && status?.overlayRunning && (
        <Text className="mt-2 font-sans text-xs text-primary">خدمة التذكير تعمل. افتح تطبيقًا آخر وانتظر دقيقة بين ٧ صباحًا و١٠ مساءً.</Text>
      )}
      {android && enabled && (
        <Pressable accessibilityRole="button" onPress={() => Linking.openSettings().catch(reportReminderError)}>
          <Text className="mt-2 font-sans text-xs leading-5 text-fg-muted">
            لو التذكير بيتوقف بعد قفل التطبيق، افتح إعداداته واختر البطارية ← غير مقيّد، واسمح بالتشغيل التلقائي لو موجود.
          </Text>
          <Text className="mt-1 font-sans-bold text-sm text-primary">فتح إعدادات التطبيق</Text>
        </Pressable>
      )}
      {!!overlayError && (
        <Text accessibilityRole="alert" className="mt-2 font-sans text-sm text-accent-strong">{overlayError}</Text>
      )}
      {!!error && (
        <Pressable onPress={() => Linking.openSettings()}>
          <Text className="mt-2 font-sans text-sm text-accent-strong">{error}</Text>
        </Pressable>
      )}
    </View>
  );
}
