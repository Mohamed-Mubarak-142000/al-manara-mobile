import Constants from "expo-constants";
import { router } from "expo-router";
import { ChevronLeft, HandHeart, Info, Settings2, Share2, type LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { PageHeader } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { AccountCard } from "@/features/account/AccountCard";
import { shareApp } from "@/features/legal/site";
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

/** Account, support, settings and About. The sections (and المحفوظات) have their own screen, /sections. */
export default function MoreScreen() {
  const version = Constants.expoConfig?.version;
  return (
    <Screen bleed>
      <PageHeader
        kicker="المزيد"
        icon={Settings2}
        title="حسابك والإعدادات"
        description="حسابك، وتفضيلات التطبيق، وعن المنارة."
      />
      <Section className="mt-5 gap-3">
        <AccountCard />
        <SupportLink />

        <GroupTitle>الإعدادات</GroupTitle>
        <Group>
          <LinkRow
            icon={Settings2}
            title="الإعدادات والإشعارات"
            hint="الأذان وصوته، والتذكيرات، والمواقيت، والخط في مكان واحد"
            onPress={() => router.push("/settings")}
            last
          />
        </Group>

        {/* Privacy, terms and the website are on the About screen, not repeated here. */}
        <GroupTitle>عن المنارة</GroupTitle>
        <Group>
          <LinkRow icon={Info} title="عن المنارة" hint="رسالتنا، والخصوصية، والشروط، والتواصل" onPress={() => router.push("/about")} />
          <LinkRow icon={Share2} title="شارك التطبيق" hint="الدال على الخير كفاعله" onPress={shareApp} last />
        </Group>
        {version && <Text className="mt-2 text-center font-sans text-xs text-fg-muted">المنارة · الإصدار {version}</Text>}
      </Section>
    </Screen>
  );
}
