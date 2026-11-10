import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, ChevronLeft, Lightbulb } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { PageHeader, enterSoft } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { GuideBadges } from "@/features/guide/GuideBadges";
import { GUIDE } from "@/features/guide/catalog";
import { PhoneShot } from "@/features/guide/PhoneShot";
import type { GuideEntry, GuideStep } from "@/features/guide/types";
import { SECTION_ART } from "@/features/home/sectionArt";
import { useThemeColor } from "@/theme/useThemeColor";

function Heading({ children }: { children: string }) {
  return <Text className="px-1 font-sans-bold text-lg text-fg">{children}</Text>;
}

/** "الرئيسية ← المصحف ← …": the taps that lead to the feature. */
function WhereToFind({ path }: { path: readonly string[] }) {
  const muted = useThemeColor("fg-muted");
  return (
    <View className="gap-2.5 rounded-3xl border border-border bg-surface p-4 shadow-card">
      <Text className="font-sans-bold text-sm text-primary">هتلاقيه فين؟</Text>
      <View className="flex-row flex-wrap items-center gap-1.5">
        {path.map((hop, index) => (
          <View key={`${hop}-${index}`} className="flex-row items-center gap-1.5">
            <View className={`rounded-full px-3 py-1.5 ${index === path.length - 1 ? "bg-primary" : "bg-surface-alt"}`}>
              <Text className={`font-sans-bold text-xs ${index === path.length - 1 ? "text-on-primary" : "text-fg"}`}>{hop}</Text>
            </View>
            {index < path.length - 1 && <ChevronLeft size={14} color={muted} />}
          </View>
        ))}
      </View>
    </View>
  );
}

/** One numbered step on the timeline, with its screenshot under the text. */
function Step({ step, index, last }: { step: GuideStep; index: number; last: boolean }) {
  return (
    <Animated.View entering={enterSoft(5 + Math.min(index, 4))} className="flex-row gap-3">
      <View className="items-center">
        <View className="size-9 items-center justify-center rounded-full bg-primary">
          <Text className="font-sans-bold text-sm text-on-primary">{toArabicDigits(index + 1)}</Text>
        </View>
        {!last && <View className="w-0.5 flex-1 bg-border" />}
      </View>
      <View className={`flex-1 gap-3 ${last ? "" : "pb-7"}`}>
        <View className="gap-1 pt-1">
          <Text className="font-sans-bold text-base text-fg">{step.title}</Text>
          <Text className="font-sans text-[15px] leading-7 text-fg-muted">{step.body}</Text>
        </View>
        {step.shot && <PhoneShot shot={step.shot} label={step.title} />}
      </View>
    </Animated.View>
  );
}

function Features({ features }: { features: readonly string[] }) {
  const primary = useThemeColor("primary");
  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface p-4 shadow-card">
      {features.map((feature) => (
        <View key={feature} className="flex-row gap-2.5">
          <View className="mt-1 size-5 items-center justify-center rounded-full bg-primary-soft">
            <Check size={13} color={primary} strokeWidth={3} />
          </View>
          <Text className="flex-1 font-sans text-[15px] leading-7 text-fg">{feature}</Text>
        </View>
      ))}
    </View>
  );
}

function Tips({ tips }: { tips: readonly string[] }) {
  const accent = useThemeColor("accent-strong");
  return (
    <View className="gap-3 rounded-3xl border border-gold/40 bg-accent-soft p-4">
      <View className="flex-row items-center gap-2">
        <Lightbulb size={18} color={accent} />
        <Text className="font-sans-bold text-base text-fg">حاجات يمكن ماتكونش تعرفها</Text>
      </View>
      {tips.map((tip) => (
        <Text key={tip} className="font-sans text-[15px] leading-7 text-fg">
          • {tip}
        </Text>
      ))}
    </View>
  );
}

function GuidePage({ entry }: { entry: GuideEntry }) {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const next = GUIDE[GUIDE.indexOf(entry) + 1];

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <PageHeader back kicker={entry.group} art={SECTION_ART[entry.art]} title={entry.title} description={entry.summary} />

      <View className="gap-6 px-4">
        {entry.badges && entry.badges.length > 0 && (
          <Animated.View entering={enterSoft(3)}>
            <GuideBadges badges={entry.badges} />
          </Animated.View>
        )}

        <WhereToFind path={entry.path} />

        <View className="gap-4">
          <Heading>خطوة بخطوة</Heading>
          <View>
            {entry.steps.map((step, index) => (
              <Step key={step.title} step={step} index={index} last={index === entry.steps.length - 1} />
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Heading>هيفيدك في إيه؟</Heading>
          <Features features={entry.features} />
        </View>

        {entry.tips && entry.tips.length > 0 && <Tips tips={entry.tips} />}

        <View className="gap-3">
          {entry.href && (
            <Button size="lg" image={SECTION_ART[entry.art]} onPress={() => router.push(entry.href!)}>
              {`افتح ${entry.title}`}
            </Button>
          )}
          {next && (
            <Button variant="outline" icon={ArrowLeft} onPress={() => router.replace({ pathname: "/guide/[id]", params: { id: next.id } })}>
              {`الشرح اللي بعده: ${next.title}`}
            </Button>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

export default function GuideEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = GUIDE.find((candidate) => candidate.id === id);
  if (!entry) {
    return (
      <View className="flex-1 bg-bg">
        <PageHeader back kicker="دليل المنارة" title="الشرح ده مش موجود" />
        <StateMessage message="مالقيناش الشرح ده." actionLabel="كل الشروح" onAction={() => router.replace("/guide")} />
      </View>
    );
  }
  return <GuidePage entry={entry} />;
}
