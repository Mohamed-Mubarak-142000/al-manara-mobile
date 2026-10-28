import { router } from "expo-router";
import { Award, BookOpen, Check, ChevronLeft, Clock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ERAS, SEERAH_EVENTS, eventById, type SeerahEvent } from "@/core/seerah/seerahContent";
import { toArabicDigits } from "@/core/text/arabic";
import { PageHeader } from "@/components/ui/PageHeader";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { SECTION_ART } from "@/features/home/sectionArt";
import { useSeerah } from "@/features/seerah/seerahStore";
import { useThemeColor } from "@/theme/useThemeColor";

function openChapter(event: SeerahEvent) {
  router.push({ pathname: "/seerah/[event]", params: { event: event.id } });
}

function EventCard({ event, done, badge, order }: { event: SeerahEvent; done: boolean; badge: boolean; order: number }) {
  const ready = event.beats.length > 0;
  const muted = useThemeColor("fg-muted");
  const night = useThemeColor("emerald-night");
  const onPrimary = useThemeColor("on-primary");
  const accent = useThemeColor("accent-strong");
  const card = (
    <View className={`rounded-3xl border p-4 ${ready ? "border-accent/40 bg-surface shadow-card" : "border-border bg-surface-alt"}`}>
      <View className="flex-row flex-wrap gap-x-3">
        <Text className="font-sans-bold text-xs text-accent-strong">{event.date}</Text>
        {event.age !== undefined && (
          <Text className="font-sans text-xs text-fg-muted">
            {event.age ? `${event.exactAge ? "" : "نحو "}${toArabicDigits(event.age)} سنة من عمره ﷺ` : "مولده ﷺ"}
          </Text>
        )}
      </View>
      <View className="mt-1 flex-row items-center gap-2">
        <Text className="flex-1 font-sans-bold text-lg text-fg">{event.title}</Text>
        {badge && <Award size={18} color={accent} accessibilityLabel="نلت شارة الفصل" />}
      </View>
      <Text className="mt-1.5 font-sans text-sm leading-7 text-fg-muted">{event.summary}</Text>
      {ready ? (
        <View className="mt-3 flex-row items-center gap-1.5 self-start rounded-xl bg-gold px-3.5 py-2">
          <Text className="font-sans-bold text-sm text-emerald-night">{done ? "اقرأ الفصل مرة أخرى" : "ابدأ الفصل"}</Text>
          <ChevronLeft size={16} color={night} />
        </View>
      ) : (
        <View className="mt-3 flex-row items-center gap-1.5">
          <Clock size={14} color={muted} />
          <Text className="font-sans text-xs text-fg-muted">الفصل التفاعلي قريبًا</Text>
        </View>
      )}
    </View>
  );

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(Math.min(order, 6) * 70)} className="flex-row gap-3">
      {/* The station on the line. */}
      <View className="items-center pt-5" style={{ width: 20 }}>
        <View
          className={`size-5 items-center justify-center rounded-full border-2 ${
            done ? "border-primary bg-primary" : ready ? "border-gold bg-gold" : "border-border bg-surface"
          }`}
        >
          {done && <Check size={12} color={onPrimary} />}
        </View>
      </View>
      <View className="flex-1">
        {ready ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="يفتح الفصل التفاعلي"
            onPress={() => openChapter(event)}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            {card}
          </Pressable>
        ) : (
          card
        )}
      </View>
    </Animated.View>
  );
}

/** The website's /seerah: the life of the Prophet ﷺ down a line, era by era, with the written chapters to open. */
export default function SeerahScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const gold = useThemeColor("gold");
  const onHero = useThemeColor("hero-fg");
  const { last, read, badges } = useSeerah();
  const resume = last ? eventById(last.event) : undefined;

  // A thin bar along the top fills as the reader goes down the years.
  const progress = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    const room = event.contentSize.height - event.layoutMeasurement.height;
    progress.set(room > 0 ? Math.min(1, Math.max(0, event.contentOffset.y / room)) : 0);
  });
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));

  let order = 0;
  return (
    <View className="flex-1 bg-bg">
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}
      >
        <PageHeader
          back
          art={SECTION_ART.seerah}
          kicker="السيرة النبوية"
          title="سيرة النبي ﷺ"
          description="من المولد إلى الرفيق الأعلى: اختر حدثًا لتعيشه فصلًا على الخريطة، بأدلته من القرآن والسنة."
        />

        {resume && (
          <Pressable
            accessibilityRole="button"
            onPress={() => openChapter(resume)}
            className="mx-4 mt-2 flex-row items-center gap-4 rounded-3xl bg-hero p-5"
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <BookOpen size={28} color={gold} />
            <View className="flex-1">
              <Text className="font-sans text-sm text-hero-fg/70">تابع من حيث وقفت</Text>
              <Text className="font-sans-bold text-base text-hero-fg">{resume.title}</Text>
            </View>
            <ChevronLeft size={20} color={onHero} />
          </Pressable>
        )}

        {ERAS.map((era) => (
          <View key={era.id} className="mt-8 px-4">
            <View className="mb-4 flex-row items-baseline gap-3">
              <Text className="font-display-bold text-2xl text-fg">{era.title}</Text>
              <Text className="font-sans text-sm text-fg-muted">{era.span}</Text>
            </View>
            <View>
              {/* The line the stations sit on. */}
              <View className="absolute bottom-0 top-0 w-0.5 bg-border" style={{ start: 9 }} />
              <View className="gap-4">
                {SEERAH_EVENTS.filter((event) => event.era === era.id).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    done={read.includes(event.id)}
                    badge={badges.includes(event.id)}
                    order={order++}
                  />
                ))}
              </View>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View className="absolute inset-x-0 h-1 overflow-hidden" style={{ top: insets.top }} pointerEvents="none">
        {/* Grows from the right, where Arabic starts. */}
        <Animated.View className="h-full w-full bg-gold" style={[{ transformOrigin: "right" }, bar]} />
      </View>
    </View>
  );
}
