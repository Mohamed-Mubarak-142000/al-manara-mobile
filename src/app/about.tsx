import Constants from "expo-constants";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ChevronLeft, FileText, Globe, Info, Mail, Share2, ShieldCheck, type LucideIcon } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { CONTACT_EMAIL, missionText } from "@/core/legal/legalContent";
import { toArabicDigits } from "@/core/text/arabic";
import { enterSoft } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { BackHeader } from "@/features/legal/BackHeader";
import { CrashReport } from "@/features/legal/CrashReport";
import { SITE_URL, openSitePage, shareApp } from "@/features/legal/site";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

const PROMISES = ["مجاني بالكامل", "بلا إعلانات", "القرآن دون إنترنت"];

function Row({
  icon: Icon,
  title,
  hint,
  onPress,
  last,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View className={`flex-row items-center gap-3 px-4 py-4 ${last ? "" : "border-b border-border"}`}>
        <View className="size-10 items-center justify-center rounded-2xl bg-primary-soft">
          <Icon size={18} color={primary} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-[15px] text-fg">{title}</Text>
          {hint && <Text className="font-sans text-xs text-fg-muted">{hint}</Text>}
        </View>
        <ChevronLeft size={18} color={muted} />
      </View>
    </Pressable>
  );
}

/** عن المنارة: who we are, the app version, the legal pages and how to reach us. */
export default function AboutScreen() {
  const version = Constants.expoConfig?.version;
  const mission = useScaledText(17, 32);

  return (
    <Screen bleed>
      <BackHeader kicker="عن المنارة" icon={Info} title="المنارة" description="علمٌ ينير قلبك، ومعرفةٌ ترافق يومك.">
        <Animated.View entering={FadeIn.duration(400)} className="mb-5 self-center">
          <View className="size-28 items-center justify-center rounded-4xl border border-border bg-primary-soft">
            <Image
              source={require("@/assets/images/brand/logo.png")}
              style={{ width: 88, height: 88 }}
              contentFit="contain"
              accessibilityLabel="شعار المنارة"
            />
          </View>
        </Animated.View>
      </BackHeader>

      <Section className="mt-2 gap-4">
        <Animated.View entering={enterSoft(3)} className="gap-4 rounded-3xl border border-gold/40 bg-accent-soft p-5">
          <Text className="font-sans-bold text-sm text-accent-strong">رسالتنا</Text>
          <Text className="font-sans text-fg" style={mission}>
            {missionText()}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {PROMISES.map((promise) => (
              <View key={promise} className="rounded-full border border-gold/40 bg-surface px-3 py-1">
                <Text className="font-sans-bold text-xs text-accent-strong">{promise}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
          <Row icon={ShieldCheck} title="سياسة الخصوصية" onPress={() => router.push("/privacy")} />
          <Row icon={FileText} title="شروط الاستخدام" onPress={() => router.push("/terms")} />
          {SITE_URL ? <Row icon={Globe} title="موقع المنارة" hint="كل الأقسام على الويب" onPress={() => openSitePage("/")} /> : null}
          <Row icon={Share2} title="شارك التطبيق" hint="الدال على الخير كفاعله" onPress={shareApp} />
          <Row
            icon={Mail}
            title="تواصل معنا"
            hint={CONTACT_EMAIL}
            onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("تطبيق المنارة")}`)}
            last
          />
        </View>

        <CrashReport />

        {version && <Text className="mt-2 text-center font-sans text-xs text-fg-muted">المنارة · الإصدار {toArabicDigits(version)}</Text>}
        <Text className="mt-1 text-center font-sans text-xs text-fg-muted">تطوير: محمد مبارك</Text>
      </Section>
    </Screen>
  );
}
