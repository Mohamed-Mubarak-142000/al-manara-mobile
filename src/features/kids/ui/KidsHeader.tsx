import { router, usePathname } from "expo-router";
import { Check, ChevronDown, Gem, Home, Star, Users, Volume2, VolumeX } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { gemBalance } from "@/core/kids/rewards";
import { computeStars } from "@/core/kids/stars";
import { toArabicDigits } from "@/core/text/arabic";
import { account, useAccount } from "@/features/account/accountStore";

import { useKidsState } from "../progress/progressStore";
import { setSfxEnabled, useSfxEnabled } from "../sfx";
import { KidsText } from "./KidsPanel";
import { KIDS, PANEL_SHADOW } from "./kidsStyles";
import { go, kidsHref } from "./nav";

function Pill({ children, onPress, label, bg = "rgba(255,255,255,0.95)" }: { children: ReactNode; onPress: () => void; label: string; bg?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderRadius: 999,
          backgroundColor: bg,
          paddingHorizontal: 12,
          height: 46,
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.6)",
          transform: [{ translateY: pressed ? 1 : 0 }],
        },
        PANEL_SHADOW,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** The website's LearnerSwitcher (kids variant): whose progress is shown and saved. */
function LearnerSwitcher() {
  const state = useAccount();
  const [open, setOpen] = useState(false);
  if (state.status !== "signed-in" || state.learners.length < 2 || !state.activeLearner) return null;
  const { learners, activeLearner } = state;
  return (
    <>
      <Pill label="اختر الملف" onPress={() => setOpen(true)}>
        <Users size={16} color={KIDS.honey} />
        <Text className="font-kids-bold" style={{ color: KIDS.deep, fontSize: 15, maxWidth: 90 }} numberOfLines={1}>
          {activeLearner.kind === "self" ? "أنا" : activeLearner.display_name}
        </Text>
        <ChevronDown size={16} color={KIDS.deep} />
      </Pill>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(1,42,34,0.35)", justifyContent: "center", padding: 24 }} onPress={() => setOpen(false)}>
          <View style={[{ backgroundColor: KIDS.white, borderRadius: 28, padding: 10 }, PANEL_SHADOW]}>
            <KidsText size={18} bold center className="my-2">
              اختر الملف
            </KidsText>
            {learners.map((learner) => {
              const selected = learner.id === activeLearner.id;
              return (
                <Pressable
                  key={learner.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    account.chooseLearner(learner.id);
                    setOpen(false);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 10, backgroundColor: selected ? KIDS.mist : "transparent" }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: learner.kind === "self" ? KIDS.siteGold : "rgba(47,155,214,0.15)",
                    }}
                  >
                    <Text className="font-display-bold" style={{ color: learner.kind === "self" ? KIDS.night : KIDS.siteSky }}>
                      {learner.display_name.slice(0, 1)}
                    </Text>
                  </View>
                  <KidsText size={16} bold className="flex-1">
                    {learner.kind === "self" ? `أنا (${learner.display_name})` : learner.display_name}
                  </KidsText>
                  {selected && <Check size={18} color={KIDS.emerald} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/** The kids header: home, the child's switcher, stars and gems, and the game sounds toggle. */
export function KidsHeader({ showChrome }: { showChrome: boolean }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const state = useKidsState();
  const sfxOn = useSfxEnabled();
  const atHome = pathname === "/kids";
  const leave = atHome || !showChrome;
  const stars = computeStars(state);
  const gems = gemBalance(state);

  return (
    <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 10, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Pill
        label={leave ? "العودة للتطبيق" : "رحلتي"}
        onPress={() => {
          // The website's "العودة للموقع" goes to the home page; the app goes back to Home.
          if (leave) router.dismissTo("/");
          else router.dismissTo(kidsHref("/kids"));
        }}
      >
        <Home size={20} color={KIDS.deep} />
      </Pill>
      <View style={{ flex: 1 }} />
      <LearnerSwitcher />
      {showChrome && (
        <>
          <Pill label={`نجومك: ${stars}`} bg={KIDS.cream} onPress={() => go("/kids/rewards")}>
            <Star size={18} color={KIDS.starStroke} fill={KIDS.starFill} />
            <Text className="font-kids-bold" style={{ color: KIDS.honey, fontSize: 16 }}>
              {toArabicDigits(stars)}
            </Text>
          </Pill>
          <Pill label={`جواهرك: ${gems}`} bg={KIDS.gemBg} onPress={() => go("/kids/rewards?tab=shop")}>
            <Gem size={18} color={KIDS.gemStroke} fill={KIDS.gemFill} />
            <Text className="font-kids-bold" style={{ color: KIDS.gemText, fontSize: 16 }}>
              {toArabicDigits(gems)}
            </Text>
          </Pill>
        </>
      )}
      <Pill label={sfxOn ? "إيقاف أصوات الألعاب" : "تشغيل أصوات الألعاب"} onPress={() => setSfxEnabled(!sfxOn)}>
        {sfxOn ? <Volume2 size={20} color={KIDS.deep} /> : <VolumeX size={20} color={KIDS.deep} />}
      </Pill>
    </View>
  );
}
