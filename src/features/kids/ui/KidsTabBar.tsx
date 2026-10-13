import { usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { unopenedChests } from "@/core/kids/rewards";
import { toArabicDigits } from "@/core/text/arabic";

import { useKidsState } from "../progress/progressStore";
import { sfx } from "../sfx";
import { KIDS, PANEL_SHADOW } from "./kidsStyles";
import { goTab } from "./nav";

const TABS: { href: string; label: string; emoji: string; match: (path: string) => boolean }[] = [
  { href: "/kids", label: "رحلتي", emoji: "🗺️", match: (path) => path === "/kids" || path.startsWith("/kids/journey") },
  {
    href: "/kids/games",
    label: "العب وتعلّم",
    emoji: "🎮",
    match: (path) => ["/kids/games", "/kids/quiz", "/kids/stories", "/kids/listen", "/kids/recite"].some((p) => path.startsWith(p)),
  },
  { href: "/kids/garden", label: "حديقتي", emoji: "🌳", match: (path) => path.startsWith("/kids/garden") },
  {
    href: "/kids/rewards",
    label: "جوائزي",
    emoji: "🏆",
    match: (path) => path.startsWith("/kids/rewards") || path.startsWith("/kids/progress"),
  },
];

export const KIDS_TAB_BAR_HEIGHT = 84;

/** Big, icon-first navigation that stays at the bottom, like a game's menu. */
export function KidsTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const state = useKidsState();
  const chests = unopenedChests(state).length;
  return (
    <View
      accessibilityRole="tabbar"
      accessibilityLabel="أقسام حديقة القرآن"
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <View
        style={[
          { flexDirection: "row", gap: 4, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.96)", padding: 6, borderWidth: 4, borderColor: "rgba(255,255,255,0.7)" },
          PANEL_SHADOW,
        ]}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Pressable
              key={tab.href}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              onPress={() => {
                sfx.tap();
                goTab(tab.href, pathname);
              }}
              style={{ flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: 26, backgroundColor: active ? KIDS.tabActive : "transparent" }}
            >
              <Text style={{ fontSize: active ? 30 : 27, lineHeight: 38 }}>{tab.emoji}</Text>
              <Text className="font-kids-bold" style={{ color: KIDS.deep, fontSize: 13, lineHeight: 20 }} numberOfLines={1}>
                {tab.label}
              </Text>
              {tab.href === "/kids/rewards" && chests > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 2,
                    start: 10,
                    minWidth: 22,
                    height: 22,
                    paddingHorizontal: 5,
                    borderRadius: 11,
                    backgroundColor: KIDS.rose,
                    borderWidth: 2,
                    borderColor: KIDS.white,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text className="font-kids-bold" style={{ color: KIDS.white, fontSize: 11, lineHeight: 16 }}>
                    {toArabicDigits(chests)}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
