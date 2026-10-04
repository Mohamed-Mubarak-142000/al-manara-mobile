import { Image } from "expo-image";
import { Linking, Pressable, Text, View } from "react-native";

import { useAsync } from "@/features/hadith/useAsync";
import { supabase } from "@/lib/supabase";

interface Sponsor {
  id: string;
  name: string;
  message: string;
  link_url: string | null;
  logo_url: string | null;
}

function SponsorRow({ sponsor }: { sponsor: Sponsor }) {
  const card = (
    <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface p-4">
      {sponsor.logo_url ? (
        <Image source={{ uri: sponsor.logo_url }} style={{ width: 44, height: 44, borderRadius: 12 }} contentFit="contain" />
      ) : null}
      <View className="flex-1">
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

/**
 * The sponsors added from the website's admin (/admin/sponsors), as the last section of the home
 * screen. RLS returns only the ones running today; nothing renders when there are none or offline.
 * Never shown on Quran or kids screens.
 */
export function SponsorCard() {
  const { state } = useAsync("sponsors", async () => {
    if (!supabase) return null;
    const { data } = await supabase
      .from("sponsors")
      .select("id, name, message, link_url, logo_url")
      .order("starts_on", { ascending: false })
      .limit(5);
    return data?.length ? data : null;
  });
  if (state.status !== "ready") return null;

  return (
    <View className="gap-2">
      <Text className="font-sans-bold text-xs text-fg-muted">برعاية</Text>
      {state.data.map((sponsor) => (
        <SponsorRow key={sponsor.id} sponsor={sponsor} />
      ))}
    </View>
  );
}
