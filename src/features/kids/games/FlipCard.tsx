import { LinearGradient } from "expo-linear-gradient";
import { Star } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, interpolate, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from "react-native-reanimated";

import { KIDS } from "../ui/kidsStyles";

/** A memory card: the coloured back with a star, turning over (rotateY) to show its face. */
export function FlipCard({
  open,
  matched,
  index,
  aspect,
  back,
  backShadow,
  label,
  onPress,
  children,
}: {
  open: boolean;
  matched: boolean;
  index: number;
  /** Width / height. */
  aspect: number;
  back: [string, string];
  backShadow: string;
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withSpring(open ? 180 : 0, { stiffness: 260, damping: 22 });
  }, [open, turn]);
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${turn.value}deg` }],
    opacity: interpolate(turn.value, [89, 91], [1, 0], "clamp"),
  }));
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${turn.value - 180}deg` }],
    opacity: interpolate(turn.value, [89, 91], [0, 1], "clamp"),
  }));
  return (
    <Animated.View
      entering={ZoomIn.delay(index * 40)
        .springify()
        .stiffness(260)
        .damping(16)}
      style={{ flex: 1 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? label : "بطاقة مقلوبة"}
        onPress={onPress}
        style={{ aspectRatio: aspect }}
      >
        <Animated.View
          style={[
            { position: "absolute", inset: 0, borderRadius: 24, overflow: "hidden", borderBottomWidth: 6, borderBottomColor: backShadow },
            backStyle,
          ]}
        >
          <LinearGradient
            colors={back}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Star size={40} color="rgba(255,255,255,0.65)" fill="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </Animated.View>
        <Animated.View
          style={[
            {
              position: "absolute",
              inset: 0,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              padding: 6,
              backgroundColor: KIDS.white,
              borderWidth: 4,
              borderBottomWidth: 6,
              borderColor: matched ? KIDS.emerald : KIDS.whiteRing,
              borderBottomColor: matched ? KIDS.emerald : KIDS.whiteShadow,
            },
            faceStyle,
          ]}
        >
          {open ? <Animated.View entering={FadeIn}>{children}</Animated.View> : <View />}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
