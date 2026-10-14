import { Image } from "expo-image";
import { router } from "expo-router";
import { Check, Clapperboard, Lock, Play } from "lucide-react-native";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { useAsync } from "@/features/hadith/useAsync";
import { loadStories, thumbnail } from "@/features/stories/storiesData";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

/** The website's /stories: illustrated prophets' stories for signed-in learners, with what was watched. */
export default function StoriesScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const heroFg = useThemeColor("hero-fg");
  const onPrimary = useThemeColor("on-primary");
  const primary = useThemeColor("primary");
  const accent = useThemeColor("accent");
  const learnerId = activeLearnerId(useAccount());
  const { state, reload } = useAsync(learnerId ?? "guest", () => (learnerId ? loadStories(learnerId) : Promise.resolve(null)));
  const data = state.status === "ready" ? state.data : null;
  const watchedCount = data ? data.stories.filter((story) => data.watched.has(story.id)).length : 0;

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={data?.stories ?? []}
      keyExtractor={(story) => story.id}
      refreshControl={learnerId ? <RefreshControl refreshing={false} onRefresh={reload} tintColor={accent} colors={[accent]} /> : undefined}
      contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32, gap: 12 }}
      ListHeaderComponent={
        <PageHeader
          back
          icon={Clapperboard}
          kicker="القصص"
          title="قصص الأنبياء"
          description={
            data && data.stories.length > 0
              ? `شاهدت ${toArabicDigits(watchedCount)} من ${toArabicDigits(data.stories.length)} قصة — اختر قصتك!`
              : undefined
          }
        />
      }
      ListEmptyComponent={
        !learnerId ? (
          <View className="mx-4 items-center rounded-3xl border border-border bg-surface p-6">
            <Lock size={28} color={primary} />
            <Text className="mt-3 text-center font-sans text-base leading-7 text-fg">القصص متاحة بعد تسجيل الدخول، لنحفظ ما شاهدته.</Text>
            <Button className="mt-4" onPress={() => router.push("/login")}>
              تسجيل الدخول
            </Button>
          </View>
        ) : state.status === "loading" ? (
          <StateMessage loading />
        ) : state.status === "error" ? (
          <StateMessage message="تعذّر تحميل القصص الآن، حاول بعد قليل." onRetry={reload} />
        ) : (
          <StateMessage message="القصص في الطريق إليك قريبًا بإذن الله." />
        )
      }
      renderItem={({ item }) => {
        const watched = data?.watched.has(item.id) ?? false;
        return (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/stories/[id]", params: { id: item.id } })}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
            className="mx-4"
          >
            <View className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
              <View>
                <Image source={{ uri: thumbnail(item.youtube_id) }} style={{ width: "100%", aspectRatio: 16 / 9 }} contentFit="cover" />
                <View className="absolute inset-0 items-center justify-center">
                  <View className="size-14 items-center justify-center rounded-full bg-black/45">
                    <Play size={26} color={heroFg} fill={heroFg} />
                  </View>
                </View>
                {watched && (
                  <View className="absolute end-3 top-3 flex-row items-center gap-1 rounded-full bg-primary px-2.5 py-1">
                    <Check size={13} color={onPrimary} />
                    <Text className="font-sans-bold text-xs text-on-primary">شاهدتها</Text>
                  </View>
                )}
              </View>
              <View className="gap-1 p-4">
                {item.prophet ? <Text className="font-sans-bold text-xs text-accent-strong">{item.prophet}</Text> : null}
                <Text className="font-sans-bold text-base text-fg">{item.title}</Text>
                {item.summary ? (
                  <Text className="font-sans text-sm leading-6 text-fg-muted" numberOfLines={2}>
                    {item.summary}
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
