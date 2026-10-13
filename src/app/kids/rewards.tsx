import { useLocalSearchParams } from "expo-router";

import { RewardsView, type RewardsTab } from "@/features/kids/rewards/RewardsView";

const TABS: RewardsTab[] = ["chests", "badges", "shop"];

/** The website's /kids/rewards (?tab=chests|badges|shop): chests, badges and the shop. */
export default function KidsRewardsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initialTab = TABS.find((entry) => entry === tab) ?? "chests";
  return <RewardsView key={initialTab} initialTab={initialTab} />;
}
