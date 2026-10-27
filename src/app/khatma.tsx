import { router } from "expo-router";
import { BookOpen, Check, Flame, History, Trophy } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SECTION_ART } from "@/features/home/sectionArt";
import { toArabicDigits } from "@/core/text/arabic";
import { ConfirmSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { PageHeader, enterSoft } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { useAccount } from "@/features/account/accountStore";
import { KhatmDuas } from "@/features/khatmDua/KhatmDuas";
import { CreateKhatmaForm, formatDay } from "@/features/khatma/CreateKhatmaForm";
import { khatma, reloadKhatma, useKhatma } from "@/features/khatma/khatmaStore";
import { SyncBadge } from "@/features/khatma/SyncBadge";
import { buildKhatmaView } from "@/features/khatma/view";
import { getSurahs, mushafBoundaries } from "@/features/mushaf/mushaf";
import { useThemeColor } from "@/theme/useThemeColor";

const SURAH_NAMES = () => Object.fromEntries(getSurahs().map((surah) => [surah.number, surah.name]));

function Ring({ percent }: { percent: number }) {
  const primary = useThemeColor("primary");
  const track = useThemeColor("border");
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <View className="size-24">
      <Svg viewBox="0 0 100 100" width="100%" height="100%" style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth={8} />
        <Circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={primary}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="font-sans-bold text-xl text-fg">{toArabicDigits(percent)}٪</Text>
      </View>
    </View>
  );
}

export default function KhatmaScreen() {
  const insets = useSafeAreaInsets();
  const gold = useThemeColor("accent-strong");
  const primary = useThemeColor("primary");
  const account = useAccount();
  const state = useKhatma();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const view = state.status === "ready" && state.current ? buildKhatmaView(state.current, mushafBoundaries(), SURAH_NAMES()) : null;

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) setError(result.error ?? null);
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <PageHeader
        back
        kicker="الختمة"
        art={SECTION_ART.khatma}
        title={view ? (view.status === "completed" ? "ختمت القرآن" : "ختمتك الجارية") : "اختم القرآن"}
        description={view ? undefined : "بوِرد يومي تختاره، ونذكّرك بوردك كل يوم."}
      />

      {(view || account.status === "signed-in" || (account.status === "guest" && account.configured)) && (
        <Animated.View entering={enterSoft(3)} className="mx-4 rounded-3xl border border-border bg-surface p-5 shadow-card">
          {view && (
            <View className="flex-row items-center gap-4">
              <View className="flex-1">
                <Text className="font-sans-bold text-base text-fg">{view.amount}</Text>
                <Text className="mt-1 font-sans text-sm leading-6 text-fg-muted">{view.daysLabel}</Text>
              </View>
              <Ring percent={view.percent} />
            </View>
          )}
          {account.status === "signed-in" && <SyncBadge />}
          {account.status === "guest" && account.configured && (
            <Text className={`${view ? "mt-3" : ""} font-sans text-xs leading-5 text-fg-muted`}>
              ختمتك محفوظة على هذا الجهاز. سجّل الدخول لمزامنتها مع الموقع.
            </Text>
          )}
        </Animated.View>
      )}

      <View className="gap-4 px-4 pt-5">
        {state.status === "loading" ? (
          <StateMessage loading />
        ) : state.status === "unavailable" ? (
          <StateMessage message="تعذّر تحميل ختمتك الآن." onRetry={() => void reloadKhatma()} />
        ) : !view ? (
          <CreateKhatmaForm />
        ) : (
          <>
            {view.status === "completed" ? (
              <View className="items-center rounded-3xl border border-border bg-accent-soft p-6">
                <Trophy size={40} color={gold} />
                <Text className="mt-3 font-sans-bold text-2xl text-fg">تقبّل الله منك</Text>
                <Text className="mt-1 text-center font-sans text-sm text-fg-muted">
                  أتممت ختمتك. هذه ختمتك رقم {toArabicDigits(view.finished)}.
                </Text>
              </View>
            ) : view.portion ? (
              <View className="rounded-3xl border border-border bg-surface p-5 shadow-card">
                <Text className="font-sans-bold text-sm text-primary">
                  {view.portion.done ? "قرأت ورد اليوم" : view.readsToday ? "ورد اليوم" : `وردك القادم ${view.nextDay ?? ""}`}
                </Text>
                <Text className="mt-2 font-sans-bold text-xl leading-9 text-fg">
                  من {view.portion.from.surahName} {toArabicDigits(view.portion.from.ayah)}
                  {"\n"}إلى {view.portion.to.surahName} {toArabicDigits(view.portion.to.ayah)}
                </Text>
                <Text className="mt-1 font-sans text-sm text-fg-muted">
                  الصفحات {toArabicDigits(view.portion.startPage)} – {toArabicDigits(view.portion.endPage)}
                </Text>
                <View className="mt-4 flex-row flex-wrap gap-3">
                  <Button
                    icon={BookOpen}
                    variant="secondary"
                    // Only the portion's pages, so the reader sees where today's reading ends.
                    onPress={() =>
                      router.push({
                        pathname: "/mushaf",
                        params: { page: String(view.portion!.startPage), until: String(view.portion!.endPage), wird: "khatma" },
                      })
                    }
                  >
                    اقرأ الآن
                  </Button>
                  {!view.portion.done && (
                    <Button icon={Check} onPress={() => run(khatma.completeToday)} disabled={busy}>
                      قرأت وردي
                    </Button>
                  )}
                </View>
              </View>
            ) : null}

            {view.status === "active" && view.missed && (
              <View className="gap-3 rounded-3xl border border-accent/40 bg-accent-soft p-4">
                <View className="flex-row items-start gap-2">
                  <History size={16} color={gold} style={{ marginTop: 6 }} />
                  <Text className="flex-1 font-sans text-sm leading-7 text-fg">
                    نسيت تسجيل ورد {view.missed}؟ إن كنت قرأته فسجّله، ويُحسب لك الورد الذي يليه دون أن يأخذ مكان ورد اليوم.
                  </Text>
                </View>
                <Button variant="outline" size="sm" icon={Check} className="self-start" onPress={() => run(khatma.completeMissed)} disabled={busy}>
                  {`قرأت ورد ${view.missed}`}
                </Button>
              </View>
            )}

            <View className="flex-row gap-3">
              <View className="flex-1 items-center rounded-3xl border border-border bg-surface p-4">
                <Flame size={22} color={primary} />
                <Text className="mt-1 font-sans-bold text-xl text-fg">{toArabicDigits(view.streak)}</Text>
                <Text className="font-sans text-xs text-fg-muted">أيام متتالية</Text>
              </View>
              <View className="flex-1 items-center rounded-3xl border border-border bg-surface p-4">
                <BookOpen size={22} color={primary} />
                <Text className="mt-1 font-sans-bold text-xl text-fg">{toArabicDigits(view.pagesDone)}</Text>
                <Text className="font-sans text-xs text-fg-muted">صفحة من ٦٠٤</Text>
              </View>
            </View>
            {view.finishDay && view.status === "active" && (
              <Text className="text-center font-sans text-sm text-fg-muted">تختم بإذن الله يوم {formatDay(view.finishDay)}</Text>
            )}
            {error ? <Text className="text-center font-sans text-sm text-danger">{error}</Text> : null}
            {view.status === "completed" ? (
              <Button variant="ghost" size="sm" onPress={() => run(khatma.archive)} disabled={busy}>
                ابدأ ختمة جديدة
              </Button>
            ) : (
              // Ending a running khatma loses its place, so it asks first.
              <Button variant="ghost" size="sm" disabled={busy} onPress={() => setConfirmArchive(true)}>
                إنهاء هذه الختمة والبدء من جديد
              </Button>
            )}
            <ConfirmSheet
              visible={confirmArchive}
              title="إنهاء الختمة"
              message="ستُنهى ختمتك الجارية ويضيع موضعك فيها، ثم تبدأ ختمة جديدة."
              confirmLabel="أنهِ الختمة"
              destructive
              onConfirm={() => void run(khatma.archive)}
              onClose={() => setConfirmArchive(false)}
            />
            {/* Last, so the new-khatma button above stays in reach. */}
            {view.status === "completed" && view.fullMushaf && (
              <View className="mt-2 gap-4">
                <Text accessibilityRole="header" className="font-sans-bold text-xl text-fg">
                  دعاء ختم القرآن
                </Text>
                <KhatmDuas />
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
