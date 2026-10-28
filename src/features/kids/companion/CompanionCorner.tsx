import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";

import { KidsText } from "../ui/KidsPanel";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { useKidsState } from "../progress/progressStore";
import { Companion } from "./Companion";
import { useCompanion } from "./companionStore";

export function SpeechBubble({ line, size = 16 }: { line: string; size?: number }) {
  return (
    <Animated.View
      key={line}
      entering={ZoomIn.springify().damping(20).stiffness(320)}
      exiting={FadeOut.duration(150)}
      accessibilityLiveRegion="polite"
      style={[
        {
          backgroundColor: KIDS.white,
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderWidth: 4,
          borderColor: "rgba(255,255,255,0.6)",
        },
        PANEL_SHADOW,
      ]}
    >
      <KidsText size={size} bold center>
        {line}
      </KidsText>
    </Animated.View>
  );
}

/** The companion floating in a corner of every kids page, reacting to what happens. */
export function CompanionCorner({ bottom }: { bottom: number }) {
  const state = useKidsState();
  const { line, mood, react } = useCompanion();
  const greeted = useRef(false);

  // Greet once when the kids area opens.
  useEffect(() => {
    if (greeted.current) return;
    const timer = setTimeout(() => {
      greeted.current = true;
      const hour = new Date().getHours();
      react(hour >= 4 && hour < 12 ? "greetMorning" : hour >= 17 || hour < 4 ? "greetEvening" : "greet");
    }, 600);
    return () => clearTimeout(timer);
  }, [react]);

  if (!state.companion) return null;
  // `end` is the physical left in the app's right-to-left layout, the website's corner.
  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", end: 6, bottom, flexDirection: "row-reverse", alignItems: "flex-end", gap: 2 }}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="رفيقك في الرحلة" onPress={() => react("greet")}>
        <Companion animal={state.companion.animal} equipped={state.companion.equipped} mood={mood} width={74} />
      </Pressable>
      <View pointerEvents="none" style={{ maxWidth: 200, marginBottom: 44 }}>
        {line ? <SpeechBubble line={line} size={15} /> : null}
      </View>
    </View>
  );
}
