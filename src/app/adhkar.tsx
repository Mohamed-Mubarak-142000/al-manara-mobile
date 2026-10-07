import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Bell, BellRing, Check, ChevronRight, ExternalLink, RotateCcw, Share2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DUAS, DUA_CATEGORY_LABELS, DUA_CHAPTERS, type Dua, type DuaCategory } from "@/core/adhkar/duasData";
import { toArabicDigits } from "@/core/text/arabic";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { countDhikr, resetDhikr, useAdhkarCounts } from "@/features/adhkar/adhkarProgress";
import { ChapterPicker } from "@/features/adhkar/ChapterPicker";
import { setAdhkarReminder, useAdhkarReminders, type ReminderKind } from "@/features/adhkar/adhkarReminders";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";
import { OutsideReminderCard } from "@/features/adhkar/OutsideReminderCard";
import { TOAST_ADHKAR } from "@/core/adhkar/toastAdhkar";
import { reportReminderError } from "@/features/notifications/backgroundReminderStatus";

/** The website's tab order (features/adhkar/AdhkarView.tsx). */
const CATEGORIES: DuaCategory[] = ["morning", "evening", "after-prayer", "sleep", "waking", "general"];

/** Same as the website: morning from 04:00 until 15:00, evening otherwise. */
function defaultCategory(): DuaCategory {
  const hour = new Date().getHours();
  return hour >= 4 && hour < 15 ? "morning" : "evening";
}

function DhikrCard({ dua, count }: { dua: Dua; count: number }) {
  const primary = useThemeColor("primary");
  const onPrimary = useThemeColor("on-primary");
  const muted = useThemeColor("fg-muted");
  const dhikrText = useScaledText(22, 44);
  const target = dua.repeat ?? 1;
  const done = count >= target;
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  function tap() {
    if (done) return;
    // .set() rather than assigning .value, which the React Compiler treats as mutating a hook value.
    scale.set(withSequence(withTiming(0.97, { duration: 70 }), withTiming(1, { duration: 140 })));
    countDhikr(dua.id);
    // A firmer tap on the last count, so the thumb knows it is finished without looking.
    if (count + 1 >= target) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${dua.title}، ${done ? "تم" : `باقي ${target - count}`}`} onPress={tap}>
      <Animated.View
        style={animated}
        className={`mx-4 mb-3 rounded-3xl border p-5 ${done ? "border-primary/30 bg-primary-soft" : "border-border bg-surface shadow-soft"}`}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-bold text-sm text-accent-strong">{dua.title}</Text>
          {done ? (
            <View className="flex-row items-center gap-1 rounded-full bg-primary px-2.5 py-1">
              <Check size={13} color={onPrimary} />
              <Text className="font-sans-bold text-xs text-on-primary">تم</Text>
            </View>
          ) : (
            <View className="min-w-12 items-center rounded-full bg-accent-soft px-3 py-1">
              <Text className="font-display-bold text-sm text-accent-strong">
                {toArabicDigits(target - count)}
                {target > 1 ? ` / ${toArabicDigits(target)}` : ""}
              </Text>
            </View>
          )}
        </View>
        <Text className={`mt-3 font-quran-fallback ${done ? "text-fg-muted" : "text-fg"}`} style={dhikrText}>
          {dua.text}
        </Text>
        <View className="mt-2 flex-row items-center justify-between gap-2">
          <Pressable
            accessibilityRole="link"
            accessibilityHint="يفتح المصدر على موقع سنة"
            onPress={() => Linking.openURL(dua.sourceUrl).catch(() => {})}
            hitSlop={6}
            className="flex-1 flex-row items-center gap-1"
          >
            <Text className="shrink font-sans text-xs text-fg-muted underline">{dua.source}</Text>
            <ExternalLink size={12} color={muted} />
          </Pressable>
          {count > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`إعادة عدّ ${dua.title}`}
              onPress={() => resetDhikr([dua.id])}
              hitSlop={10}
              className="p-1.5"
            >
              <RotateCcw size={16} color={muted} />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`مشاركة ${dua.title} كصورة`}
            onPress={() => router.push({ pathname: "/share-card", params: { kind: "dhikr", id: dua.id } })}
            hitSlop={10}
            className="p-1.5"
          >
            <Share2 size={16} color={muted} />
          </Pressable>
        </View>
        {!done && (
          <Text className="mt-3 text-center font-sans text-xs" style={{ color: primary }}>
            {target > 1 ? `اضغط على البطاقة مع كل مرة (${toArabicDigits(target - count)} متبقية)` : "اضغط على البطاقة للعدّ"}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

function ReminderChip({ kind, label }: { kind: ReminderKind; label: string }) {
  const reminders = useAdhkarReminders();
  const on = reminders[kind].enabled;
  const gold = useThemeColor("gold-soft");
  const [denied, setDenied] = useState(false);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={async () => {
        try {
          setDenied(!(await setAdhkarReminder(kind, !on)));
        } catch (error) {
          reportReminderError(error);
        }
      }}
      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${on ? "border-gold bg-gold/20" : "border-white/20 bg-white/5"}`}
    >
      {on ? <BellRing size={14} color={gold} /> : <Bell size={14} color="rgba(255,255,255,0.8)" />}
      <Text className={`font-sans-bold text-xs ${on ? "text-gold-soft" : "text-white/80"}`}>{denied ? "الإشعارات مرفوضة" : label}</Text>
    </Pressable>
  );
}

export default function AdhkarScreen() {
  const params = useLocalSearchParams<{ toast?: string }>();
  const selectedToast = TOAST_ADHKAR.find((entry) => entry.id === params.toast);
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const heroFg = useThemeColor("hero-fg");
  const [category, setCategory] = useState<DuaCategory>(defaultCategory);
  const [chapter, setChapter] = useState(DUA_CHAPTERS[0]?.id ?? 0);
  const counts = useAdhkarCounts();
  // "باقي الأذكار والأدعية" is 128 chapters: one chapter at a time, like the website's select.
  const list = useMemo(
    () => DUAS.filter((dua) => dua.category === category && (category !== "general" || dua.chapter === chapter)),
    [category, chapter],
  );
  const finished = list.filter((dua) => (counts[dua.id] ?? 0) >= (dua.repeat ?? 1)).length;

  return (
    <View className="flex-1 bg-bg">
      <FlashList
        data={list}
        extraData={counts}
        keyExtractor={(dua) => dua.id}
        renderItem={({ item }) => <DhikrCard dua={item} count={counts[item.id] ?? 0} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}
        ListHeaderComponent={
          <View className="mb-4">
            <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
              <View className="flex-row items-center justify-between">
                <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12} className="p-1">
                  <ChevronRight size={26} color={heroFg} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="إعادة العدّ"
                  onPress={() => resetDhikr(list.map((dua) => dua.id))}
                  hitSlop={12}
                  className="p-1"
                >
                  <RotateCcw size={20} color={heroFg} />
                </Pressable>
              </View>
              <Text className="mt-2 font-display-bold text-3xl text-hero-fg">{DUA_CATEGORY_LABELS[category]}</Text>
              <Text className="mt-1 font-sans text-xs text-gold-soft">من حصن المسلم</Text>
              <Text className="mt-1 font-sans text-sm text-white/70">
                أتممت {toArabicDigits(finished)} من {toArabicDigits(list.length)}
              </Text>
              <View className="mt-3">
                <ProgressBar tone="light" value={list.length ? finished / list.length : 0} />
              </View>
              <View className="mt-4 flex-row flex-wrap gap-2">
                <ReminderChip kind="morning" label="تذكير الصباح ٧:٠٠" />
                <ReminderChip kind="evening" label="تذكير المساء ٥:٠٠" />
                <ReminderChip kind="friday" label="تذكير الجمعة والكهف" />
              </View>
            </View>
            <OutsideReminderCard />
            {selectedToast && (
              <View className="mx-4 mt-3 rounded-3xl border border-primary bg-surface p-4">
                <Text className="font-quran-fallback text-xl leading-9 text-fg">{selectedToast.text}</Text>
                <Text className="mt-2 font-sans text-xs text-fg-muted">{selectedToast.source}</Text>
              </View>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 16 }}
            >
              {CATEGORIES.map((key) => {
                const active = key === category;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => setCategory(key)}
                    className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
                  >
                    <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{DUA_CATEGORY_LABELS[key]}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {category === "general" && <ChapterPicker value={chapter} onChange={setChapter} />}
          </View>
        }
      />
    </View>
  );
}
