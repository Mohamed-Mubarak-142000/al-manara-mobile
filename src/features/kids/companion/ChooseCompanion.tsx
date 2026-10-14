import { router } from "expo-router";
import { Rocket } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { COMPANIONS, companionInfo } from "@/core/kids/companionLines";
import type { CompanionAnimal } from "@/lib/database.types";
import { useAccount } from "@/features/account/accountStore";

import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { KidsArt } from "../ui/KidsArt";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { kidsHref } from "../ui/nav";
import { Companion } from "./Companion";
import { SpeechBubble } from "./CompanionCorner";

export function ChooseCompanion() {
  const account = useAccount();
  const learner = account.status === "signed-in" ? account.activeLearner : null;
  const { state, chooseCompanion } = useKidsProgress();
  const [picked, setPicked] = useState<CompanionAnimal | null>(state.companion?.animal ?? null);
  const changing = state.companion !== null;

  function start() {
    if (!picked) return;
    sfx.win();
    chooseCompanion(picked);
    if (changing) router.back();
    else router.replace(kidsHref("/kids"));
  }

  return (
    <KidsScroll>
      <KidsPanel>
        <View className="items-center">
          <KidsArt emoji="👋" size={52} />
        </View>
        <KidsText size={28} bold center className="mt-2">
          {learner ? `أهلًا يا ${learner.display_name}!` : "أهلًا يا بطل!"}
        </KidsText>
        <KidsText size={19} tone="muted" center className="mt-1">
          مَن سيرافقك في رحلتك مع القرآن؟
        </KidsText>
      </KidsPanel>

      <View className="flex-row flex-wrap justify-between gap-y-4">
        {COMPANIONS.map((companion, index) => {
          const selected = picked === companion.animal;
          return (
            <Animated.View
              key={companion.animal}
              entering={FadeInDown.delay(index * 100)
                .springify()
                .stiffness(240)
                .damping(16)}
              style={{ width: "48%" }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={companion.name}
                onPress={() => {
                  sfx.tap();
                  setPicked(companion.animal);
                }}
                style={[
                  {
                    alignItems: "center",
                    borderRadius: 32,
                    backgroundColor: "rgba(255,255,255,0.95)",
                    padding: 14,
                    borderWidth: 4,
                    borderColor: selected ? KIDS.gold : "rgba(255,255,255,0.6)",
                    transform: [{ translateY: selected ? -4 : 0 }],
                  },
                  PANEL_SHADOW,
                ]}
              >
                <Companion animal={companion.animal} mood={selected ? "cheer" : "idle"} width={110} height={140} />
                <View
                  style={{
                    marginTop: 8,
                    borderRadius: 999,
                    paddingHorizontal: 18,
                    paddingVertical: 2,
                    backgroundColor: companion.color,
                    borderBottomWidth: 5,
                    borderBottomColor: companion.shadow,
                  }}
                >
                  <KidsText size={20} bold tone="white">
                    {companion.name}
                  </KidsText>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <View className="items-center gap-4" style={{ minHeight: 128 }}>
        {picked && <SpeechBubble line={companionInfo(picked).intro} size={17} />}
        <KidsButton tone="gold" size="lg" icon={Rocket} disabled={!picked} onPress={start}>
          {changing ? "هذا رفيقي!" : "هيا نبدأ الرحلة!"}
        </KidsButton>
      </View>
    </KidsScroll>
  );
}
