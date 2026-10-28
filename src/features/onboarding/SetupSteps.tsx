import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Check, LogIn, UserPlus } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Switch, Text, View } from "react-native";

import { amountLabel } from "@/core/khatma/schedule";
import { toArabicDigits } from "@/core/text/arabic";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";
import { useAccount } from "@/features/account/accountStore";
import { GoogleButton } from "@/features/account/AuthLayout";
import { useReciters } from "@/features/listen/useReciters";
import { StepLayout } from "@/features/onboarding/OnboardingStep";
import { onboarding, useOnboarding } from "@/features/onboarding/onboardingStore";
import { khatmaDays } from "@/features/onboarding/steps";
import { useSetupComplete } from "@/features/settings/preferences";
import { useThemeColor } from "@/theme/useThemeColor";

function tapHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

// ── Account ──

const PERKS = ["ختمتك وإعداداتك محفوظة على حسابك", "تقدّمك يبقى معك لو غيّرت هاتفك", "رحلة أطفالك وشهاداتك في مكان واحد"];

/**
 * Sign in or create an account, so everything set in the next steps is saved to it. Login and register
 * are modals that come back here; "متابعة كضيف" (the footer) is the way on without an account. A sign-in
 * made here moves on by itself.
 */
export function AccountStep({ onSignedIn }: { onSignedIn: () => void }) {
  const state = useAccount();
  const primary = useThemeColor("primary");
  const signedIn = state.status === "signed-in";
  const restored = useSetupComplete(signedIn ? state.userId : null) && signedIn;
  // Only a sign-in made on this step moves on by itself; coming back to it while signed in stays put.
  // A Google sign-in that cold-started the app (it reopens here, already signed in) counts as made here.
  const wasSignedIn = useRef(signedIn && !onboarding.googlePending());

  useEffect(() => {
    if (!signedIn || wasSignedIn.current) return;
    wasSignedIn.current = true;
    onboarding.setGooglePending(false);
    const id = setTimeout(onSignedIn, 900);
    return () => clearTimeout(id);
  }, [onSignedIn, signedIn]);

  if (signedIn) {
    const name = state.profile?.full_name?.trim() || state.email;
    return (
      <StepLayout
        art={require("@/assets/images/onboarding/stepper/login.jpg")}
        eyebrow="حسابك"
        title={`أهلًا بك، ${name.split(" ")[0]}`}
        subtitle={restored ? "استرجعنا إعداداتك من حسابك، وكل ما تغيّره يُحفظ عليه." : "كل ما تضبطه في الخطوات التالية يُحفظ على حسابك."}
      >
        <View className="items-center gap-2 rounded-2xl border border-primary/20 bg-primary-soft p-5">
          <Check size={22} color={primary} />
          <Text className="font-sans-bold text-base text-fg" numberOfLines={1}>
            {state.email}
          </Text>
          <Text className="font-sans text-sm text-primary">تم تسجيل الدخول</Text>
        </View>
      </StepLayout>
    );
  }

  return (
    <StepLayout
      art={require("@/assets/images/onboarding/stepper/register.jpg")}
      eyebrow="حسابك"
      title="احفظ تقدّمك في حسابك"
      subtitle="حساب مجاني يحفظ كل شيء لك."
    >
      <View className="gap-2.5">
        {PERKS.map((text) => (
          <View key={text} className="flex-row items-center gap-3">
            <View className="size-7 items-center justify-center rounded-full bg-primary-soft">
              <Check size={15} color={primary} />
            </View>
            <Text className="flex-1 font-sans text-sm leading-6 text-fg">{text}</Text>
          </View>
        ))}
      </View>
      <GoogleButton onStart={() => onboarding.setGooglePending(true)} onDone={() => {}} />
      <Button size="lg" icon={UserPlus} onPress={() => router.push("/register")}>
        إنشاء حساب جديد
      </Button>
      <Button variant="secondary" size="lg" icon={LogIn} onPress={() => router.push("/login")}>
        لديّ حساب بالفعل
      </Button>
    </StepLayout>
  );
}

// ── Favourite reciter ──

const POPULAR = ["عبد الباسط", "الحصري", "المنشاوي", "العفاسي", "السديس", "ماهر المعيقلي", "سعد الغامدي", "الشريم"];

export function ReciterStep() {
  const { favoriteReciterId } = useOnboarding();
  const { reciters } = useReciters();
  const primary = useThemeColor("primary");
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
      art={require("@/assets/images/onboarding/stepper/reciter.jpg")}
      eyebrow="الاستماع"
      title="قارئك المفضل"
      subtitle="نضعه في أول قائمة الاستماع."
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
          <Text className="mt-6 text-center font-sans text-sm text-fg-muted">
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
              className={`min-h-12 flex-row items-center justify-between rounded-2xl border px-4 py-3 ${active ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
            >
              <Text className={`flex-1 font-sans-bold text-base ${active ? "text-primary" : "text-fg"}`}>{item.name}</Text>
              {active && <Check size={18} color={primary} />}
            </Pressable>
          );
        }}
      />
    </StepLayout>
  );
}

// ── Daily wird ──

export const WIRD_PAGES = [1, 2, 4, 10, 20];

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      className={`min-h-12 min-w-[30%] grow items-center justify-center rounded-full border px-3 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
    >
      <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{label}</Text>
    </Pressable>
  );
}

/** How much a day: a khatma at that pace is created when onboarding finishes (and saved to the account). */
export function WirdStep({ wird, onWird }: { wird: number | null; onWird: (pages: number | null) => void }) {
  return (
    <StepLayout
      art={require("@/assets/images/onboarding/stepper/wird.jpg")}
      eyebrow="الورد اليومي"
      title="كم تقرأ كل يوم؟"
      subtitle="نبدأ لك ختمة على مهلك، وتغيّرها متى شئت."
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
      <Text className="text-center font-sans text-sm leading-6 text-accent-strong">
        {wird ? `تختم القرآن في نحو ${toArabicDigits(khatmaDays(wird))} يومًا بإذن الله.` : "تستطيع بدء ختمة من صفحتها في أي وقت."}
      </Text>
    </StepLayout>
  );
}

// ── Notifications ──

export interface NotificationChoices {
  adhan: boolean;
  adhkar: boolean;
}

function ToggleRow({ title, note, value, onChange }: { title: string; note: string; value: boolean; onChange: (value: boolean) => void }) {
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-1">
        <Text className="font-sans-bold text-base text-fg">{title}</Text>
        <Text className="font-sans text-sm leading-6 text-fg-muted">{note}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={(next) => {
          tapHaptic();
          onChange(next);
        }}
        trackColor={{ false: border, true: primary }}
        thumbColor={surface}
      />
    </View>
  );
}

/** The adhan and the adhkar reminders; the system permission is asked once, when onboarding finishes. */
export function NotificationsStep({ value, onChange }: { value: NotificationChoices; onChange: (value: NotificationChoices) => void }) {
  return (
    <StepLayout
      art={require("@/assets/images/onboarding/stepper/notifications.jpg")}
      eyebrow="التنبيهات"
      title="لا تفوتك صلاة ولا ذكر"
      subtitle="حتى والتطبيق مغلق. نطلب إذن الإشعارات مرة واحدة."
    >
      <ToggleRow
        title="الأذان"
        note="عند دخول وقت كل صلاة في مدينتك"
        value={value.adhan}
        onChange={(adhan) => onChange({ ...value, adhan })}
      />
      <ToggleRow
        title="أذكار الصباح والمساء"
        note="تذكير لطيف في وقت كل منهما"
        value={value.adhkar}
        onChange={(adhkar) => onChange({ ...value, adhkar })}
      />
    </StepLayout>
  );
}
