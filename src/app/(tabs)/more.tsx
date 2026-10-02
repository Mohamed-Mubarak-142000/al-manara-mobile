import { router } from "expo-router";
import { ChevronLeft, Download, LayoutGrid } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { AccountCard } from "@/features/account/AccountCard";
import { useDownloads } from "@/features/downloads/downloadStore";
import { SectionGrid } from "@/features/home/SectionGrid";
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
      </Section>
      <Section className="mt-6">
        <SectionGrid />
      </Section>
    </Screen>
  );
}
