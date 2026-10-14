import { router, usePathname } from "expo-router";
import { Check, Gem, Home, Star, Users, Volume2, VolumeX } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { gemBalance } from "@/core/kids/rewards";
import { computeStars } from "@/core/kids/stars";
import { toArabicDigits } from "@/core/text/arabic";
import { account, useAccount } from "@/features/account/accountStore";

import { useKidsState } from "../progress/progressStore";
import { setSfxEnabled, useSfxEnabled } from "../sfx";
import { KidsSheetCard, KidsText } from "./KidsPanel";
import { KIDS, PANEL_SHADOW } from "./kidsStyles";
import { go, kidsHref } from "./nav";

/** The header's text stops growing here with the phone's font size, so the row still fits a 360dp phone. */
const MAX_SCALE = 1.2;
const GAP = 5;

/** Past 999 a count shows "٩٩٩+" so the row keeps its width; the spoken label keeps the real number. */
function compact(value: number): string {
  return value > 999 ? `${toArabicDigits(999)}+` : toArabicDigits(value);
}

function Pill({
  children,
  onPress,
  label,
  bg = "rgba(255,255,255,0.95)",
  round,
  shrink,
}: {
  children: ReactNode;
  onPress: () => void;
  label: string;
  bg?: string;
  /** A round 46dp button for a lone icon (home, sound). */
  round?: boolean;
  /** May get narrower when the row is tight (the learner's name truncates first). */
  shrink?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          borderRadius: 999,
          backgroundColor: bg,
          width: round ? 46 : undefined,
          paddingHorizontal: round ? 0 : 10,
          height: 46,
          flexShrink: shrink ? 1 : 0,
          minWidth: 46,
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

/** One half of the stars-and-gems pill; each count still opens its own page. */
function Counter({ label, onPress, bg, children }: { label: string; onPress: () => void; bg: string; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        height: "100%",
        paddingHorizontal: 9,
        backgroundColor: bg,
        opacity: pressed ? 0.8 : 1,
      })}
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
  const name = activeLearner.kind === "self" ? "أنا" : activeLearner.display_name;
  return (
    <>
      <Pill label={`اختر الملف: ${name}`} onPress={() => setOpen(true)} shrink>
        <Users size={16} color={KIDS.honey} />
        <Text
          className="font-kids-bold"
          style={{ color: KIDS.deep, fontSize: 15, maxWidth: 90, flexShrink: 1 }}
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_SCALE}
        >
          {name}
        </Text>
      </Pill>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title="اختر الملف" icon={Users}>
        {/* The kids' own look inside the sheet, on a light card so it reads in dark mode too. */}
        <KidsSheetCard>
          <View style={{ gap: 4 }}>
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
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: 18,
                    padding: 10,
                    minHeight: 54,
                    backgroundColor: selected ? KIDS.mint : "transparent",
                  }}
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
                    <Text className="font-kids-bold" style={{ color: learner.kind === "self" ? KIDS.night : KIDS.siteSky }}>
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
        </KidsSheetCard>
      </BottomSheet>
    </>
  );
}

/**
 * The kids header: home, the child's switcher, stars and gems, and the game sounds toggle. Sized for a 360dp
 * phone with everything showing: round icon buttons, stars and gems sharing one pill, and the learner's name
 * as the one part that shrinks (it truncates).
 */
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
    <View
      style={{
        paddingTop: insets.top + 6,
        paddingHorizontal: 10,
        paddingBottom: 6,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: GAP,
      }}
    >
      <Pill
        round
        label={leave ? "العودة للتطبيق" : "رحلتي"}
        onPress={() => {
          // The website's "العودة للموقع" goes to the home page; the app goes back to Home.
          if (leave) router.dismissTo("/");
          else router.dismissTo(kidsHref("/kids"));
        }}
      >
        <Home size={20} color={KIDS.deep} />
      </Pill>
      <View style={{ flexDirection: "row", alignItems: "center", gap: GAP, flexShrink: 1 }}>
        <LearnerSwitcher />
        {showChrome && (
          <View
            style={[
              {
                flexDirection: "row",
                height: 46,
                borderRadius: 999,
                overflow: "hidden",
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.6)",
                flexShrink: 0,
              },
              PANEL_SHADOW,
            ]}
          >
            <Counter label={`نجومك: ${stars}`} bg={KIDS.cream} onPress={() => go("/kids/rewards")}>
              <Star size={17} color={KIDS.starStroke} fill={KIDS.starFill} />
              <Text className="font-kids-bold" style={{ color: KIDS.honey, fontSize: 15 }} maxFontSizeMultiplier={MAX_SCALE}>
                {compact(stars)}
              </Text>
            </Counter>
            <Counter label={`جواهرك: ${gems}`} bg={KIDS.gemBg} onPress={() => go("/kids/rewards?tab=shop")}>
              <Gem size={17} color={KIDS.gemStroke} fill={KIDS.gemFill} />
              <Text className="font-kids-bold" style={{ color: KIDS.gemText, fontSize: 15 }} maxFontSizeMultiplier={MAX_SCALE}>
                {compact(gems)}
              </Text>
            </Counter>
          </View>
        )}
        <Pill round label={sfxOn ? "إيقاف أصوات الألعاب" : "تشغيل أصوات الألعاب"} onPress={() => setSfxEnabled(!sfxOn)}>
          {sfxOn ? <Volume2 size={20} color={KIDS.deep} /> : <VolumeX size={20} color={KIDS.deep} />}
        </Pill>
      </View>
    </View>
  );
}
