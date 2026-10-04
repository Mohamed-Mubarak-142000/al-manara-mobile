import { Image } from "expo-image";
import { router } from "expo-router";
import { Check, LocateFixed } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Switch, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CITY_CHOICES } from "@/core/prayer/location";
import { amountLabel } from "@/core/khatma/schedule";
import { ALL_DAYS } from "@/core/plan/schedule";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { khatma } from "@/features/khatma/khatmaStore";
import { useReciters } from "@/features/listen/useReciters";
import { onboarding, useOnboarding } from "@/features/onboarding/onboardingStore";
import { ensureAdhanPermission } from "@/features/prayer/adhanScheduler";
import { writeAdhanSettings } from "@/features/prayer/adhanSettings";
import { chooseCity, requestPreciseLocation, useUserLocation } from "@/features/prayer/locationStore";
import { track } from "@/lib/telemetry";
import { useThemeColor } from "@/theme/useThemeColor";

const STEPS = 3;
const WIRD_PAGES = [1, 2, 4, 10, 20];
const POPULAR = ["عبد الباسط", "الحصري", "المنشاوي", "العفاسي", "السديس", "ماهر المعيقلي", "سعد الغامدي", "الشريم"];

function Dots({ step }: { step: number }) {
  return (
    <View className="flex-row justify-center gap-2">
      {Array.from({ length: STEPS }, (_, index) => (
        <View key={index} className={`h-2 rounded-full ${index === step ? "w-6 bg-gold" : "w-2 bg-white/30"}`} />
      ))}
    </View>
  );
}

/** Three short first-run steps: city for prayer times, a favourite reciter, and a daily wird. All skippable. */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  const [step, setStep] = useState(0);
  const location = useUserLocation();
  const { favoriteReciterId } = useOnboarding();
  const { reciters } = useReciters();
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [wird, setWird] = useState<number | null>(2);
  const [adhan, setAdhan] = useState(true);
  const [busy, setBusy] = useState(false);

  const reciterList = useMemo(() => {
    if (!reciters) return [];
    const needle = normalizeArabic(query.trim());
    if (needle) return reciters.filter((reciter) => normalizeArabic(reciter.name).includes(needle)).slice(0, 60);
    // Well-known reciters first, so most people find theirs without typing.
    const popular = reciters.filter((reciter) => POPULAR.some((name) => reciter.name.includes(name)));
    return [...popular, ...reciters.filter((reciter) => !popular.includes(reciter))].slice(0, 60);
  }, [reciters, query]);

  async function finish() {
    setBusy(true);
    if (wird) await khatma.create({ mode: "amount", unit: "pages", perSession: wird, targetDay: "", days: [...ALL_DAYS] });
    if (adhan && (await ensureAdhanPermission())) writeAdhanSettings({ enabled: true });
    onboarding.finish();
    track("onboarding_finished", { wird: wird ?? 0, adhan });
    setBusy(false);
    router.replace("/");
  }

  function skipAll() {
    onboarding.finish();
    router.replace("/");
  }

  return (
    <View className="flex-1 bg-emerald-night" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}>
      <View className="flex-row items-center justify-between px-5">
        <Image source={require("@/assets/images/brand/logo.png")} contentFit="contain" style={{ width: 40, height: 40 }} />
        <Pressable accessibilityRole="button" onPress={skipAll} hitSlop={10}>
          <Text className="font-sans-bold text-sm text-white/70">تخطّي</Text>
        </Pressable>
      </View>

      <Animated.View key={step} entering={FadeIn.duration(300)} className="flex-1 px-5 pt-6">
        {step === 0 && (
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text className="font-display-bold text-3xl leading-[48px] text-hero-fg">أهلًا بك في المنارة</Text>
            <Text className="font-sans text-base leading-8 text-white/75">لنضبط مواقيت الصلاة على مدينتك. موقعك يبقى على هاتفك فقط.</Text>
            <Button
              variant="gold"
              icon={LocateFixed}
              disabled={locating}
              onPress={async () => {
                setLocating(true);
                await requestPreciseLocation();
                setLocating(false);
              }}
            >
              {locating ? "جارٍ التحديد…" : "استخدم موقعي الحالي"}
            </Button>
            <Text className="font-sans-bold text-sm text-white/70">أو اختر مدينتك</Text>
            <View className="flex-row flex-wrap gap-2">
              {CITY_CHOICES.map((city) => {
                const active = location.source === "timezone" && location.city === city.city;
                return (
                  <Pressable
                    key={city.city}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => chooseCity(city.city)}
                    className={`rounded-full px-3.5 py-2 ${active ? "bg-gold" : "bg-white/10"}`}
                  >
                    <Text className={`font-sans-bold text-sm ${active ? "text-emerald-night" : "text-white/85"}`}>{city.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="font-sans text-sm text-gold-soft">المختار: {location.label}</Text>
          </ScrollView>
        )}

        {step === 1 && (
          <View className="flex-1 gap-4">
            <Text className="font-display-bold text-3xl leading-[48px] text-hero-fg">قارئك المفضل</Text>
            <Text className="font-sans text-base leading-7 text-white/75">نضعه في أول قائمة الاستماع ليكون أقرب إليك.</Text>
            <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن قارئ" />
            <FlatList
              data={reciterList}
              keyExtractor={(reciter) => String(reciter.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
              ListEmptyComponent={
                <Text className="mt-6 text-center font-sans text-sm text-white/60">
                  {reciters ? "لا يوجد قارئ بهذا الاسم." : "جارٍ تحميل القرّاء…"}
                </Text>
              }
              renderItem={({ item }) => {
                const active = item.id === favoriteReciterId;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => onboarding.setFavoriteReciter(active ? null : item.id)}
                    className={`flex-row items-center justify-between rounded-2xl px-4 py-3 ${active ? "bg-gold" : "bg-white/10"}`}
                  >
                    <Text className={`font-display-bold text-base ${active ? "text-emerald-night" : "text-white"}`}>{item.name}</Text>
                    {active && <Check size={18} color="#012a22" />}
                  </Pressable>
                );
              }}
            />
          </View>
        )}

        {step === 2 && (
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text className="font-display-bold text-3xl leading-[48px] text-hero-fg">وردك اليومي</Text>
            <Text className="font-sans text-base leading-8 text-white/75">
              كم تقرأ كل يوم؟ نبدأ لك ختمة ونذكّرك بوردك، ويمكنك تغييرها لاحقًا.
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {WIRD_PAGES.map((pages) => (
                <Pressable
                  key={pages}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: wird === pages }}
                  onPress={() => setWird(pages)}
                  className={`rounded-full px-4 py-2.5 ${wird === pages ? "bg-gold" : "bg-white/10"}`}
                >
                  <Text className={`font-sans-bold text-sm ${wird === pages ? "text-emerald-night" : "text-white/85"}`}>
                    {pages === 20 ? "جزء كامل" : amountLabel("pages", pages)}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: wird === null }}
                onPress={() => setWird(null)}
                className={`rounded-full px-4 py-2.5 ${wird === null ? "bg-gold" : "bg-white/10"}`}
              >
                <Text className={`font-sans-bold text-sm ${wird === null ? "text-emerald-night" : "text-white/85"}`}>لاحقًا</Text>
              </Pressable>
            </View>
            <View className="flex-row items-center justify-between rounded-2xl bg-white/10 p-4">
              <View className="flex-1">
                <Text className="font-display-bold text-base text-white">تنبيه الأذان</Text>
                <Text className="font-sans text-xs text-white/65">إشعار عند دخول وقت كل صلاة</Text>
              </View>
              <Switch value={adhan} onValueChange={setAdhan} trackColor={{ false: border, true: primary }} thumbColor={surface} />
            </View>
          </ScrollView>
        )}
      </Animated.View>

      <View className="gap-4 px-5">
        <Dots step={step} />
        <View className="flex-row gap-3">
          {step > 0 && (
            <Button variant="light" className="flex-1" onPress={() => setStep(step - 1)}>
              السابق
            </Button>
          )}
          {step < STEPS - 1 ? (
            <Button variant="gold" className="flex-1" onPress={() => setStep(step + 1)}>
              التالي
            </Button>
          ) : (
            <Button variant="gold" className="flex-1" disabled={busy} onPress={finish}>
              {busy ? "لحظة…" : "ابدأ"}
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}
