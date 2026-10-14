import { LinearGradient } from "expo-linear-gradient";
import { Lock, Play, Star } from "lucide-react-native";
import { memo, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import {
  countDoneStations,
  currentStation,
  JOURNEY_LENGTH,
  JOURNEY_REGIONS,
  journeyPercent,
  journeyStations,
  stationStars,
  type JourneyStation,
} from "@/core/kids/journey";
import type { CompanionAnimal } from "@/lib/database.types";
import { toArabicDigits } from "@/core/text/arabic";
import { useAccount } from "@/features/account/accountStore";

import { Companion } from "../companion/Companion";
import { companion as companionStore } from "../companion/companionStore";
import { getKidsSurahs } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { KidsArt } from "../ui/KidsArt";
import { KidsButton } from "../ui/KidsButton";
import { KidsEnter } from "../ui/KidsMotion";
import { KidsPanel, KidsText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";
import { DailyChallengeCard } from "./DailyChallengeCard";

const ROW_HEIGHT = 128;
/** Horizontal position (share of the width) of each station along the winding road. */
const ROAD_X = [0.5, 0.74, 0.5, 0.26];
const STATION_WIDTH = 130;

function Road({ count, width }: { count: number; width: number }) {
  const points = Array.from(
    { length: count },
    (_, index) => [ROAD_X[index % ROAD_X.length]! * width, index * ROW_HEIGHT + ROW_HEIGHT / 2] as const,
  );
  const d = points.reduce((path, [x, y], index) => {
    if (index === 0) return `M${x} ${y}`;
    const [px, py] = points[index - 1]!;
    const mid = (py + y) / 2;
    return `${path} C${px} ${mid} ${x} ${mid} ${x} ${y}`;
  }, "");
  return (
    <Svg width={width} height={count * ROW_HEIGHT} style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
      <Path d={d} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={26} strokeLinecap="round" />
      <Path d={d} fill="none" stroke={KIDS.roadDash} strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" />
    </Svg>
  );
}

function Pulse({ active, children }: { active: boolean; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!active || reduceMotion) return;
    scale.value = withRepeat(
      withSequence(withTiming(1.07, { duration: 800, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 800 })),
      -1,
    );
  }, [active, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const StationButton = memo(function StationButton({
  station,
  name,
  stars,
  color,
  shadow,
  side,
  companion,
}: {
  station: JourneyStation;
  name: string;
  stars: number;
  color: string;
  shadow: string;
  /** Which side of the station the companion stands on (toward the middle of the road). */
  side: "left" | "right";
  companion: { animal: CompanionAnimal; equipped: string[] } | null;
}) {
  const locked = station.status === "locked";
  const current = station.status === "current";
  const size = current ? 96 : 80;
  const circle = (
    <Pulse active={current}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: locked ? KIDS.locked : color,
          borderBottomWidth: 7,
          borderBottomColor: locked ? KIDS.lockedShadow : shadow,
        }}
      >
        {locked ? (
          <Lock size={32} color="rgba(255,255,255,0.9)" />
        ) : (
          <Text className="font-kids-bold" style={{ color: KIDS.white, fontSize: 30, lineHeight: 42 }}>
            {toArabicDigits(station.index + 1)}
          </Text>
        )}
        {station.status === "review" && (
          <View
            style={{
              position: "absolute",
              top: -8,
              end: -8,
              backgroundColor: KIDS.rose,
              borderRadius: 999,
              paddingHorizontal: 8,
              borderWidth: 2,
              borderColor: KIDS.white,
            }}
          >
            <Text className="font-kids-bold" style={{ color: KIDS.white, fontSize: 14, lineHeight: 22 }}>
              راجعها
            </Text>
          </View>
        )}
      </View>
    </Pulse>
  );
  const label = (
    <View className="mt-2 items-center">
      <View style={{ borderRadius: 999, paddingHorizontal: 12, backgroundColor: locked ? "rgba(255,255,255,0.7)" : KIDS.white }}>
        <KidsText size={16} bold tone={locked ? "muted" : "deep"} numberOfLines={1}>
          {name}
        </KidsText>
      </View>
      {!locked && stars > 0 && (
        <View accessibilityLabel={`${stars} من ٥ نجوم`} className="mt-1 flex-row gap-0.5">
          {Array.from({ length: 5 }, (_, index) => (
            <Star
              key={index}
              size={14}
              color={index < stars ? KIDS.starStroke : "rgba(255,255,255,0.7)"}
              fill={index < stars ? KIDS.starFill : "rgba(255,255,255,0.7)"}
            />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        locked ? `سورة ${name}: مغلقة. اجتز اختبار السورة التي قبلها لتفتحها` : `سورة ${name}${current ? " (محطتك الآن)" : ""}`
      }
      onPress={() => {
        sfx.tap();
        if (locked) companionStore.react("locked", "thinking");
        else go(`/kids/journey/${station.surahId}`);
      }}
      style={({ pressed }) => ({ alignItems: "center", transform: [{ translateY: pressed && !locked ? -2 : 0 }] })}
    >
      <View>
        {circle}
        {current && companion && (
          <View pointerEvents="none" style={{ position: "absolute", top: -56, [side]: -96 }}>
            <Companion animal={companion.animal} equipped={companion.equipped} mood="happy" width={96} />
          </View>
        )}
      </View>
      {label}
    </Pressable>
  );
});

export function JourneyMap() {
  const { state, status } = useKidsProgress();
  const account = useAccount();
  const learner = account.status === "signed-in" ? account.activeLearner : null;
  const reduceMotion = useReducedMotion();
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [roadWidth, setRoadWidth] = useState(0);
  const sectionY = useRef(new Map<number, number>());
  const roadY = useRef(new Map<number, number>());
  const names = new Map(getKidsSurahs().map((surah) => [surah.id, surah.name]));
  const stations = journeyStations(state);
  const current = currentStation(stations);
  const percent = journeyPercent(state);
  const done = countDoneStations(state);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      300,
      withTiming(Math.max(percent, 3), { duration: reduceMotion ? 0 : 1200, easing: Easing.out(Easing.ease) }),
    );
  }, [percent, progress, reduceMotion]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  // Bring the child's station into view, like the website's scrollIntoView.
  const currentId = current?.surahId;
  useEffect(() => {
    if (status !== "ready" || currentId === undefined) return;
    const timer = setTimeout(() => {
      const station = stations.find((entry) => entry.surahId === currentId);
      if (!station) return;
      const regionStations = stations.filter((entry) => entry.region.id === station.region.id);
      const index = regionStations.indexOf(station);
      const y =
        (sectionY.current.get(station.region.id) ?? 0) + (roadY.current.get(station.region.id) ?? 0) + index * ROW_HEIGHT + ROW_HEIGHT / 2;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - screenHeight / 2), animated: !reduceMotion });
    }, 700);
    return () => clearTimeout(timer);
    // Only when the page opens or the station changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentId]);

  return (
    <KidsScroll ref={scrollRef} gap={20}>
      <KidsEnter index={0}>
        <KidsPanel>
          <View className="flex-row items-center justify-center gap-2">
            <KidsText size={28} bold center style={{ flexShrink: 1 }}>
              أهلًا يا {learner?.display_name ?? "بطل"}!
            </KidsText>
            <KidsArt emoji="👋" size={38} />
          </View>
          <View className="mt-1 flex-row items-center justify-center gap-1.5">
            <KidsText size={19} tone="muted" center style={{ flexShrink: 1 }}>
              جاهز نكمل رحلتنا مع القرآن؟
            </KidsText>
            <KidsArt emoji="🌟" size={26} />
          </View>
          <View className="mt-5">
            <View className="flex-row items-center justify-between">
              <KidsText size={16} bold>
                رحلتك مع القرآن
              </KidsText>
              <KidsText size={16} bold>
                {toArabicDigits(done)} / {toArabicDigits(JOURNEY_LENGTH)} محطة
              </KidsText>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="نسبة التقدم في الرحلة"
              accessibilityValue={{ min: 0, max: 100, now: percent }}
              style={{
                marginTop: 8,
                height: 24,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: KIDS.track,
                borderWidth: 2,
                borderColor: KIDS.white,
              }}
            >
              <Animated.View style={[{ height: "100%", borderRadius: 12, overflow: "hidden" }, bar]}>
                <LinearGradient
                  colors={[KIDS.emerald, KIDS.emeraldLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>
          </View>
          {current ? (
            <KidsButton
              tone="emerald"
              size="lg"
              icon={Play}
              iconFilled
              className="mt-6"
              onPress={() => go(`/kids/journey/${current.surahId}`)}
            >
              كمّل الرحلة: سورة {names.get(current.surahId)}
            </KidsButton>
          ) : (
            done === JOURNEY_LENGTH && (
              <View
                style={{
                  marginTop: 24,
                  borderRadius: 24,
                  backgroundColor: KIDS.cream,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <KidsArt emoji="🏆" size={34} />
                <KidsText size={20} bold center style={{ color: KIDS.honey, flexShrink: 1 }}>
                  ما شاء الله! أنت حافظ صغير
                </KidsText>
              </View>
            )
          )}
        </KidsPanel>
      </KidsEnter>

      <KidsEnter index={1}>
        <DailyChallengeCard surahId={current?.surahId ?? null} />
      </KidsEnter>

      {JOURNEY_REGIONS.map((region, regionIndex) => {
        const regionStations = stations.filter((station) => station.region.id === region.id);
        const regionDone = regionStations.filter((station) => station.status === "done" || station.status === "review").length;
        return (
          <KidsEnter
            key={region.id}
            index={regionIndex + 2}
            onLayout={(event) => sectionY.current.set(region.id, event.nativeEvent.layout.y)}
          >
            <View
              accessibilityLabel={region.name}
              style={[
                {
                  borderRadius: 36,
                  padding: 16,
                  borderWidth: 4,
                  borderColor: "rgba(255,255,255,0.7)",
                  backgroundColor: `${region.tint}f2`,
                  overflow: "hidden",
                },
                PANEL_SHADOW,
              ]}
            >
              <View className="flex-row items-center gap-3">
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: region.color,
                    borderBottomWidth: 5,
                    borderBottomColor: region.shadow,
                  }}
                >
                  <KidsArt emoji={region.emoji} size={36} />
                </View>
                <View>
                  <KidsText size={22} bold>
                    {region.name}
                  </KidsText>
                  <KidsText size={15} bold tone="muted">
                    {toArabicDigits(regionDone)} من {toArabicDigits(regionStations.length)} محطات
                  </KidsText>
                </View>
              </View>
              {/* Left-to-right inside, so the stations sit on the road the same way as on the website. */}
              <View
                onLayout={(event) => {
                  roadY.current.set(region.id, event.nativeEvent.layout.y);
                  setRoadWidth(event.nativeEvent.layout.width);
                }}
                style={{ marginTop: 8, height: regionStations.length * ROW_HEIGHT, direction: "ltr" }}
              >
                {roadWidth > 0 && <Road count={regionStations.length} width={roadWidth} />}
                {roadWidth > 0 &&
                  regionStations.map((station, index) => {
                    const x = ROAD_X[index % ROAD_X.length]!;
                    return (
                      <View
                        key={station.surahId}
                        style={{
                          position: "absolute",
                          width: STATION_WIDTH,
                          left: x * roadWidth - STATION_WIDTH / 2,
                          top: index * ROW_HEIGHT + 8,
                        }}
                      >
                        <StationButton
                          station={station}
                          name={names.get(station.surahId) ?? toArabicDigits(station.surahId)}
                          stars={stationStars(state, station.surahId)}
                          color={region.color}
                          shadow={region.shadow}
                          side={x >= 0.5 ? "left" : "right"}
                          companion={state.companion}
                        />
                      </View>
                    );
                  })}
              </View>
            </View>
          </KidsEnter>
        );
      })}

      <KidsEnter index={JOURNEY_REGIONS.length + 2}>
        <KidsPanel className="items-center">
          <KidsArt emoji="🏆" size={68} />
          <KidsText size={22} bold center className="mt-2">
            نهاية الرحلة: الحافظ الصغير
          </KidsText>
          <KidsText size={17} tone="muted" center className="mt-1">
            أكمل كل المحطات لتصل إلى هنا!
          </KidsText>
        </KidsPanel>
      </KidsEnter>
    </KidsScroll>
  );
}
