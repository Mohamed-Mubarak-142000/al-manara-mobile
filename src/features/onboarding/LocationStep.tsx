import * as Haptics from "expo-haptics";
import { Check, LocateFixed } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { StepLayout } from "@/features/onboarding/OnboardingStep";
import { CityDropdown } from "@/features/prayer/CityDropdown";
import { chooseCity, requestPreciseLocation, useUserLocation } from "@/features/prayer/locationStore";
import { useThemeColor } from "@/theme/useThemeColor";

function tapHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

export function LocationStep() {
  const location = useUserLocation();
  const primary = useThemeColor("primary");
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function locate() {
    setLocating(true);
    setMessage(null);
    const result = await requestPreciseLocation().catch(() => "error" as const);
    setLocating(false);
    if (result === "ok") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      setMessage(
        result === "denied" ? "لم نحصل على إذن الموقع، اختر مدينتك من القائمة." : "تعذّر تحديد موقعك الآن، اختر مدينتك من القائمة.",
      );
    }
  }

  return (
    <StepLayout art="prayer" eyebrow="مواقيت الصلاة" title="أين تصلّي؟" subtitle="لنضبط المواقيت والأذان على مدينتك.">
      <Button size="lg" icon={LocateFixed} disabled={locating} onPress={locate}>
        {locating ? "جارٍ التحديد…" : "استخدم موقعي الحالي"}
      </Button>
      {message ? <Text className="text-center font-sans text-xs leading-5 text-danger">{message}</Text> : null}

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text className="font-sans-bold text-xs text-fg-muted">أو اختر مدينتك</Text>
        <View className="h-px flex-1 bg-border" />
      </View>

      <CityDropdown
        value={location.source === "timezone" ? location.city : null}
        label={location.label}
        onChange={(city) => {
          tapHaptic();
          chooseCity(city);
        }}
      />

      <View className="flex-row items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3">
        <Check size={16} color={primary} />
        <Text className="flex-1 font-sans text-xs leading-5 text-fg-muted">
          المواقيت الحالية لـ <Text className="font-sans-bold text-primary">{location.label}</Text>
        </Text>
      </View>
    </StepLayout>
  );
}
