import * as Haptics from "expo-haptics";
import { Bell, BookMarked, Check, Headphones, LocateFixed, MapPin } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Switch, Text, View } from "react-native";

import { amountLabel } from "@/core/khatma/schedule";
import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { useReciters } from "@/features/listen/useReciters";
import { StepLayout } from "@/features/onboarding/OnboardingStep";
import { onboarding, useOnboarding } from "@/features/onboarding/onboardingStore";
import { khatmaDays } from "@/features/onboarding/steps";
import { CityDropdown } from "@/features/prayer/CityDropdown";
import { chooseCity, requestPreciseLocation, useUserLocation } from "@/features/prayer/locationStore";
import { useThemeColor } from "@/theme/useThemeColor";

export const WIRD_PAGES = [1, 2, 4, 10, 20];
const POPULAR = ["عبد الباسط", "الحصري", "المنشاوي", "العفاسي", "السديس", "ماهر المعيقلي", "سعد الغامدي", "الشريم"];

export function tapHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

// ── Location ──

export function LocationStep() {
  const location = useUserLocation();
  const gold = useThemeColor("gold-soft");
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
      setMessage(result === "denied" ? "لم نحصل على إذن الموقع، اختر مدينتك من القائمة." : "تعذّر تحديد موقعك الآن، اختر مدينتك من القائمة.");
    }
  }

  return (
    <StepLayout icon={MapPin} eyebrow="مواقيت الصلاة" title="أين تصلّي؟" subtitle="نضبط المواقيت والأذان على مدينتك. موقعك يبقى على هاتفك فقط.">
      <Button variant="gold" size="lg" icon={LocateFixed} disabled={locating} onPress={locate}>
        {locating ? "جارٍ التحديد…" : "استخدم موقعي الحالي"}
      </Button>
      {message ? <Text className="text-center font-sans text-xs leading-5 text-gold-soft">{message}</Text> : null}

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-white/15" />
        <Text className="font-sans-bold text-xs text-white/60">أو اختر مدينتك</Text>
        <View className="h-px flex-1 bg-white/15" />
      </View>

      <CityDropdown
        value={location.source === "timezone" ? location.city : null}
        label={location.label}
        onChange={(city) => {
          tapHaptic();
          chooseCity(city);
        }}
      />

      <View className="flex-row items-center gap-2 rounded-2xl bg-white/5 px-4 py-3">
        <Check size={16} color={gold} />
        <Text className="flex-1 font-sans text-xs leading-5 text-white/70">
          المواقيت الحالية لـ <Text className="font-sans-bold text-white">{location.label}</Text>
        </Text>
      </View>
    </StepLayout>
  );
}

// ── Favourite reciter ──

export function ReciterStep() {
  const { favoriteReciterId } = useOnboarding();
  const { reciters } = useReciters();
  const hero = useThemeColor("hero");
  const [query, setQuery] = useState("");

  const reciterList = useMemo(() => {
    if (!reciters) return [];
    const needle = normalizeArabic(query.trim());
    if (needle) return reciters.filter((reciter) => normalizeArabic(reciter.name).includes(needle)).slice(0, 60);
    // Well-known reciters first, so most people find theirs without typing.
    const popular = reciters.filter((reciter) => POPULAR.some((name) => reciter.name.includes(name)));
    return [...popular, ...reciters.filter((reciter) => !popular.includes(reciter))].slice(0, 60);
  }, [reciters, query]);

  return (
    <StepLayout
      icon={Headphones}
      eyebrow="الاستماع"
      title="قارئك المفضل"
      subtitle="نضعه في أول قائمة الاستماع ليكون صوته أقرب إليك."
      scroll={false}
    >
      <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن قارئ" />
      <FlatList
        data={reciterList}
        style={{ flex: 1 }}
        keyExtractor={(reciter) => String(reciter.id)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
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
              onPress={() => {
                tapHaptic();
                onboarding.setFavoriteReciter(active ? null : item.id);
              }}
              className={`flex-row items-center justify-between rounded-2xl px-4 py-3.5 ${active ? "bg-gold" : "bg-white/8"}`}
            >
              <Text className={`flex-1 font-display-bold text-base ${active ? "text-emerald-night" : "text-white"}`}>{item.name}</Text>
              {active && <Check size={18} color={hero} />}
            </Pressable>
          );
        }}
      />
    </StepLayout>
  );
}

// ── Daily wird + adhan ──

interface WirdStepProps {
  wird: number | null;
  onWird: (pages: number | null) => void;
  adhan: boolean;
  onAdhan: (value: boolean) => void;
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      className={`min-w-[30%] grow items-center rounded-2xl border px-3 py-3 ${active ? "border-gold bg-gold" : "border-white/10 bg-white/8"}`}
    >
      <Text className={`font-sans-bold text-sm ${active ? "text-emerald-night" : "text-white/85"}`}>{label}</Text>
    </Pressable>
  );
}

export function WirdStep({ wird, onWird, adhan, onAdhan }: WirdStepProps) {
  const gold = useThemeColor("gold");
  const goldSoft = useThemeColor("gold-soft");
  const heroFg = useThemeColor("hero-fg");

  return (
    <StepLayout
      icon={BookMarked}
      eyebrow="الورد والأذان"
      title="وردك اليومي"
      subtitle="كم تقرأ كل يوم؟ نبدأ لك ختمة ونذكّرك بلطف، ويمكنك تغييرها متى شئت."
    >
      <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
        {WIRD_PAGES.map((pages) => (
          <Choice
            key={pages}
            label={pages === 20 ? "جزء كامل" : amountLabel("pages", pages)}
            active={wird === pages}
            onPress={() => onWird(pages)}
          />
        ))}
        <Choice label="لاحقًا" active={wird === null} onPress={() => onWird(null)} />
      </View>

      <Text className="text-center font-sans text-xs leading-6 text-gold-soft">
        {wird
          ? `بهذا الورد تختم القرآن في نحو ${toArabicDigits(khatmaDays(wird))} يومًا بإذن الله.`
          : "لن نبدأ ختمة الآن، وتستطيع بدءها من صفحة الختمة في أي وقت."}
      </Text>

      <View className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
        <Bell size={20} color={goldSoft} />
        <View className="flex-1">
          <Text className="font-display-bold text-base text-white">الأذان وتذكير الأذكار</Text>
          <Text className="font-sans text-xs leading-5 text-white/65">
            الأذان عند دخول كل صلاة، وتذكير بأذكار الصباح والمساء، حتى والتطبيق مغلق. سنطلب إذن الإشعارات مرة واحدة.
          </Text>
        </View>
        <Switch
          accessibilityLabel="الأذان وتذكير الأذكار"
          value={adhan}
          onValueChange={(value) => {
            tapHaptic();
            onAdhan(value);
          }}
          trackColor={{ false: "rgba(255,255,255,0.2)", true: gold }}
          thumbColor={heroFg}
        />
      </View>
    </StepLayout>
  );
}
