import { X, type LucideIcon } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { useThemeColor } from "@/theme/useThemeColor";

import { Button } from "./Button";

/** A calm, decelerating curve: the sheet glides in and settles rather than snapping. */
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const OPEN_MS = 420;
const CLOSE_MS = 280;
/** Dragged this far down (or flicked), the sheet closes; less, it springs back. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;

export interface SheetAction {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The header: title at the start, the round close button at the end, a hairline under them. */
  title?: string;
  icon?: LucideIcon;
  children: ReactNode;
  /** The footer's filled button (تطبيق، حفظ…). */
  primary?: SheetAction;
  /** The outlined button beside it (إعادة تعيين، إلغاء…). */
  secondary?: SheetAction;
  /** A custom footer instead of the two buttons. */
  footer?: ReactNode;
  /** Off for content that scrolls itself (a FlatList) or must not scroll. */
  scroll?: boolean;
  /** Content padding; off for full-bleed lists. */
  padded?: boolean;
  /** Fraction of the screen the sheet may take. */
  maxHeight?: number;
}

/**
 * The app's one bottom sheet, for every filter, picker and dialog: it rises from the bottom over a dimmed
 * screen, can be dragged down or tapped outside to close, and answers the Android back button.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  icon: Icon,
  children,
  primary,
  secondary,
  footer,
  scroll = true,
  padded = true,
  maxHeight = 0.9,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const fg = useThemeColor("fg");
  const primaryColor = useThemeColor("primary");
  // Stays mounted through the closing animation, then unmounts.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      drag.set(0);
      progress.set(withTiming(1, { duration: OPEN_MS, easing: EASE }));
    } else {
      progress.set(
        withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, progress, drag]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.get() * 0.45 }));
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * height + Math.max(0, drag.get()) }],
  }));

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((event) => {
      drag.set(event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) scheduleOnRN(onClose);
      else drag.set(withSpring(0, { damping: 22, stiffness: 220 }));
    });

  if (!mounted) return null;
  const hasFooter = footer !== undefined || primary || secondary;
  const Body = scroll ? ScrollView : View;

  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View className="absolute inset-0 bg-black" style={backdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" className="flex-1" onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 justify-end"
          pointerEvents="box-none"
        >
          <Animated.View
            accessibilityViewIsModal
            className="overflow-hidden rounded-t-4xl bg-surface"
            style={[{ maxHeight: height * maxHeight }, sheet]}
          >
            <GestureDetector gesture={pan}>
              <View>
                <View className="items-center pb-1 pt-2.5">
                  <View className="h-1 w-10 rounded-full bg-border" />
                </View>
                {title !== undefined && (
                  <View className="flex-row items-center gap-3 border-b border-border px-5 pb-4 pt-2">
                    {Icon && <Icon size={20} color={primaryColor} />}
                    <Text className="flex-1 font-sans-bold text-lg text-fg" numberOfLines={1}>
                      {title}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="إغلاق"
                      onPress={onClose}
                      hitSlop={10}
                      className="size-8 items-center justify-center rounded-full border-2 border-fg"
                    >
                      <X size={16} color={fg} strokeWidth={2.5} />
                    </Pressable>
                  </View>
                )}
              </View>
            </GestureDetector>

            <Body
              {...(scroll
                ? {
                    contentContainerStyle: { padding: padded ? 20 : 0, paddingBottom: hasFooter ? 20 : insets.bottom + 20 },
                    keyboardShouldPersistTaps: "handled" as const,
                    showsVerticalScrollIndicator: false,
                  }
                : { style: { flexShrink: 1, padding: padded ? 20 : 0, paddingBottom: hasFooter ? undefined : insets.bottom + 20 } })}
            >
              {children}
            </Body>

            {hasFooter && (
              <View className="border-t border-border px-5 pt-4" style={{ paddingBottom: insets.bottom + 14 }}>
                {footer ?? (
                  // In RTL the first button sits at the right: the outlined one, then the filled one.
                  <View className="flex-row gap-3">
                    {secondary && (
                      <Button
                        className="flex-1"
                        variant="secondary"
                        size="lg"
                        icon={secondary.icon}
                        disabled={secondary.disabled}
                        onPress={secondary.onPress}
                      >
                        {secondary.label}
                      </Button>
                    )}
                    {primary && (
                      <Button className="flex-1" size="lg" icon={primary.icon} disabled={primary.disabled} onPress={primary.onPress}>
                        {primary.label}
                      </Button>
                    )}
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** A yes/no question as a sheet (in place of the system alert). */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "إلغاء",
  destructive = false,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      scroll={false}
      secondary={{ label: cancelLabel, onPress: onClose }}
      primary={{
        label: confirmLabel,
        onPress: () => {
          onClose();
          onConfirm();
        },
      }}
    >
      <Text className={`font-sans text-base leading-7 ${destructive ? "text-danger" : "text-fg-muted"}`}>{message}</Text>
    </BottomSheet>
  );
}
