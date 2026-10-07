import Constants from "expo-constants";
import { router } from "expo-router";
import {
  ChevronLeft,
  Download,
  FileText,
  Globe,
  HandHeart,
  Info,
  Landmark,
  Settings2,
  Share2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { AccountCard } from "@/features/account/AccountCard";
import { useDownloads } from "@/features/downloads/downloadStore";
import { SectionGrid } from "@/features/home/SectionGrid";
import { openSitePage, shareApp } from "@/features/legal/site";
import { StreakCard } from "@/features/streak/StreakCard";
import { useThemeColor } from "@/theme/useThemeColor";

function GroupTitle({ children }: { children: string }) {
  return <Text className="mb-1 mt-4 px-1 font-sans-bold text-sm text-accent-strong">{children}</Text>;
}

/** One row of a grouped list: icon, title, optional hint, and a chevron. */
function LinkRow({
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
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View className={`flex-row items-center gap-3 px-4 py-3.5 ${last ? "" : "border-b border-border"}`}>
        <View className="size-9 items-center justify-center rounded-xl bg-primary-soft">
          <Icon size={18} color={primary} />
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-[15px] text-fg">{title}</Text>
          {hint && <Text className="font-sans text-xs text-fg-muted">{hint}</Text>}
        </View>
        <ChevronLeft size={18} color={muted} />
      </View>
    </Pressable>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <View className="overflow-hidden rounded-3xl border border-border bg-surface">{children}</View>;
}

function DownloadsLink() {
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
  const count = Object.values(useDownloads()).filter((entry) => entry.status === "done").length;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push("/downloads")}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-soft">
        <View className="size-11 items-center justify-center rounded-2xl bg-primary-soft">
          <Download size={22} color={primary} />
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-fg">المحفوظات</Text>
          <Text className="font-sans text-xs text-fg-muted">
            {count ? `${toArabicDigits(count)} تلاوة محفوظة للاستماع دون إنترنت` : "التلاوات المنزّلة على جهازك"}
          </Text>
        </View>
        <ChevronLeft size={18} color={muted} />
      </View>
    </Pressable>
  );
}

function SupportLink() {
  const gold = useThemeColor("gold-soft");
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push("/support")} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <View className="flex-row items-center gap-3 rounded-3xl bg-hero p-4 shadow-lift">
        <View className="size-11 items-center justify-center rounded-2xl bg-white/10">
          <HandHeart size={22} color={gold} />
        </View>
        <View className="flex-1">
          <Text className="font-display-bold text-base text-hero-fg">ادعم المنارة</Text>
          <Text className="font-sans text-xs text-white/70">صدقة جارية تبقي التطبيق مجانيًا بلا إعلانات</Text>
        </View>
        <ChevronLeft size={18} color={gold} />
      </View>
    </Pressable>
  );
}

/** Account, every section of the app (Home shows only the main ones), settings and the website's fixed pages. */
export default function MoreScreen() {
  const version = Constants.expoConfig?.version;
  return (
    <Screen bleed>
      <PageHeader
        kicker="المزيد"
        icon={Settings2}
        title="حسابك وكل الأقسام"
        description="حسابك، وكل أقسام المنارة، وتفضيلات التطبيق."
      />
      <Section className="mt-5 gap-3">
        <AccountCard />
        <StreakCard />
        <SupportLink />

        <GroupTitle>كل الأقسام</GroupTitle>
        <SectionGrid />
        <DownloadsLink />

        <GroupTitle>الإعدادات</GroupTitle>
        <Group>
          <LinkRow
            icon={Settings2}
            title="الإعدادات والإشعارات"
            hint="الأذان، والتذكيرات، والمواقيت، والخط في مكان واحد"
            onPress={() => router.push("/settings")}
          />
          <LinkRow icon={Landmark} title="صوت الأذان" hint="اختر المؤذن لتنبيهات الصلاة" onPress={() => router.push("/adhan-voice")} last />
        </Group>

        <GroupTitle>عن المنارة</GroupTitle>
        <Group>
          <LinkRow icon={Info} title="عن المنارة" hint="رسالتنا، والإصدار، والتواصل" onPress={() => router.push("/about")} />
          <LinkRow icon={ShieldCheck} title="سياسة الخصوصية" onPress={() => router.push("/privacy")} />
          <LinkRow icon={FileText} title="الشروط والأحكام" onPress={() => router.push("/terms")} />
          <LinkRow icon={Globe} title="موقع المنارة" hint="كل الأقسام على الويب" onPress={() => openSitePage("/")} />
          <LinkRow icon={Share2} title="شارك التطبيق" hint="الدال على الخير كفاعله" onPress={shareApp} last />
        </Group>
        {version && <Text className="mt-2 text-center font-sans text-xs text-fg-muted">المنارة · الإصدار {version}</Text>}
      </Section>
    </Screen>
  );
}
