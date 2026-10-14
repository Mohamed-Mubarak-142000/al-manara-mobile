import { LinearGradient } from "expo-linear-gradient";
import { Check, Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { GARDEN_STAGES, nextGardenStage } from "@/core/kids/garden";
import { countDoneStations } from "@/core/kids/journey";
import { ownedItemIds } from "@/core/kids/rewards";
import { toArabicDigits } from "@/core/text/arabic";

import { useKidsState } from "../progress/progressStore";
import { KidsArt } from "../ui/KidsArt";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, KidsTitlePanel } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";
import { GardenScene } from "./GardenScene";

/** The games menu's springy drop-in, staggered by position; nothing moves when the phone asks for reduced motion. */
function enter(reduceMotion: boolean, index: number) {
  return reduceMotion
    ? undefined
    : FadeInDown.delay(index * 60)
        .springify()
        .stiffness(260)
        .damping(18);
}

export function GardenView() {
  const state = useKidsState();
  const reduceMotion = useReducedMotion();
  const [sceneWidth, setSceneWidth] = useState(0);
  const done = countDoneStations(state);
  const next = nextGardenStage(done);
  const previous = [...GARDEN_STAGES].reverse().find((stage) => stage.stations <= done)?.stations ?? 0;
  const toNext = next ? Math.round(((done - previous) / (next.stations - previous)) * 100) : 100;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(300, withTiming(Math.max(toNext, 4), { duration: reduceMotion ? 0 : 1000 }));
  }, [toNext, progress, reduceMotion]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <KidsScroll>
      <Animated.View entering={enter(reduceMotion, 0)}>
        <KidsTitlePanel
          icon={<KidsArt emoji="🌳" size={56} />}
          title="حديقتي"
          subtitle="كل محطة تُكملها في الرحلة تزرع شيئًا جديدًا في حديقتك!"
        />
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : ZoomIn.delay(60).springify().stiffness(260).damping(18)}
        onLayout={(event) => setSceneWidth(event.nativeEvent.layout.width - 8)}
        style={[{ borderRadius: 36, overflow: "hidden", borderWidth: 4, borderColor: "rgba(255,255,255,0.8)" }, PANEL_SHADOW]}
      >
        {sceneWidth > 0 && <GardenScene doneStations={done} ownedItems={[...ownedItemIds(state)]} width={sceneWidth} />}
      </Animated.View>

      <Animated.View entering={enter(reduceMotion, 2)}>
        {next ? (
          <KidsPanel className="items-center">
            <KidsArt emoji={next.emoji} size={48} />
            <KidsText size={19} bold center className="mt-1">
              القادم: {next.name}. أكمل {toArabicDigits(next.stations - done)} {next.stations - done === 1 ? "محطة واحدة" : "محطات"} لتظهر
              في حديقتك
            </KidsText>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: toNext }}
              style={{ alignSelf: "stretch", marginTop: 12, height: 20, borderRadius: 10, overflow: "hidden", backgroundColor: KIDS.track }}
            >
              <Animated.View style={[{ height: "100%", borderRadius: 10, overflow: "hidden" }, bar]}>
                <LinearGradient
                  colors={[KIDS.emerald, KIDS.emeraldLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>
          </KidsPanel>
        ) : (
          <KidsPanel className="items-center">
            <KidsArt emoji="🕌" size={56} />
            <KidsText size={22} bold center className="mt-1">
              ما شاء الله! اكتملت حديقتك
            </KidsText>
          </KidsPanel>
        )}
      </Animated.View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
        {GARDEN_STAGES.map((stage, index) => {
          const open = done >= stage.stations;
          return (
            <Animated.View
              key={stage.id}
              entering={enter(reduceMotion, index + 3)}
              style={[
                {
                  width: "31.5%",
                  borderRadius: 24,
                  padding: 10,
                  alignItems: "center",
                  borderWidth: 4,
                  backgroundColor: open ? KIDS.white : "rgba(255,255,255,0.7)",
                  borderColor: open ? KIDS.mintRing : "rgba(255,255,255,0.5)",
                },
                PANEL_SHADOW,
              ]}
            >
              <KidsArt emoji={stage.emoji} size={40} style={{ opacity: open ? 1 : 0.3 }} />
              <KidsText size={15} bold center className="mt-1">
                {stage.name}
              </KidsText>
              <View className="mt-0.5 flex-row items-center gap-1">
                {open ? <Check size={15} color={KIDS.emerald} /> : <Lock size={15} color={KIDS.muted} />}
                <KidsText size={14} bold tone="muted">
                  {toArabicDigits(stage.stations)} محطة
                </KidsText>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View className="items-center">
        <KidsButton tone="sky" art="🛍️" onPress={() => go("/kids/rewards?tab=shop")}>
          زيّن حديقتك من المتجر
        </KidsButton>
      </View>
    </KidsScroll>
  );
}
