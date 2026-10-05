import { useState } from "react";
import { Linking, Platform, Pressable, Switch, Text, View } from "react-native";

import { background } from "../../../modules/almanara-background";
import { enableOverlay, disableOverlay, useOverlayConfig } from "@/features/notifications/BackgroundReminders";
import { clearReminderError, reportReminderError, useBackgroundStatus } from "@/features/notifications/backgroundReminderStatus";
import { useThemeColor } from "@/theme/useThemeColor";

import { setOutsideAdhkarNotifications, useOutsideAdhkarNotifications } from "./adhkarReminders";

export function OutsideReminderCard() {
  const { status, error } = useBackgroundStatus();
  const config = useOverlayConfig();
  const iosEnabled = useOutsideAdhkarNotifications();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  const android = Platform.OS === "android";
  const enabled = android ? status?.overlayEnabled === true : iosEnabled;
  return (
    <View className="mx-4 mt-4 rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">{android ? "ذكر كل دقيقة فوق التطبيقات" : "إشعارات أذكار اليوم"}</Text>
          <Text className="mt-1 font-sans text-xs leading-5 text-fg-muted">
            {android
              ? "بطاقة لمدة ٥ ثوانٍ كل دقيقة من ٧ صباحًا إلى ١٠ مساءً، أثناء فتح الشاشة. اضغط عليها لإغلاقها."
              : "ذكر في إشعار كل ساعة من ٧ صباحًا إلى ١٠ مساءً. آيفون لا يدعم الظهور فوق التطبيقات أو التوقيت كل دقيقة في الخلفية."}
          </Text>
        </View>
        <Switch
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
            void disableOverlay();
            setWaiting(false);
          }}
        >
          <Text className="mt-2 font-sans-bold text-sm text-primary">إيقاف</Text>
        </Pressable>
      )}
      {enabled && !status?.overlayRunning && android && (
        <Text className="mt-2 font-sans text-xs text-fg-muted">التذكير متوقف حاليًا. راجع إذن الظهور فوق التطبيقات.</Text>
      )}
      {!!error && (
        <Pressable onPress={() => Linking.openSettings()}>
          <Text className="mt-2 font-sans text-sm text-accent-strong">{error}</Text>
        </Pressable>
      )}
    </View>
  );
}
