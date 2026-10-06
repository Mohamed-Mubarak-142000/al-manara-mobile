import { router } from "expo-router";
import { Award, ChevronRight, Clock, GraduationCap, Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { getExamOverview, getExamSettings, type JuzExamStatus } from "@/features/exams/examData";
import { juzOrdinal } from "@/features/exams/juzNames";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

const JUZ = Array.from({ length: 30 }, (_, index) => index + 1);

function statusLine(status: JuzExamStatus | undefined): { text: string; tone: "done" | "live" | "wait" | "idle" } {
  if (!status) return { text: "", tone: "idle" };
  if (status.kind === "certified")
    return { text: `شهادة · ${toArabicDigits(status.certificate.score)}/${toArabicDigits(status.certificate.total)}`, tone: "done" };
  if (status.kind === "in-progress") return { text: "اختبار جارٍ", tone: "live" };
  if (status.kind === "cooldown") return { text: "إعادة بعد قليل", tone: "wait" };
  return {
    text: status.lastScore !== null ? `آخر درجة ${toArabicDigits(status.lastScore)}/${toArabicDigits(status.total ?? 0)}` : "متاح",
    tone: "idle",
  };
}

export default function ExamsScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
  const primary = useThemeColor("primary");
  const account = useAccount();
  const learnerId = activeLearnerId(account);
  const [overview, setOverview] = useState<{ learnerId: string; data: Record<number, JuzExamStatus> } | null>(null);

  useEffect(() => {
    if (!learnerId) return;
    let cancelled = false;
    getExamSettings()
      .then((settings) => getExamOverview(learnerId, settings.retry_cooldown_hours))
      .then((data) => !cancelled && setOverview({ learnerId, data }));
    return () => {
      cancelled = true;
    };
  }, [learnerId]);

  const data = overview?.learnerId === learnerId ? overview.data : null;
  const certified = data ? Object.values(data).filter((status) => status.kind === "certified").length : 0;

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={learnerId ? JUZ : []}
      keyExtractor={(juz) => String(juz)}
      numColumns={2}
      columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
      contentContainerStyle={{ gap: 10, paddingBottom: insets.bottom + miniPlayer + 32 }}
      ListHeaderComponent={
        <View className="mb-3 rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => router.back()}
            hitSlop={12}
            className="mb-3 self-start p-1"
          >
            <ChevronRight size={26} color={heroFg} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <GraduationCap size={16} color={gold} />
            <Text className="font-sans-bold text-sm text-gold-soft">اختبارات الأجزاء</Text>
          </View>
          <Text className="mt-2 font-display-bold text-3xl text-hero-fg">اختبر حفظك</Text>
          <Text className="mt-1 font-sans text-sm leading-6 text-white/70">
            {learnerId ? `حصلت على ${toArabicDigits(certified)} من ٣٠ شهادة.` : "اختبار لكل جزء، وشهادة موثّقة عند النجاح."}
          </Text>
          {learnerId && (
            <Button className="mt-4 self-start" variant="light" size="sm" icon={Award} onPress={() => router.push("/certificates")}>
              شهاداتي
            </Button>
          )}
        </View>
      }
      ListEmptyComponent={
        !learnerId ? (
          <View className="mx-4 items-center rounded-3xl border border-border bg-surface p-6">
            <Lock size={28} color={primary} />
            <Text className="mt-3 text-center font-sans text-base leading-7 text-fg">
              الاختبارات والشهادات مرتبطة بحسابك، لتظهر لك على الموقع والتطبيق.
            </Text>
            <Button className="mt-4" onPress={() => router.push("/login")}>
              تسجيل الدخول
            </Button>
          </View>
        ) : (
          <StateMessage loading />
        )
      }
      renderItem={({ item: juz }) => {
        const line = statusLine(data?.[juz]);
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/exams/[juz]", params: { juz: String(juz) } })}
            className="flex-1"
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <View
              className={`rounded-3xl border p-4 ${line.tone === "done" ? "border-gold/50 bg-accent-soft" : "border-border bg-surface"}`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-display-bold text-2xl text-fg">{toArabicDigits(juz)}</Text>
                {line.tone === "done" ? (
                  <Award size={20} color={gold} />
                ) : line.tone === "live" || line.tone === "wait" ? (
                  <Clock size={18} color={primary} />
                ) : null}
              </View>
              <Text className="mt-1 font-sans-bold text-sm text-fg">الجزء {juzOrdinal(juz)}</Text>
              <Text className="mt-0.5 font-sans text-xs text-fg-muted">{data ? line.text : "…"}</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
