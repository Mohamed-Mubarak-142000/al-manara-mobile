import { Star } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { Modal, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { Companion } from "../companion/Companion";
import { useKidsState } from "../progress/progressStore";
import { KidsText } from "./KidsPanel";
import { KIDS, PANEL_SHADOW } from "./kidsStyles";

// Deterministic "random" spread so the burst never differs between renders (the website's PARTICLES).
const PARTICLES = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2;
  const distance = 140 + ((i * 53) % 110);
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance),
    size: 14 + ((i * 7) % 16),
    color: [KIDS.siteGold, KIDS.siteRose, KIDS.siteSky, KIDS.brand, KIDS.starFill][i % 5]!,
    delay: (i % 6) * 30,
  };
});

function Particle({ x, y, size, color, delay }: (typeof PARTICLES)[number]) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }));
  }, [delay, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: x * progress.value },
      { translateY: y * progress.value },
      { scale: progress.value },
      { rotate: `${180 * progress.value}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ position: "absolute" }, style]}>
      <Star size={size} color={color} fill={color} />
    </Animated.View>
  );
}

function BigStar({ index, lit }: { index: number; lit: boolean }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(250 + index * 180, withSpring(lit ? 1 : 0.8, { stiffness: 300, damping: 14 }));
  }, [index, lit, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Star size={lit ? 54 : 46} color={lit ? KIDS.starStroke : KIDS.line} fill={lit ? KIDS.starFill : KIDS.line} />
    </Animated.View>
  );
}

interface CelebrationProps {
  open: boolean;
  title: string;
  message?: string;
  stars?: number;
  children?: ReactNode;
  onClose?: () => void;
}

/** The website's Celebration: a star burst, the companion cheering, a title, and the next steps. */
export function Celebration({ open, title, message, stars, children, onClose }: CelebrationProps) {
  const { companion } = useKidsState();
  const reduceMotion = useReducedMotion();
  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View
        accessibilityViewIsModal
        accessibilityLabel={title}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(1,42,34,0.45)" }}
      >
        {!reduceMotion && (
          <View pointerEvents="none" style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
            {PARTICLES.map((particle, index) => (
              <Particle key={index} {...particle} />
            ))}
          </View>
        )}
        <Animated.View
          entering={reduceMotion ? FadeIn : ZoomIn.springify().stiffness(260).damping(18)}
          style={[
            { width: "100%", maxWidth: 380, backgroundColor: KIDS.white, borderRadius: 40, padding: 28, paddingTop: companion ? 8 : 28, alignItems: "center" },
            PANEL_SHADOW,
          ]}
        >
          {companion && (
            <View style={{ marginTop: stars !== undefined ? -110 : -96 }}>
              <Companion animal={companion.animal} equipped={companion.equipped} mood="cheer" width={128} />
            </View>
          )}
          {stars !== undefined && (
            <View accessibilityLabel={`${stars} من ٣ نجوم`} style={{ flexDirection: "row", gap: 4, marginBottom: 12, marginTop: companion ? 4 : -64 }}>
              {[0, 1, 2].map((index) => (
                <BigStar key={index} index={index} lit={index < stars} />
              ))}
            </View>
          )}
          <KidsText size={28} bold center>
            {title}
          </KidsText>
          {message ? (
            <KidsText size={17} tone="muted" center className="mt-2">
              {message}
            </KidsText>
          ) : null}
          {children ? <View style={{ marginTop: 22, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>{children}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}
