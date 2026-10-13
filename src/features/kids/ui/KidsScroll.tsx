import { forwardRef, type ReactNode } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";

import { useKidsBottomPad } from "./KidsShell";

/** A kids page: scrolls over the garden, with room for the tab bar and the companion at the bottom. */
export const KidsScroll = forwardRef<ScrollView, { children: ReactNode; gap?: number } & Omit<ScrollViewProps, "contentContainerStyle">>(
  function KidsScroll({ children, gap = 20, ...rest }, ref) {
    const bottom = useKidsBottomPad();
    return (
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: bottom, gap }}
        {...rest}
      >
        {children}
      </ScrollView>
    );
  },
);
