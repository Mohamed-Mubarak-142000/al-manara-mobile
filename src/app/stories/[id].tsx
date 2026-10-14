import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronLeft, Lightbulb } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { useAsync } from "@/features/hadith/useAsync";
import { loadStories, markWatched, playerHtml } from "@/features/stories/storiesData";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const { width } = useWindowDimensions();
  const primary = useThemeColor("primary");
  const accent = useThemeColor("accent-strong");
  const learnerId = activeLearnerId(useAccount());
  const { state, reload } = useAsync(learnerId ?? "guest", () => (learnerId ? loadStories(learnerId) : Promise.resolve(null)));
  const [justWatched, setJustWatched] = useState(false);

  const stories = state.status === "ready" ? state.data.stories : [];
  const index = stories.findIndex((story) => story.id === id);
  const story = stories[index];
  const next = index >= 0 ? stories[index + 1] : undefined;
  const watched = justWatched || (state.status === "ready" && state.data.watched.has(id));

  async function finish() {
    if (!learnerId || !story || watched) return;
    if (await markWatched(learnerId, story.id)) setJustWatched(true);
  }

  function onMessage(event: WebViewMessageEvent) {
    if (event.nativeEvent.data === "ended") finish();
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <ScreenHeader title="كل القصص" subtitle={story?.prophet ?? undefined} />

      {state.status === "loading" ? (
        <StateMessage loading />
      ) : !learnerId ? (
        <StateMessage
          message="القصص متاحة بعد تسجيل الدخول، لنحفظ ما شاهدته."
          actionLabel="تسجيل الدخول"
          onAction={() => router.push("/login")}
        />
      ) : state.status === "error" ? (
        <StateMessage message="تعذّر تحميل القصة الآن، حاول بعد قليل." onRetry={reload} />
      ) : !story ? (
        <StateMessage message="لم نجد هذه القصة." />
      ) : (
        <View className="gap-4 pt-1">
          <View style={{ width: width - 32, height: ((width - 32) * 9) / 16 }} className="mx-4 overflow-hidden rounded-3xl bg-black">
            <WebView
              source={{ html: playerHtml(story.youtube_id), baseUrl: "https://www.youtube-nocookie.com" }}
              onMessage={onMessage}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              style={{ backgroundColor: "#000" }}
            />
          </View>
          <View className="gap-4 px-4">
            <View>
              <Text className="font-sans-bold text-sm text-accent-strong">{story.prophet ?? "القصص"}</Text>
              <Text className="mt-1 font-sans-bold text-2xl leading-10 text-fg">{story.title}</Text>
              {story.summary ? <Text className="mt-2 font-sans text-base leading-8 text-fg-muted">{story.summary}</Text> : null}
            </View>
            {story.lesson ? (
              <View className="flex-row gap-3 rounded-3xl border border-accent/40 bg-accent-soft p-4">
                <Lightbulb size={22} color={accent} />
                <Text className="flex-1 font-sans text-base leading-7 text-fg">
                  <Text className="font-sans-bold">ماذا تعلّمنا؟ </Text>
                  {story.lesson}
                </Text>
              </View>
            ) : null}
            {watched ? (
              <View className="h-13 flex-row items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft">
                <Check size={18} color={primary} />
                <Text className="font-sans-bold text-sm text-primary">أحسنت! شاهدت هذه القصة</Text>
              </View>
            ) : (
              <Button size="lg" icon={Check} onPress={finish}>
                أنهيت القصة
              </Button>
            )}
            {next && (
              <Button
                variant="secondary"
                size="lg"
                icon={ChevronLeft}
                onPress={() => router.replace({ pathname: "/stories/[id]", params: { id: next.id } })}
              >
                القصة التالية
              </Button>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
