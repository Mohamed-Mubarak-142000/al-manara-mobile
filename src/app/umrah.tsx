import {
  AArrowDown,
  AArrowUp,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Footprints,
  Landmark,
  Luggage,
  MapPin,
  Megaphone,
  Plane,
  RefreshCcw,
  RotateCcw,
  Route,
  Scissors,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { MEDINA_SECTIONS, TRAVEL_DUAS, UMRAH_STEPS, type StepIcon } from "@/core/umrah/umrahGuide";
import { DEFAULT_UMRAH, MAX_SCALE, MIN_SCALE, goToStep, stepScale } from "@/core/umrah/umrahState";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { SECTION_ART } from "@/features/home/sectionArt";
import { BlockView, useUmrahText } from "@/features/umrah/Blocks";
import { updateUmrah, useUmrah } from "@/features/umrah/umrahStore";
import { useThemeColor } from "@/theme/useThemeColor";

type Tab = "guide" | "travel" | "medina";
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "guide", label: "دليل العمرة", icon: Route },
  { id: "travel", label: "أدعية السفر", icon: Plane },
  { id: "medina", label: "زيارة المدينة", icon: Landmark },
];

const STEP_ICONS: Record<StepIcon, LucideIcon> = {
  luggage: Luggage,
  "map-pin": MapPin,
  megaphone: Megaphone,
  "door-open": DoorOpen,
  refresh: RefreshCcw,
  footprints: Footprints,
  route: Route,
  scissors: Scissors,
  "badge-check": BadgeCheck,
};

/** One station's width on the journey strip (w-24). */
const STATION = 96;

/** The journey as a strip of stations joined by the road; the current one stays in view. */
function JourneyPath({ current, done, onPick }: { current: string; done: string[]; onPick: (id: string) => void }) {
  const listRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const muted = useThemeColor("fg-muted");
  const onPrimary = useThemeColor("on-primary");
  const night = useThemeColor("emerald-night");
  const index = UMRAH_STEPS.findIndex((step) => step.id === current);

  useEffect(() => {
    if (!width) return;
    // RTL: the strip starts on the right, and x is measured from the content's left edge.
    const content = UMRAH_STEPS.length * STATION + 32;
    const fromRight = 16 + index * STATION + STATION / 2;
    listRef.current?.scrollTo({ x: Math.max(0, content - fromRight - width / 2), animated: true });
  }, [index, width]);

  return (
    <ScrollView
      ref={listRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      accessibilityLabel="مراحل العمرة"
    >
      {UMRAH_STEPS.map((step, position) => {
        const active = step.id === current;
        const finished = done.includes(step.id);
        const Icon = finished && !active ? Check : STEP_ICONS[step.icon];
        return (
          <View key={step.id} style={{ width: STATION }}>
            {/* The road to the next station. */}
            {position < UMRAH_STEPS.length - 1 && (
              <View className={`absolute top-7 h-0.5 w-full ${finished ? "bg-primary" : "bg-border"}`} style={{ start: STATION / 2 }} />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${step.title}${finished ? "، تمّت" : ""}`}
              onPress={() => onPick(step.id)}
              className="items-center gap-1.5 p-1"
            >
              <View
                className={`size-12 items-center justify-center rounded-full border-2 ${
                  active ? "border-gold bg-gold shadow-gold" : finished ? "border-primary bg-primary" : "border-border bg-surface"
                }`}
              >
                <Icon size={20} color={active ? night : finished ? onPrimary : muted} />
              </View>
              <Text
                numberOfLines={2}
                className={`text-center text-xs leading-5 ${active ? "font-sans-bold text-fg" : "font-sans text-fg-muted"}`}
              >
                {step.title}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Guide({ onStepChange }: { onStepChange: () => void }) {
  const state = useUmrah();
  const primary = useThemeColor("gold");
  const summary = useUmrahText(17, 34);
  const index = Math.max(
    0,
    UMRAH_STEPS.findIndex((step) => step.id === state.step),
  );
  const step = UMRAH_STEPS[index]!;
  const Icon = STEP_ICONS[step.icon];

  function go(id: string, markDone = false) {
    updateUmrah((current) => goToStep(current, id, markDone));
    onStepChange();
  }

  return (
    <View>
      <JourneyPath current={step.id} done={state.done} onPick={(id) => go(id)} />
      <View className="mt-1 flex-row items-center justify-between px-4">
        <Text className="font-sans text-xs text-fg-muted">
          أتممت {toArabicDigits(state.done.length)} من {toArabicDigits(UMRAH_STEPS.length)}
        </Text>
        {state.done.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              Alert.alert("من البداية", "البدء من أول الرحلة؟ يُصفَّر التقدّم وعدّادا الطواف والسعي.", [
                { text: "إلغاء", style: "cancel" },
                {
                  text: "ابدأ من جديد",
                  style: "destructive",
                  onPress: () => updateUmrah((current) => ({ ...current, step: DEFAULT_UMRAH.step, done: [], tawaf: 0, sai: 0 })),
                },
              ])
            }
            hitSlop={8}
            className="flex-row items-center gap-1"
          >
            <RotateCcw size={13} color={primary} />
            <Text className="font-sans text-xs text-fg-muted">من البداية</Text>
          </Pressable>
        )}
      </View>

      <Animated.View key={step.id} entering={FadeIn.duration(220)} className="mt-5 px-4">
        <View className="flex-row items-start gap-4">
          <View className="size-14 items-center justify-center rounded-2xl bg-hero">
            <Icon size={28} color={primary} />
          </View>
          <View className="flex-1">
            <Text className="font-sans-bold text-sm text-accent-strong">{step.place}</Text>
            <Text accessibilityRole="header" className="mt-0.5 font-sans-bold text-2xl leading-10 text-fg">
              {step.title}
            </Text>
          </View>
        </View>
        <Text className="mt-4 font-sans text-fg" style={summary}>
          {step.summary}
        </Text>
        <View className="mt-6 gap-5">
          {step.blocks.map((block, blockIndex) => (
            <BlockView key={blockIndex} block={block} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

/** Previous, text size and next (marks the step done), pinned above the bottom edge. */
function GuideBar({ bottom, onStepChange }: { bottom: number; onStepChange: () => void }) {
  const state = useUmrah();
  const fg = useThemeColor("fg");
  const index = Math.max(
    0,
    UMRAH_STEPS.findIndex((step) => step.id === state.step),
  );
  const previous = UMRAH_STEPS[index - 1];
  const next = UMRAH_STEPS[index + 1];
  const finished = state.done.includes(UMRAH_STEPS[index]!.id);

  function go(id: string, markDone = false) {
    updateUmrah((current) => goToStep(current, id, markDone));
    onStepChange();
  }

  return (
    <View
      className="absolute inset-x-3 flex-row items-center gap-1 rounded-full border border-border bg-surface p-1.5 shadow-lift"
      style={{ bottom }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={previous ? `الخطوة السابقة: ${previous.title}` : "لا خطوة قبلها"}
        disabled={!previous}
        onPress={() => previous && go(previous.id)}
        className="size-11 items-center justify-center rounded-full"
        style={{ opacity: previous ? 1 : 0.35 }}
      >
        <ChevronRight size={22} color={fg} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="تصغير الخط"
        disabled={state.scale <= MIN_SCALE}
        onPress={() => updateUmrah((current) => ({ ...current, scale: stepScale(current.scale, -1) }))}
        className="size-11 items-center justify-center rounded-full"
        style={{ opacity: state.scale <= MIN_SCALE ? 0.35 : 1 }}
      >
        <AArrowDown size={20} color={fg} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="تكبير الخط"
        disabled={state.scale >= MAX_SCALE}
        onPress={() => updateUmrah((current) => ({ ...current, scale: stepScale(current.scale, 1) }))}
        className="size-11 items-center justify-center rounded-full"
        style={{ opacity: state.scale >= MAX_SCALE ? 0.35 : 1 }}
      >
        <AArrowUp size={20} color={fg} />
      </Pressable>
      <View className="flex-1">
        {next ? (
          <Button icon={ChevronLeft} accessibilityLabel={`التالي: ${next.title}`} onPress={() => go(next.id, true)}>
            التالي
          </Button>
        ) : (
          <Button
            variant="gold"
            icon={Check}
            disabled={finished}
            onPress={() => updateUmrah((current) => ({ ...current, done: [...new Set([...current.done, current.step])] }))}
          >
            {finished ? "تمّت عمرتك" : "تمّت عمرتي"}
          </Button>
        )}
      </View>
    </View>
  );
}

function TravelDuas() {
  const intro = useUmrahText(17, 34);
  return (
    <View className="gap-4 px-4">
      <Text className="font-sans text-fg" style={intro}>
        أدعية الطريق بترتيب الرحلة، من وداع أهلك إلى رجوعك إليهم، كلها من حصن المسلم وبصوت قارئ.
      </Text>
      {TRAVEL_DUAS.map((dua) => (
        <BlockView key={dua.id} block={{ kind: "dua", id: dua.id, when: dua.when }} />
      ))}
    </View>
  );
}

function Medina() {
  const summary = useUmrahText(17, 34);
  return (
    <View className="gap-10 px-4">
      {MEDINA_SECTIONS.map((section) => (
        <View key={section.id}>
          <Text accessibilityRole="header" className="font-sans-bold text-2xl leading-10 text-fg">
            {section.title}
          </Text>
          <Text className="mt-2 font-sans text-fg" style={summary}>
            {section.summary}
          </Text>
          <View className="mt-4 gap-4">
            {section.blocks.map((block, index) => (
              <BlockView key={index} block={block} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** The umrah step by step (the website's features/umrah/UmrahView.tsx), the travel duas, and visiting Medina. */
export default function UmrahScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const onPrimary = useThemeColor("on-primary");
  const primary = useThemeColor("primary");
  const [tab, setTab] = useState<Tab>("guide");
  const scrollRef = useRef<ScrollView>(null);
  const tabsY = useRef(0);
  const barBottom = insets.bottom + miniPlayer + 10;

  // A new step starts at its top, under the tabs, like the website's scroll to the guide.
  function toStepTop() {
    scrollRef.current?.scrollTo({ y: tabsY.current, animated: true });
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: (tab === "guide" ? barBottom + 72 : insets.bottom + miniPlayer) + 32 }}
      >
        <PageHeader
          back
          art={SECTION_ART.umrah}
          kicker="العمرة والسفر"
          title="عمرتك خطوة بخطوة"
          description="من الميقات إلى التحلّل: ماذا تفعل في كل خطوة، وماذا تقول، مع عدّاد يحفظ لك أشواط الطواف والسعي."
        />
        <View onLayout={(event) => (tabsY.current = event.nativeEvent.layout.y)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="tablist"
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 20 }}
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = id === tab;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(id)}
                  className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2.5 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
                >
                  <Icon size={16} color={active ? onPrimary : primary} />
                  <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        {tab === "guide" ? <Guide onStepChange={toStepTop} /> : tab === "travel" ? <TravelDuas /> : <Medina />}
        <Text className="mx-6 mt-10 text-center font-sans text-xs leading-6 text-fg-muted">
          الأدعية من حصن المسلم بتسجيلاته، والأحاديث بدرجاتها من موسوعة الأحاديث النبوية. هذا دليل مختصر؛ وما أشكل عليك فاسأل عنه أهل العلم.
        </Text>
      </ScrollView>
      {tab === "guide" && <GuideBar bottom={barBottom} onStepChange={toStepTop} />}
    </View>
  );
}
