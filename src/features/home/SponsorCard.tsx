import { Image } from "expo-image";
import { Linking, Pressable, Text, View } from "react-native";

import { useAsync } from "@/features/hadith/useAsync";
import { supabase } from "@/lib/supabase";

/**
 * One hand-picked sponsor on the home screen (the sponsors table; RLS only returns running ones).
 * Never on Quran or kids screens; nothing renders when no sponsor is running or offline.
 */
export function SponsorCard() {
  const { state } = useAsync("sponsor", async () => {
    if (!supabase) return null;
    const { data } = await supabase
      .from("sponsors")
      .select("name, message, link_url, logo_url")
      .order("starts_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });
  if (state.status !== "ready") return null;
  const sponsor = state.data;

  const card = (
    <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface p-4">
      {sponsor.logo_url ? (
        <Image source={{ uri: sponsor.logo_url }} style={{ width: 44, height: 44, borderRadius: 12 }} contentFit="contain" />
      ) : null}
      <View className="flex-1">
        <Text className="font-sans text-[11px] text-fg-muted">برعاية</Text>
        <Text className="font-display-bold text-base text-fg">{sponsor.name}</Text>
        <Text className="font-sans text-xs leading-5 text-fg-muted">{sponsor.message}</Text>
      </View>
    </View>
  );

  return sponsor.link_url ? (
    <Pressable accessibilityRole="link" accessibilityLabel={`برعاية ${sponsor.name}`} onPress={() => Linking.openURL(sponsor.link_url!)}>
      {card}
    </Pressable>
  ) : (
    card
  );
}
