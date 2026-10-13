import { useLocalSearchParams } from "expo-router";

import { KidsStory } from "@/features/kids/stories/KidsStories";

/** The website's /kids/stories/[id]. */
export default function KidsStoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <KidsStory key={id} id={id} />;
}
