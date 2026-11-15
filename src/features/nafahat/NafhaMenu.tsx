import * as Haptics from "expo-haptics";
import { Download, Share2, type LucideIcon } from "lucide-react-native";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { NafhaEmoji } from "@/lib/database.types";
import { useThemeColor } from "@/theme/useThemeColor";

import { NAFAHAT_EMOJIS, type Nafha } from "./nafahatApi";

/** Where the bubble is on screen (measureInWindow). */
export interface BubbleAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

const WIDTH = 272;
const BAR = 58;
const ROW = 50;
const GAP = 10;

function Action({ icon: Icon, label, onPress, first }: { icon: LucideIcon; label: string; onPress: () => void; first?: boolean }) {
  const primary = useThemeColor("primary");
  return (
    <Pressable
      accessibilityRole="menuitem"
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 ${first ? "" : "border-t border-border"}`}
      style={({ pressed }) => ({ height: ROW, opacity: pressed ? 0.6 : 1 })}
    >
      <Icon size={18} color={primary} />
      <Text className="font-sans-bold text-sm text-fg">{label}</Text>
    </Pressable>
  );
}

/**
 * WhatsApp's long-press menu: the screen dims, the message is outlined where it is, the emoji bar sits above it
 * (or below, when there is no room) with the actions under the bar, always inside the screen.
 */
export function NafhaMenu({
  nafha,
  anchor,
  mine,
  onPick,
  onShare,
  onSave,
  onClose,
}: {
  nafha: Nafha;
  anchor: BubbleAnchor | null;
  mine: NafhaEmoji | undefined;
  onPick: (emoji: NafhaEmoji) => void;
  onShare: () => void;
  onSave: (() => void) | null;
  onClose: () => void;
}) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gold = useThemeColor("gold");
  if (!anchor) return null;

  const block = BAR + GAP + ROW * (onSave ? 2 : 1);
  const above = anchor.y - block - GAP;
  const below = anchor.y + anchor.height + GAP;
  const top =
    above >= insets.top + 8
      ? above
      : below + block <= screenH - insets.bottom - 8
        ? below
        : Math.max(insets.top + 8, screenH - insets.bottom - block - 12);
  // Lined up with the bubble's start (its right edge, in this RTL app), kept on screen.
  const right = Math.min(Math.max(12, screenW - (anchor.x + anchor.width)), screenW - WIDTH - 12);

  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, direction: "ltr" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={onClose} className="absolute inset-0 bg-black/55" />
        {/* The message stays visible under the dim, outlined so it is clear which one the menu is for. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: anchor.x - 4,
            top: anchor.y - 4,
            width: anchor.width + 8,
            height: anchor.height + 8,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: gold,
          }}
        />
        <Animated.View entering={FadeIn.duration(150)} style={{ position: "absolute", top, right, width: WIDTH, gap: GAP }}>
          <Animated.View
            entering={ZoomIn.springify().damping(15)}
            className="flex-row justify-between self-end rounded-full bg-surface p-1.5"
            style={{ height: BAR, elevation: 8 }}
          >
            {NAFAHAT_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji.id}
                accessibilityRole="menuitem"
                accessibilityLabel={emoji.label}
                accessibilityState={{ selected: mine === emoji.id }}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onPick(emoji.id);
                }}
                className={`size-12 items-center justify-center rounded-full ${mine === emoji.id ? "bg-primary-soft" : ""}`}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 1.3 : 1 }] })}
              >
                <Text style={{ fontSize: 28, lineHeight: 36 }}>{emoji.char}</Text>
              </Pressable>
            ))}
          </Animated.View>
          <View className="overflow-hidden rounded-2xl bg-surface" style={{ elevation: 8, direction: "rtl" }}>
            <Action first icon={Share2} label="مشاركة" onPress={onShare} />
            {onSave ? (
              <Action
                icon={Download}
                label={nafha.media_type === "video" ? "حفظ الفيديو في المعرض" : "حفظ الصورة في المعرض"}
                onPress={onSave}
              />
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
