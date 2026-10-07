import { router } from "expo-router";
import { ChevronLeft, ChevronRight, Headphones, Save, Settings2, UserRound } from "lucide-react-native";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { useAccount } from "@/features/account/accountStore";
import { OutsideReminderCard } from "@/features/adhkar/OutsideReminderCard";
import { AdhanSettingsCard } from "@/features/prayer/AdhanSettingsCard";
import { CalculationSettingsCard } from "@/features/prayer/CalculationSettingsCard";
import { savePreferences, useSetupComplete } from "@/features/settings/preferences";
import {
  AdhkarRemindersCard,
  AdhkarToastCard,
  LocationCard,
  NotificationPermissionCard,
  ReadingCard,
  SpecialDaysCard,
  TextSizeCard,
} from "@/features/settings/SettingsCards";
import { useThemeColor } from "@/theme/useThemeColor";

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <View className="mt-4 px-1">
        <Text className="font-display-bold text-lg text-fg">{title}</Text>
        {hint && <Text className="font-sans text-xs leading-5 text-fg-muted">{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function LinkCard({ icon: Icon, title, hint, onPress }: { icon: typeof Headphones; title: string; hint: string; onPress: () => void }) {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface p-4">
        <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
          <Icon size={22} color={primary} />
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">{title}</Text>
          <Text className="font-sans text-xs text-fg-muted">{hint}</Text>
        </View>
        <ChevronLeft size={18} color={muted} />
      </View>
    </Pressable>
  );
}

/**
 * Every setting of the app in one place: notifications first (permission, adhan, adhkar reminders),
 * then prayer times, reading and display. Saving stores them on the account (user_preferences), so they
 * follow the user to another phone, and marks setup as done.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const account = useAccount();
  const userId = account.status === "signed-in" ? account.userId : null;
  const complete = useSetupComplete(userId);
  const [saved, setSaved] = useState(false);

  function save() {
    savePreferences({ complete: true });
    setSaved(true);
  }

  return (
    <View className="flex-1 bg-bg">
      <Screen bleed>
        <PageHeader
          kicker="الإعدادات"
          icon={Settings2}
          title="إعداداتك في مكان واحد"
          description="الأذان والتذكيرات والمواقيت والقراءة. تُحفظ في حسابك وتتبعك على أي جهاز."
        />
        <Section className="mt-2 gap-3 pb-32">
          <Group title="الإشعارات" hint="فعّلها مرة واحدة، ثم اختر ما يصلك منها.">
            <NotificationPermissionCard />
            <SpecialDaysCard />
          </Group>

          <Group title="الأذان" hint="يرتفع الأذان عند دخول كل صلاة، حتى والتطبيق مغلق.">
            <AdhanSettingsCard />
          </Group>

          <Group title="تذكير الأذكار">
            <AdhkarRemindersCard />
            {Platform.OS === "android" ? <OutsideReminderCard embedded /> : null}
            <AdhkarToastCard />
          </Group>

          <Group title="مواقيت الصلاة">
            <LocationCard />
            <CalculationSettingsCard />
          </Group>

          <Group title="القراءة والعرض">
            <ReadingCard />
            <TextSizeCard />
          </Group>

          {userId ? (
            <LinkCard icon={UserRound} title="الحساب" hint="اسمك، وأطفالك، وكلمة المرور، ورسائل البريد" onPress={() => router.push("/account")} />
          ) : null}
        </Section>
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/more"))}
        hitSlop={12}
        className="absolute end-3 size-10 items-center justify-center rounded-full bg-white/10"
        style={{ top: insets.top + 12 }}
      >
        <ChevronRight size={24} color={heroFg} />
      </Pressable>

      <View className="absolute inset-x-0 bottom-0 border-t border-border bg-surface px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Button size="lg" icon={Save} variant={saved ? "outline" : "primary"} onPress={save}>
          {saved ? (userId ? "حُفظت في حسابك ✓" : "حُفظت على هذا الجهاز ✓") : complete ? "حفظ التغييرات" : "حفظ الإعدادات"}
        </Button>
        {!userId && account.status !== "loading" && (
          <Text className="mt-2 text-center font-sans text-xs text-fg-muted">سجّل الدخول لتُحفظ إعداداتك في حسابك وتنتقل معك.</Text>
        )}
      </View>
    </View>
  );
}
