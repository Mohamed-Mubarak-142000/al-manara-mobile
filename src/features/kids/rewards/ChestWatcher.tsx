import { Gift } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { unopenedChests } from "@/core/kids/rewards";

import { useKidsProgress } from "../progress/progressStore";
import { Celebration } from "../ui/Celebration";
import { KidsArt } from "../ui/KidsArt";
import { KidsButton } from "../ui/KidsButton";
import { go } from "../ui/nav";

/** Announces a newly earned chest (a finished station or daily challenge) wherever it happens. */
export function ChestWatcher() {
  const { state, status } = useKidsProgress();
  const key = unopenedChests(state)
    .map((chest) => chest.id)
    .join(",");
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "ready") {
      seen.current = null;
      return;
    }
    const current = key ? key.split(",") : [];
    // The first ready snapshot is what the child already had; only later additions are news.
    if (seen.current === null) {
      seen.current = new Set(current);
      return;
    }
    const previous = seen.current;
    const added = current.find((id) => !previous.has(id));
    seen.current = new Set(current);
    if (!added) return;
    // Let the game's own celebration finish first.
    const timer = setTimeout(() => setFresh(added), 2600);
    return () => clearTimeout(timer);
  }, [key, status]);

  const daily = fresh?.startsWith("daily-");
  return (
    <Celebration
      open={fresh !== null}
      title={daily ? "أكملت تحدي اليوم!" : "أكملت المحطة!"}
      message="حصلت على صندوق مفاجآت، ماذا بداخله يا ترى؟"
      onClose={() => setFresh(null)}
    >
      <View style={{ width: "100%", flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 8 }}>
        <KidsArt emoji="🎉" size={44} />
        <KidsArt emoji="🎁" size={72} />
      </View>
      <KidsButton
        tone="rose"
        icon={Gift}
        onPress={() => {
          setFresh(null);
          go("/kids/rewards");
        }}
      >
        افتح الصندوق
      </KidsButton>
      <KidsButton tone="white" onPress={() => setFresh(null)}>
        لاحقًا
      </KidsButton>
    </Celebration>
  );
}
