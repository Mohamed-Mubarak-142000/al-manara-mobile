import { router, useFocusEffect } from "expo-router";
import { Award, CheckCircle2, GraduationCap, Lock, NotebookText, PlayCircle } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FINAL_PART, NAWAWI, NAWAWI_PARTS, partSlug, partTitle, type NawawiHadith } from "@/core/nawawi/nawawiData";
import { partsPassed } from "@/core/nawawi/overview";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { PageHeader, enterSoft } from "@/components/ui/PageHeader";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { getNawawiOverview, type NawawiOverview } from "@/features/nawawi/nawawiExam";
import { useThemeColor } from "@/theme/useThemeColor";

function openExam(part: number) {
  router.push({ pathname: "/nawawi/exam/[part]", params: { part: partSlug(part) } });
}

/** A stage's exam: sign in, its result once passed, or start/continue (the website's PartExam). */
function PartExam({ part, overview, signedIn }: { part: number; overview: NawawiOverview | null | undefined; signedIn: boolean }) {
  const primary = useThemeColor("primary");
  if (!signedIn) {
    return (
      <Button variant="outline" size="sm" icon={GraduationCap} onPress={() => router.push("/login")}>
        سجّل الدخول لتختبر
      </Button>
    );
  }
  const status = overview?.parts[part];
  if (status?.kind === "passed") {
    return (
      <View className="flex-row items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5">
        <CheckCircle2 size={16} color={primary} />
        <Text className="font-sans-bold text-sm text-primary">
          اجتزتها ({toArabicDigits(status.score)}/{toArabicDigits(status.total)})
        </Text>
      </View>
    );
  }
  return (
    <Button size="sm" icon={PlayCircle} onPress={() => openExam(part)}>
      {status?.kind === "in-progress" ? "تابع الاختبار" : "اختبر هذه المرحلة"}
    </Button>
  );
}

function HadithRow({ hadith }: { hadith: NawawiHadith }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`الحديث ${hadith.number}: ${hadith.title}`}
      onPress={() => router.push({ pathname: "/nawawi/[number]", params: { number: String(hadith.number) } })}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View className="flex-row items-start gap-3 rounded-3xl border border-border bg-surface p-4 shadow-card">
        <View className="size-10 items-center justify-center rounded-xl bg-accent-soft">
          <Text className="font-sans-bold text-base text-accent-strong">{toArabicDigits(hadith.number)}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-base leading-7 text-fg">{hadith.title}</Text>
          <Text className="font-sans text-xs text-fg-muted">عن {hadith.narrator}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** The Forty Nawawi course: four stages of hadiths, each with its exam, then the final and the certificate. */
export default function NawawiScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const accent = useThemeColor("accent-strong");
  const muted = useThemeColor("fg-muted");
  const learnerId = activeLearnerId(useAccount());
  const [loaded, setLoaded] = useState<{ learnerId: string; overview: NawawiOverview | null } | null>(null);

  // Read again on every return, so a stage just passed shows at once.
  useFocusEffect(
    useCallback(() => {
      if (!learnerId) return;
      let cancelled = false;
      getNawawiOverview(learnerId).then((overview) => !cancelled && setLoaded({ learnerId, overview }));
      return () => {
        cancelled = true;
      };
    }, [learnerId]),
  );

  /** undefined: loading; null: failed to load. */
  const overview = learnerId && loaded?.learnerId === learnerId ? loaded.overview : undefined;
  const passed = overview ? partsPassed(overview.parts) : 0;
  const finalOpen = passed === NAWAWI_PARTS.length;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <PageHeader
        back
        icon={NotebookText}
        kicker="الأربعون النووية"
        title="جوامع الكلم في اثنين وأربعين حديثًا"
        description="الأحاديث التي جمعها الإمام النووي رحمه الله، كل حديث بشرحه وفوائده. اقرأ مرحلة ثم اختبر نفسك فيها، وأتمّ المراحل الأربع لتدخل الاختبار النهائي وتنال الشهادة."
      />

      <View className="gap-8 px-4">
        <Animated.View entering={enterSoft(3)} className="gap-3 rounded-3xl border border-accent/40 bg-accent-soft p-5">
          <View className="flex-row items-center gap-3">
            <View className="size-10 items-center justify-center rounded-xl bg-surface">
              <Award size={22} color={accent} />
            </View>
            <Text className="flex-1 font-sans-bold text-base text-fg">{partTitle(FINAL_PART)} والشهادة</Text>
          </View>
          <Text className="font-sans text-sm leading-6 text-fg-muted">
            {!learnerId
              ? "سجّل الدخول ليُحفظ تقدّمك وتنال شهادتك."
              : overview?.certificate
                ? "أتممت الأربعين النووية، بارك الله فيك."
                : overview === null
                  ? "تعذّر تحميل تقدّمك الآن، حاول بعد قليل."
                  : `اجتزت ${toArabicDigits(passed)} من ${toArabicDigits(NAWAWI_PARTS.length)} مراحل؛ يُفتح الاختبار النهائي بعد اجتيازها كلها.`}
          </Text>
          {overview?.certificate ? (
            <Button
              variant="gold"
              icon={Award}
              className="self-start"
              onPress={() => router.push({ pathname: "/certificate/[code]", params: { code: overview.certificate!.verification_code } })}
            >
              عرض الشهادة
            </Button>
          ) : finalOpen ? (
            <Button variant="gold" icon={GraduationCap} className="self-start" onPress={() => openExam(FINAL_PART)}>
              ادخل الاختبار النهائي
            </Button>
          ) : learnerId ? (
            <View className="flex-row items-center gap-2 self-start rounded-full border border-border bg-surface px-4 py-2">
              <Lock size={16} color={muted} />
              <Text className="font-sans-bold text-sm text-fg-muted">مغلق حتى تُتمّ المراحل</Text>
            </View>
          ) : (
            <Button variant="gold" className="self-start" onPress={() => router.push("/login")}>
              تسجيل الدخول
            </Button>
          )}
        </Animated.View>

        {NAWAWI_PARTS.map((part) => (
          <View key={part.id} className="gap-3">
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <View>
                <Text accessibilityRole="header" className="font-sans-bold text-base text-fg">
                  {part.title}
                </Text>
                <Text className="font-sans text-xs text-fg-muted">
                  الأحاديث {toArabicDigits(part.from)}–{toArabicDigits(part.to)}
                </Text>
              </View>
              <PartExam part={part.id} overview={overview} signedIn={Boolean(learnerId)} />
            </View>
            {NAWAWI.filter((hadith) => hadith.number >= part.from && hadith.number <= part.to).map((hadith) => (
              <HadithRow key={hadith.number} hadith={hadith} />
            ))}
          </View>
        ))}

        <Text className="text-center font-sans text-xs leading-6 text-fg-muted">
          نصوص الأحاديث وشرحها وفوائدها من{" "}
          <Text className="underline" onPress={() => Linking.openURL("https://hadeethenc.com/ar/home").catch(() => {})}>
            موسوعة الأحاديث النبوية
          </Text>
          .
        </Text>
      </View>
    </ScrollView>
  );
}
