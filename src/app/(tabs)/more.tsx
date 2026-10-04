import { router } from "expo-router";
import { ALargeSmall, ChevronLeft, Download, HandHeart, LayoutGrid } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { AccountCard } from "@/features/account/AccountCard";
import { useDownloads } from "@/features/downloads/downloadStore";
import { SectionGrid } from "@/features/home/SectionGrid";
import { TEXT_SCALES, setTextScale, useTextScale } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

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

function TextSizeCard() {
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
          <Text className="font-sans text-xs text-fg-muted">لنصوص التطبيق كلها، وللمصحف حجم خاص من إعدادات القراءة.</Text>
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

export default function MoreScreen() {
  return (
    <Screen bleed>
      <PageHeader
        kicker="المزيد"
        icon={LayoutGrid}
        title="أقسام المنارة"
        description="الإذاعة والأحاديث والابتهالات والأذكار والأطفال، وكل ما في الموقع."
      />
      <Section className="mt-5 gap-3">
        <AccountCard />
        <DownloadsLink />
        <SupportLink />
        <TextSizeCard />
      </Section>
      <Section className="mt-6">
        <SectionGrid />
      </Section>
    </Screen>
  );
}
