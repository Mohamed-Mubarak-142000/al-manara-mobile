import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { Button } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { useAsync } from "@/features/hadith/useAsync";
import { loadStories, markWatched } from "@/features/stories/storiesData";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * The website's StoryPlayer: the privacy-enhanced YouTube player, and "watched" recorded when the
 * video ends (the IFrame API reports state 0) or when the child taps "أنهيت القصة".
 */
function playerHtml(youtubeId: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#000;height:100%}#p{width:100%;height:100%}</style></head><body><div id="p"></div><script src="https://www.youtube.com/iframe_api"></script><script>function onYouTubeIframeAPIReady(){new YT.Player("p",{host:"https://www.youtube-nocookie.com",videoId:"${youtubeId}",playerVars:{rel:0,modestbranding:1,playsinline:1,hl:"ar"},events:{onStateChange:function(e){if(e.data===0&&window.ReactNativeWebView)window.ReactNativeWebView.postMessage("ended")}}})}</script></body></html>`;
}

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fg = useThemeColor("fg");
  const learnerId = activeLearnerId(useAccount());
  const { state } = useAsync(learnerId ?? "guest", () => (learnerId ? loadStories(learnerId) : Promise.resolve(null)));
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
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        hitSlop={12}
        className="mx-3 mb-2 flex-row items-center gap-1 self-start p-1"
      >
        <ChevronRight size={24} color={fg} />
        <Text className="font-sans-bold text-sm text-fg">كل القصص</Text>
      </Pressable>

      {state.status === "loading" ? (
        <StateMessage loading />
      ) : !story ? (
        <StateMessage message="لم نجد هذه القصة." />
      ) : (
        <View className="gap-4">
          <View style={{ width, height: (width * 9) / 16 }} className="bg-black">
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
              <Text className="mt-1 font-display-bold text-2xl text-fg">{story.title}</Text>
              {story.summary ? <Text className="mt-2 font-sans text-base leading-8 text-fg-muted">{story.summary}</Text> : null}
            </View>
            {story.lesson ? (
              <View className="flex-row gap-3 rounded-3xl border border-gold/40 bg-accent-soft p-4">
                <Lightbulb size={22} color={fg} />
                <Text className="flex-1 font-sans text-base leading-7 text-fg">
                  <Text className="font-sans-bold">ماذا تعلّمنا؟ </Text>
                  {story.lesson}
                </Text>
              </View>
            ) : null}
            {watched ? (
              <View className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary-soft py-3">
                <Check size={18} color={fg} />
                <Text className="font-sans-bold text-sm text-primary">أحسنت! شاهدت هذه القصة</Text>
              </View>
            ) : (
              <Button icon={Check} onPress={finish}>
                أنهيت القصة
              </Button>
            )}
            {next && (
              <Button
                variant="outline"
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
