import { router } from "expo-router";
import { BookMarked, BookOpen, Check, ChevronRight, Flame, Trophy } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { useAccount } from "@/features/account/accountStore";
import { CreateKhatmaForm, formatDay } from "@/features/khatma/CreateKhatmaForm";
import { khatma, reloadKhatma, useKhatma } from "@/features/khatma/khatmaStore";
import { SyncBadge } from "@/features/khatma/SyncBadge";
import { buildKhatmaView } from "@/features/khatma/view";
import { getSurahs, mushafBoundaries } from "@/features/mushaf/mushaf";
import { useThemeColor } from "@/theme/useThemeColor";

const SURAH_NAMES = () => Object.fromEntries(getSurahs().map((surah) => [surah.number, surah.name]));

function Ring({ percent }: { percent: number }) {
  const gold = useThemeColor("gold");
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <View className="size-28">
      <Svg viewBox="0 0 100 100" width="100%" height="100%" style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={8} />
        <Circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={gold}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="font-display-bold text-2xl text-white">{toArabicDigits(percent)}٪</Text>
      </View>
    </View>
  );
}

export default function KhatmaScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
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
      <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => router.back()}
          hitSlop={12}
          className="mb-3 self-start p-1"
        >
          <ChevronRight size={26} color={heroFg} />
        </Pressable>
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <BookMarked size={16} color={gold} />
              <Text className="font-sans-bold text-sm text-gold-soft">الختمة</Text>
            </View>
            <Text className="mt-2 font-display-bold text-3xl text-hero-fg">
              {view ? (view.status === "completed" ? "ختمت القرآن" : "ختمتك الجارية") : "اختم القرآن"}
            </Text>
            <Text className="mt-1 font-sans text-sm leading-6 text-white/70">
              {view ? `${view.amount} · ${view.daysLabel}` : "بوِرد يومي تختاره، ونذكّرك بوردك كل يوم."}
            </Text>
          </View>
          {view && <Ring percent={view.percent} />}
        </View>
        {account.status === "signed-in" && <SyncBadge />}
        {account.status === "guest" && account.configured && (
          <Text className="mt-4 font-sans text-xs text-white/60">ختمتك محفوظة على هذا الجهاز. سجّل الدخول لمزامنتها مع الموقع.</Text>
        )}
      </View>

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
              <View className="items-center rounded-3xl border border-gold/40 bg-accent-soft p-6">
                <Trophy size={40} color={gold} />
                <Text className="mt-3 font-display-bold text-2xl text-fg">تقبّل الله منك</Text>
                <Text className="mt-1 text-center font-sans text-sm text-fg-muted">
                  أتممت ختمتك. هذه ختمتك رقم {toArabicDigits(view.finished)}.
                </Text>
              </View>
            ) : view.portion ? (
              <View className="rounded-3xl border border-border bg-surface p-5 shadow-soft">
                <Text className="font-sans-bold text-sm text-accent-strong">
                  {view.portion.done ? "قرأت ورد اليوم" : view.readsToday ? "ورد اليوم" : `وردك القادم ${view.nextDay ?? ""}`}
                </Text>
                <Text className="mt-2 font-display-bold text-xl leading-9 text-fg">
                  من {view.portion.from.surahName} {toArabicDigits(view.portion.from.ayah)}
                  {"\n"}إلى {view.portion.to.surahName} {toArabicDigits(view.portion.to.ayah)}
                </Text>
                <Text className="mt-1 font-sans text-sm text-fg-muted">
                  الصفحات {toArabicDigits(view.portion.startPage)} – {toArabicDigits(view.portion.endPage)}
                </Text>
                <View className="mt-4 flex-row flex-wrap gap-3">
                  <Button
                    icon={BookOpen}
                    variant="outline"
                    onPress={() => router.push({ pathname: "/mushaf", params: { page: String(view.portion!.startPage) } })}
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

            <View className="flex-row gap-3">
              <View className="flex-1 items-center rounded-3xl border border-border bg-surface p-4">
                <Flame size={22} color={primary} />
                <Text className="mt-1 font-display-bold text-xl text-fg">{toArabicDigits(view.streak)}</Text>
                <Text className="font-sans text-xs text-fg-muted">أيام متتالية</Text>
              </View>
              <View className="flex-1 items-center rounded-3xl border border-border bg-surface p-4">
                <BookOpen size={22} color={primary} />
                <Text className="mt-1 font-display-bold text-xl text-fg">{toArabicDigits(view.pagesDone)}</Text>
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
              // Ending a running khatma loses its place, so it takes a second, explicit tap.
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onPress={() => (confirmArchive ? run(khatma.archive).then(() => setConfirmArchive(false)) : setConfirmArchive(true))}
              >
                {confirmArchive ? "اضغط مرة أخرى لتأكيد إنهاء الختمة" : "إنهاء هذه الختمة والبدء من جديد"}
              </Button>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
