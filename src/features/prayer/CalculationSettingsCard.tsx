import { Calculator, Check, ChevronLeft, Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { CALC_METHODS, MADHAB_LABELS, OFFSET_LIMIT, ZERO_OFFSETS, calcMethodInfo, type AsrMadhab } from "@/core/prayer/calculation";
import { PRAYER_LABELS, PRAYER_ORDER, type PrayerKey } from "@/core/prayer/prayerTimesApi";
import { toArabicDigits } from "@/core/text/arabic";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useThemeColor } from "@/theme/useThemeColor";

import { usePrayerCalcSettings, writePrayerCalcSettings } from "./prayerCalcSettings";

const MADHABS: readonly AsrMadhab[] = ["shafi", "hanafi"];

function signed(minutes: number): string {
  return minutes === 0 ? "٠" : `${minutes > 0 ? "+" : "−"}${toArabicDigits(Math.abs(minutes))}`;
}

/** "طريقة الحساب": the method, the Asr madhab and per-prayer minute offsets, edited in a sheet. */
export function CalculationSettingsCard() {
  const settings = usePrayerCalcSettings();
  const primary = useThemeColor("primary");
  const fg = useThemeColor("fg");
  const [open, setOpen] = useState(false);
  const tuned = PRAYER_ORDER.filter((key) => settings.offsets[key] !== 0).length;

  function nudge(key: PrayerKey, by: number) {
    const value = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, settings.offsets[key] + by));
    writePrayerCalcSettings({ offsets: { ...settings.offsets, [key]: value } });
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="طريقة الحساب، اضغط للتغيير"
        onPress={() => setOpen(true)}
        className="mt-5 flex-row items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-card"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
          <Calculator size={20} color={primary} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-base text-fg">طريقة الحساب</Text>
          <Text className="font-sans text-xs text-fg-muted" numberOfLines={2}>
            {calcMethodInfo(settings.method).label} · العصر: {settings.madhab === "hanafi" ? "حنفي" : "الجمهور"}
            {tuned > 0 ? ` · تعديل ${toArabicDigits(tuned)} ${tuned > 2 ? "مواقيت" : "وقت"}` : ""}
          </Text>
        </View>
        <ChevronLeft size={18} color={primary} />
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="طريقة الحساب"
        icon={Calculator}
        primary={{ label: "تم", onPress: () => setOpen(false) }}
      >
        <View>
          <View className="gap-1">
            {CALC_METHODS.map((method) => {
              const active = method.id === settings.method;
              return (
                <Pressable
                  key={method.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => writePrayerCalcSettings({ method: method.id })}
                  className={`flex-row items-center justify-between rounded-2xl px-4 py-3 ${active ? "bg-primary-soft" : ""}`}
                >
                  <Text className={`flex-1 font-sans-bold text-sm ${active ? "text-primary" : "text-fg"}`}>{method.label}</Text>
                  {active && <Check size={18} color={primary} />}
                </Pressable>
              );
            })}
          </View>

          <Text className="mt-5 font-sans-bold text-base text-fg">وقت العصر</Text>
          <View className="mt-2 flex-row gap-2">
            {MADHABS.map((madhab) => {
              const active = settings.madhab === madhab;
              return (
                <Pressable
                  key={madhab}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => writePrayerCalcSettings({ madhab })}
                  className={`flex-1 items-center rounded-full border px-3 py-2.5 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
                >
                  <Text className={`text-center font-sans-bold text-xs ${active ? "text-on-primary" : "text-fg"}`}>
                    {MADHAB_LABELS[madhab]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-5 flex-row items-center justify-between">
            <Text className="font-sans-bold text-base text-fg">تعديل المواقيت بالدقائق</Text>
            {tuned > 0 && (
              <Pressable accessibilityRole="button" onPress={() => writePrayerCalcSettings({ offsets: ZERO_OFFSETS })} hitSlop={8}>
                <Text className="font-sans-bold text-xs text-primary">تصفير الكل</Text>
              </Pressable>
            )}
          </View>
          <Text className="mt-1 font-sans text-xs text-fg-muted">لمطابقة مسجدك: يُضاف إلى الوقت المحسوب أو يُطرح منه (حتى ٣٠ دقيقة).</Text>
          <View className="mt-2 mb-2">
            {PRAYER_ORDER.map((key) => (
              <View key={key} className="flex-row items-center justify-between border-b border-border py-2">
                <Text className="font-sans-semibold text-base text-fg">{PRAYER_LABELS[key]}</Text>
                <View className="flex-row items-center gap-3">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`تأخير ${PRAYER_LABELS[key]} دقيقة`}
                    disabled={settings.offsets[key] >= OFFSET_LIMIT}
                    onPress={() => nudge(key, 1)}
                    hitSlop={6}
                    className="size-9 items-center justify-center rounded-xl border border-border bg-surface"
                  >
                    <Plus size={16} color={fg} />
                  </Pressable>
                  <Text
                    className={`w-10 text-center font-sans-bold text-base ${settings.offsets[key] ? "text-primary" : "text-fg-muted"}`}
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {signed(settings.offsets[key])}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`تقديم ${PRAYER_LABELS[key]} دقيقة`}
                    disabled={settings.offsets[key] <= -OFFSET_LIMIT}
                    onPress={() => nudge(key, -1)}
                    hitSlop={6}
                    className="size-9 items-center justify-center rounded-xl border border-border bg-surface"
                  >
                    <Minus size={16} color={fg} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </BottomSheet>
    </>
  );
}
