import { Image } from "expo-image";
import Storage from "expo-sqlite/kv-store";
import { ExternalLink, HandHeart } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Pager } from "@/components/ui/Pager";
import { supabase } from "@/lib/supabase";
import { useTextScale } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

import { dayKey, liveSponsors, parseSponsorCache, type SponsorItem } from "./SponsorRotation";

const CACHE_KEY = "al-manara:sponsors:v1";
const INTERVAL_MS = 5000;

function readCache(): SponsorItem[] {
  try {
    return liveSponsors(parseSponsorCache(Storage.getItemSync(CACHE_KEY)), dayKey(new Date()));
  } catch {
    return [];
  }
}

function writeCache(sponsors: SponsorItem[]) {
  try {
    if (sponsors.length) Storage.setItemSync(CACHE_KEY, JSON.stringify(sponsors));
    else Storage.removeItemSync(CACHE_KEY);
  } catch {
    // The next launch just waits for the network.
  }
}

/** The running sponsors: the last list straight away (also offline), then a fresh one from Supabase. */
function useSponsors(): SponsorItem[] {
  const [sponsors, setSponsors] = useState<SponsorItem[]>(readCache);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("sponsors")
        .select("id, name, message, link_url, logo_url, starts_on, ends_on")
        .order("starts_on", { ascending: false })
        .limit(5);
      // A failed request keeps what is cached; a successful empty one means the campaigns ended.
      if (cancelled || error || !data) return;
      const live = liveSponsors(data, dayKey(new Date()));
      writeCache(live);
      setSponsors(live);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return sponsors;
}

function openLink(url: string) {
  Linking.openURL(url).catch(() => {});
}

/** Height of the sponsor's image band at the top of the card. */
const IMAGE_HEIGHT = 170;

/**
 * One sponsor: the image across the top (shown whole, never cropped), then the full name, the message,
 * and a button when it links somewhere.
 */
function SponsorSlide({ sponsor, height }: { sponsor: SponsorItem; height?: number }) {
  const accent = useThemeColor("accent-strong");
  const link = sponsor.link_url;
  return (
    <View
      style={height ? { height } : undefined}
      className={`${height ? "flex-1 " : ""}overflow-hidden rounded-3xl border border-border bg-surface shadow-card`}
    >
      <View className="items-center justify-center overflow-hidden bg-accent-soft" style={{ height: IMAGE_HEIGHT }}>
        {sponsor.logo_url ? (
          <>
            {/* A portrait photo left empty bands on both sides: the same image, blurred and filling the
                band, sits behind the uncropped one. */}
            <Image
              source={{ uri: sponsor.logo_url }}
              style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.55 }}
              contentFit="cover"
              blurRadius={24}
              accessible={false}
            />
            <Image
              source={{ uri: sponsor.logo_url }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              transition={200}
              accessibilityIgnoresInvertColors
              accessibilityLabel={sponsor.name}
            />
          </>
        ) : (
          <HandHeart size={56} color={accent} />
        )}
      </View>
      <View className="flex-1 gap-1.5 p-4">
        <Text className="font-sans-bold text-lg leading-8 text-fg" numberOfLines={2}>
          {sponsor.name}
        </Text>
        <Text className="font-sans text-sm leading-6 text-fg-muted" numberOfLines={height ? 2 : undefined}>
          {sponsor.message}
        </Text>
        {link ? (
          <View className="mt-auto pt-2">
            <Button
              size="sm"
              variant="gold"
              icon={ExternalLink}
              accessibilityLabel={`زيارة ${sponsor.name}`}
              onPress={() => openLink(link)}
            >
              زيارة الراعي
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Two or more sponsors: paged, auto-advancing every few seconds, paused while touched or out of view. */
function SponsorPager({ sponsors }: { sponsors: SponsorItem[] }) {
  const textScale = useTextScale();
  // Image band + two-line name + two-line message + the button, grown with the text size.
  const height = IMAGE_HEIGHT + Math.round(190 * Math.max(1, textScale));
  return (
    <Pager
      data={sponsors}
      keyExtractor={(sponsor) => sponsor.id}
      height={height}
      autoplayMs={INTERVAL_MS}
      loop
      dots="gold"
      renderItem={(sponsor) => <SponsorSlide sponsor={sponsor} height={height} />}
    />
  );
}

/**
 * The sponsors added from the website's admin (/admin/sponsors), on the home screen above the
 * sections. RLS returns only the ones running today; the last list is cached so it shows offline and
 * without a flash. Nothing renders when there are none. Never shown on Quran or kids screens.
 */
export function SponsorCarousel({ className }: { className?: string }) {
  const sponsors = useSponsors();
  if (!sponsors.length) return null;
  return (
    <View className={`gap-2 ${className ?? ""}`}>
      <Text className="font-sans-bold text-sm text-fg-muted">برعاية</Text>
      {sponsors.length === 1 ? <SponsorSlide sponsor={sponsors[0]} /> : <SponsorPager sponsors={sponsors} />}
    </View>
  );
}

/** The home screen's original name for this section. */
export const SponsorCard = SponsorCarousel;
