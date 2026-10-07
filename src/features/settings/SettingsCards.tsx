import * as Notifications from "expo-notifications";
import { ALargeSmall, Bell, BellOff, BellRing, BookOpen, LocateFixed, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Pressable, Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { setAdhkarReminder, useAdhkarReminders, type ReminderKind } from "@/features/adhkar/adhkarReminders";
import { setAdhkarToastEnabled, useAdhkarToastEnabled } from "@/features/adhkar/AdhkarToaster";
import { FONT_SIZES, reader, useReaderState } from "@/features/mushaf/readerPrefs";
import { reportReminderError } from "@/features/notifications/backgroundReminderStatus";
import { CityDropdown } from "@/features/prayer/CityDropdown";
import { chooseCity, requestPreciseLocation, useUserLocation } from "@/features/prayer/locationStore";
import { TEXT_SCALES, setTextScale, useTextScale } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

// ── App text size ──

export function TextSizeCard() {
  const primary = useThemeColor("primary");
  const scale = useTextScale();
  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
          <ALargeSmall size={22} color={primary} />
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">حجم الخط</Text>
          <Text className="font-sans text-xs text-fg-muted">لنصوص التطبيق كلها، وللمصحف حجم خاص في الأسفل.</Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        {TEXT_SCALES.map((option) => {
          const active = option.value === scale;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setTextScale(option.value)}
              className={`flex-1 items-center rounded-2xl border py-2 ${active ? "border-primary bg-primary" : "border-border bg-bg"}`}
            >
              <Text className={`font-sans-bold ${active ? "text-on-primary" : "text-fg"}`} style={{ fontSize: 14 * option.value }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── The in-app dhikr card ──

export function AdhkarToastCard() {
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  const enabled = useAdhkarToastEnabled();
  return (
    <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface p-4">
      <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
        <Sparkles size={22} color={primary} />
      </View>
      <View className="flex-1">
        <Text className="font-display-bold text-base text-fg">ذكّر قلبك داخل التطبيق</Text>
        <Text className="font-sans text-xs leading-5 text-fg-muted">ذكر قصير كل ١٠ دقائق وأنت تتصفح التطبيق.</Text>
      </View>
      <Switch value={enabled} onValueChange={setAdhkarToastEnabled} trackColor={{ false: border, true: primary }} thumbColor={surface} />
    </View>
  );
}

// ── Notifications permission: one place to turn it on ──

/** Whether notifications are allowed, re-checked whenever the user comes back from the system settings. */
export function useNotificationPermission() {
  const [status, setStatus] = useState<{ granted: boolean; canAskAgain: boolean } | null>(null);
  const refresh = useCallback(() => {
    Notifications.getPermissionsAsync()
      .then((result) => setStatus({ granted: result.granted, canAskAgain: result.canAskAgain }))
      .catch(() => setStatus({ granted: false, canAskAgain: true }));
  }, []);
  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);
  const request = useCallback(async () => {
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && !current.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    const result = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    setStatus({ granted: result.granted, canAskAgain: result.canAskAgain });
  }, []);
  return { status, request };
}

export function NotificationPermissionCard() {
  const { status, request } = useNotificationPermission();
  const primary = useThemeColor("primary");
  if (!status) return null;
  if (status.granted) {
    return (
      <View className="flex-row items-center gap-3 rounded-3xl border border-primary/30 bg-primary-soft p-4">
        <BellRing size={22} color={primary} />
        <Text className="flex-1 font-sans-bold text-sm text-fg">الإشعارات مفعّلة، وتصلك التنبيهات التي تختارها هنا.</Text>
      </View>
    );
  }
  return (
    <View className="gap-3 rounded-3xl border border-gold/40 bg-accent-soft p-4">
      <View className="flex-row items-center gap-3">
        <BellOff size={22} color={primary} />
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">الإشعارات متوقفة</Text>
          <Text className="font-sans text-xs leading-5 text-fg-muted">لن يصلك الأذان ولا تذكير الأذكار حتى تسمح بها مرة واحدة.</Text>
        </View>
      </View>
      <Button icon={Bell} onPress={() => void request()}>
        {status.canAskAgain ? "تفعيل الإشعارات" : "فتح إعدادات الجهاز"}
      </Button>
    </View>
  );
}

// ── Adhkar reminders ──

const REMINDER_ROWS: { kind: ReminderKind; title: string; hint: string }[] = [
  { kind: "morning", title: "أذكار الصباح", hint: "كل يوم الساعة ٧:٠٠ صباحًا" },
  { kind: "evening", title: "أذكار المساء", hint: "كل يوم الساعة ٥:٠٠ مساءً" },
  { kind: "friday", title: "الجمعة وسورة الكهف", hint: "كل جمعة الساعة ١٠:٠٠ صباحًا" },
];

export function AdhkarRemindersCard() {
  const reminders = useAdhkarReminders();
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  const [denied, setDenied] = useState(false);
  return (
    <View className="rounded-3xl border border-border bg-surface px-4">
      {REMINDER_ROWS.map((row, index) => (
        <View key={row.kind} className={`flex-row items-center gap-3 py-3.5 ${index < REMINDER_ROWS.length - 1 ? "border-b border-border" : ""}`}>
          <View className="flex-1">
            <Text className="font-display-bold text-[15px] text-fg">{row.title}</Text>
            <Text className="font-sans text-xs text-fg-muted">{row.hint}</Text>
          </View>
          <Switch
            accessibilityLabel={`تذكير ${row.title}`}
            value={reminders[row.kind].enabled}
            onValueChange={async (value) => {
              try {
                setDenied(!(await setAdhkarReminder(row.kind, value)));
              } catch (error) {
                reportReminderError(error);
              }
            }}
            trackColor={{ false: border, true: primary }}
            thumbColor={surface}
          />
        </View>
      ))}
      {denied && <Text className="pb-3 font-sans text-xs text-danger">اسمح بالإشعارات أولًا من البطاقة في الأعلى.</Text>}
    </View>
  );
}

// ── Location ──

export function LocationCard() {
  const location = useUserLocation();
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <View className="gap-3 rounded-3xl bg-hero p-4">
      <Text className="font-sans text-xs text-white/70">المواقيت والأذان حسب</Text>
      <CityDropdown value={location.source === "timezone" ? location.city : null} label={location.label} onChange={chooseCity} />
      <Button
        variant="light"
        icon={LocateFixed}
        disabled={locating}
        onPress={async () => {
          setLocating(true);
          setMessage(null);
          const result = await requestPreciseLocation().catch(() => "error" as const);
          setLocating(false);
          if (result !== "ok") setMessage(result === "denied" ? "لم نحصل على إذن الموقع، اختر مدينتك من القائمة." : "تعذّر تحديد موقعك الآن.");
        }}
      >
        {locating ? "جارٍ التحديد…" : "استخدم موقعي الحالي"}
      </Button>
      {message && <Text className="font-sans text-xs text-gold-soft">{message}</Text>}
    </View>
  );
}

// ── Mushaf reading ──

export function ReadingCard() {
  const { prefs } = useReaderState();
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  return (
    <View className="gap-4 rounded-3xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <BookOpen size={20} color={primary} />
        <Text className="flex-1 font-display-bold text-base text-fg">المصحف</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="font-sans-bold text-sm text-fg">ألوان التجويد</Text>
          <Text className="font-sans text-xs text-fg-muted">تلوين أحكام التجويد في رواية حفص</Text>
        </View>
        <Switch value={prefs.tajweed} onValueChange={reader.setTajweed} trackColor={{ false: border, true: primary }} thumbColor={surface} />
      </View>
      <View className="gap-2">
        <Text className="font-sans-bold text-sm text-fg">حجم خط المصحف</Text>
        <View className="flex-row gap-2">
          {FONT_SIZES.map((size, step) => {
            const active = prefs.fontStep === step;
            return (
              <Pressable
                key={size}
                accessibilityRole="radio"
                accessibilityLabel={`حجم ${step + 1}`}
                accessibilityState={{ selected: active }}
                onPress={() => reader.setFontStep(step)}
                className={`flex-1 items-center rounded-2xl border py-2 ${active ? "border-primary bg-primary" : "border-border bg-bg"}`}
              >
                <Text className={`font-quran ${active ? "text-on-primary" : "text-fg"}`} style={{ fontSize: 14 + step * 3 }}>
                  ق
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="font-sans text-xs text-fg-muted">الحجم العادي وما أصغر منه يعرض الصفحة كاملة، والأكبر يُقرأ بالتمرير.</Text>
      </View>
    </View>
  );
}
