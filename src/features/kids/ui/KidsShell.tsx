import { router, usePathname } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CompanionCorner } from "../companion/CompanionCorner";
import { useKidsProgress } from "../progress/progressStore";
import { ChestWatcher } from "../rewards/ChestWatcher";
import { GardenBackground } from "./GardenBackground";
import { KidsHeader } from "./KidsHeader";
import { KIDS_TAB_BAR_HEIGHT, KidsTabBar } from "./KidsTabBar";
import { KIDS } from "./kidsStyles";
import { kidsHref } from "./nav";

const WELCOME = "/kids/welcome";

/**
 * The website's KidsShell: the garden behind everything, the header, and — once the child has picked a
 * companion — the bottom tabs, the floating companion and the chest announcements.
 */
export function KidsShell({ isChild, children }: { isChild: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { state, status } = useKidsProgress();
  const atWelcome = pathname === WELCOME;
  // The journey, tab bar and companion only exist once a child has picked a companion.
  const showChrome = isChild && state.companion !== null && !atWelcome;

  useEffect(() => {
    if (isChild && status === "ready" && state.companion === null && !atWelcome) router.replace(kidsHref(WELCOME));
  }, [isChild, status, state.companion, atWelcome]);

  return (
    <View style={{ flex: 1, backgroundColor: KIDS.grass }}>
      <GardenBackground />
      <KidsHeader showChrome={showChrome} />
      <View style={{ flex: 1 }}>{children}</View>
      {showChrome && (
        <>
          <CompanionCorner bottom={KIDS_TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 6} />
          <KidsTabBar />
          <ChestWatcher />
        </>
      )}
    </View>
  );
}

/** Room under a kids page's content: the tab bar and the companion standing above it. */
export function useKidsBottomPad(): number {
  const insets = useSafeAreaInsets();
  return KIDS_TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 110;
}
