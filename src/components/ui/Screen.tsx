import type { ReactNode } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColor } from "@/theme/useThemeColor";

interface ScreenProps {
  children: ReactNode;
  /** The first child is a full-bleed header that draws under the status bar. */
  bleed?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/** The scrolling page every tab is built on: the ivory ground, safe areas, and pull-to-refresh. */
export function Screen({ children, bleed = false, refreshing, onRefresh }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const tint = useThemeColor("accent");

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: bleed ? 0 : insets.top, paddingBottom: 32 }}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={tint} colors={[tint]} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Horizontal page gutter. */
export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={`px-4 ${className ?? ""}`}>{children}</View>;
}
