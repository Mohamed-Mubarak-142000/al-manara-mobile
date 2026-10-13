import { LinearGradient } from "expo-linear-gradient";
import { Check, Lock, ShoppingBag } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from "react-native-reanimated";

import { GARDEN_STAGES, nextGardenStage } from "@/core/kids/garden";
import { countDoneStations } from "@/core/kids/journey";
import { ownedItemIds } from "@/core/kids/rewards";
import { toArabicDigits } from "@/core/text/arabic";

import { useKidsState } from "../progress/progressStore";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, KidsTitlePanel } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";
import { GardenScene } from "./GardenScene";

export function GardenView() {
  const state = useKidsState();
  const [sceneWidth, setSceneWidth] = useState(0);
  const done = countDoneStations(state);
  const next = nextGardenStage(done);
  const previous = [...GARDEN_STAGES].reverse().find((stage) => stage.stations <= done)?.stations ?? 0;
  const toNext = next ? Math.round(((done - previous) / (next.stations - previous)) * 100) : 100;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(300, withTiming(Math.max(toNext, 4), { duration: 1000 }));
  }, [toNext, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <KidsScroll>
      <KidsTitlePanel title="🌳 حديقتي" subtitle="كل محطة تُكملها في الرحلة تزرع شيئًا جديدًا في حديقتك!" />

      <Animated.View
        entering={ZoomIn.springify()}
        onLayout={(event) => setSceneWidth(event.nativeEvent.layout.width - 8)}
        style={[{ borderRadius: 36, overflow: "hidden", borderWidth: 4, borderColor: "rgba(255,255,255,0.8)" }, PANEL_SHADOW]}
      >
        {sceneWidth > 0 && <GardenScene doneStations={done} ownedItems={[...ownedItemIds(state)]} width={sceneWidth} />}
      </Animated.View>

      {next ? (
        <KidsPanel>
          <KidsText size={19} bold center>
            {next.emoji} القادم: {next.name}. أكمل {toArabicDigits(next.stations - done)} {next.stations - done === 1 ? "محطة واحدة" : "محطات"} لتظهر في حديقتك
          </KidsText>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: toNext }}
            style={{ marginTop: 12, height: 20, borderRadius: 10, overflow: "hidden", backgroundColor: KIDS.track }}
          >
            <Animated.View style={[{ height: "100%", borderRadius: 10, overflow: "hidden" }, bar]}>
              <LinearGradient colors={[KIDS.emerald, KIDS.emeraldLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
            </Animated.View>
          </View>
        </KidsPanel>
      ) : (
        <KidsPanel>
          <KidsText size={22} bold center>
            🕌 ما شاء الله! اكتملت حديقتك
          </KidsText>
        </KidsPanel>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
        {GARDEN_STAGES.map((stage) => {
          const open = done >= stage.stations;
          return (
            <View
              key={stage.id}
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
              <Text style={{ fontSize: 34, opacity: open ? 1 : 0.3 }}>{stage.emoji}</Text>
              <KidsText size={13} bold center>
                {stage.name}
              </KidsText>
              <View className="mt-0.5 flex-row items-center gap-1">
                {open ? <Check size={13} color={KIDS.emerald} /> : <Lock size={13} color={KIDS.muted} />}
                <KidsText size={11} bold tone="muted">
                  {toArabicDigits(stage.stations)} محطة
                </KidsText>
              </View>
            </View>
          );
        })}
      </View>

      <View className="items-center">
        <KidsButton tone="sky" icon={ShoppingBag} onPress={() => go("/kids/rewards?tab=shop")}>
          زيّن حديقتك من المتجر
        </KidsButton>
      </View>
    </KidsScroll>
  );
}
