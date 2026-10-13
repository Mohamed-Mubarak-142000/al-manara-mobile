import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { ArrowLeft, ArrowRight, CheckCircle2, Clapperboard, Lightbulb } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, View, useWindowDimensions } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { toArabicDigits } from "@/core/text/arabic";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { loadStories, markWatched, playerHtml, thumbnail, type Story } from "@/features/stories/storiesData";

import { sfx } from "../sfx";
import { useLoad } from "../useLoad";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, KidsTitlePanel } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { useKidsBottomPad } from "../ui/KidsShell";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";

type Loaded = { stories: Story[]; watched: Set<string> } | null;

/** The child's stories and what they watched (the same rows as the app's and the website's /stories). */
function useStories(learnerId: string | null) {
  const [version, setVersion] = useState(0);
  const state = useLoad<Loaded>(`${learnerId}:${version}`, () => (learnerId ? loadStories(learnerId) : Promise.resolve(null)), null);
  return { state, reload: () => setVersion((value) => value + 1) };
}

function progressLine(stories: Story[], watched: Set<string>): string {
  if (stories.length === 0) return "القصص في الطريق إليك قريبًا بإذن الله.";
  const count = stories.filter((story) => watched.has(story.id)).length;
  return `شاهدت ${toArabicDigits(count)} من ${toArabicDigits(stories.length)} قصة — اختر قصتك!`;
}

/** The website's /kids/stories: the prophets' stories as big cards. */
export function KidsStories() {
  const learnerId = activeLearnerId(useAccount());
  const { state, reload } = useStories(learnerId);
  const bottom = useKidsBottomPad();
  const data = state.status === "ready" ? state.data : null;

  return (
    <FlashList
      data={data?.stories ?? []}
      keyExtractor={(story) => story.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: bottom }}
      ListHeaderComponent={
        <View style={{ marginBottom: 20 }}>
          <KidsTitlePanel
            icon={<Clapperboard size={48} color={KIDS.violet} />}
            title="قصص الأنبياء"
            subtitle={data ? progressLine(data.stories, data.watched) : state.status === "loading" ? undefined : "تعذّر تحميل القصص الآن."}
          />
          {state.status === "loading" && <ActivityIndicator color={KIDS.white} size="large" style={{ marginTop: 24 }} />}
          {state.status === "ready" && !data && (
            <KidsButton tone="emerald" className="mt-4 self-center" onPress={reload}>
              حاول مرة أخرى
            </KidsButton>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const watched = data?.watched.has(item.id) ?? false;
        return (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={item.title}
            onPress={() => go(`/kids/stories/${item.id}`)}
            style={({ pressed }) => [
              { marginBottom: 20, borderRadius: 32, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 4, borderColor: "rgba(255,255,255,0.6)", transform: [{ translateY: pressed ? -3 : 0 }] },
              PANEL_SHADOW,
            ]}
          >
            <View style={{ aspectRatio: 16 / 9, backgroundColor: KIDS.mist }}>
              <Image source={{ uri: thumbnail(item.youtube_id) }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
              {watched && (
                <View
                  style={{
                    position: "absolute",
                    top: 12,
                    end: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    borderRadius: 999,
                    backgroundColor: KIDS.emerald,
                    paddingHorizontal: 12,
                    paddingVertical: 2,
                  }}
                >
                  <CheckCircle2 size={16} color={KIDS.white} />
                  <KidsText size={14} bold tone="white">
                    شاهدتها
                  </KidsText>
                </View>
              )}
            </View>
            <View style={{ padding: 14, alignItems: "center" }}>
              {item.prophet ? (
                <KidsText size={14} bold style={{ color: KIDS.violet }}>
                  {item.prophet}
                </KidsText>
              ) : null}
              <KidsText size={20} bold center>
                {item.title}
              </KidsText>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

/** The website's /kids/stories/[id]: the player, the story's lesson, and the next story. */
export function KidsStory({ id }: { id: string }) {
  const learnerId = activeLearnerId(useAccount());
  const { state, reload } = useStories(learnerId);
  const { width } = useWindowDimensions();
  const [justWatched, setJustWatched] = useState(false);
  const [saving, setSaving] = useState(false);
  const stories = state.status === "ready" ? (state.data?.stories ?? []) : [];
  const index = stories.findIndex((story) => story.id === id);
  const story = stories[index];
  const next = index >= 0 ? (stories[index + 1] ?? null) : null;
  const watched = justWatched || (state.status === "ready" && !!state.data?.watched.has(id));

  async function finish() {
    if (!learnerId || !story || watched || saving) return;
    setSaving(true);
    setJustWatched(true);
    sfx.correct();
    if (!(await markWatched(learnerId, story.id))) setJustWatched(false);
    setSaving(false);
  }

  function onMessage(event: WebViewMessageEvent) {
    if (event.nativeEvent.data === "ended") void finish();
  }

  if (state.status === "loading") return <ActivityIndicator color={KIDS.white} size="large" style={{ marginTop: 40 }} />;
  if (!story)
    return (
      <KidsScroll>
        <KidsPanel className="items-center">
          <KidsText size={20} bold center>
            {state.data ? "لم نجد هذه القصة." : "تعذّر تحميل القصة الآن."}
          </KidsText>
          <KidsButton tone="emerald" className="mt-4" onPress={state.data ? () => go("/kids/stories") : reload}>
            {state.data ? "كل القصص" : "حاول مرة أخرى"}
          </KidsButton>
        </KidsPanel>
      </KidsScroll>
    );

  const playerWidth = width - 24;
  return (
    <KidsScroll>
      <View className="items-center">
        {story.prophet ? (
          <KidsText size={17} bold tone="white" center>
            {story.prophet}
          </KidsText>
        ) : null}
        <KidsText size={28} bold tone="white" center style={{ textShadowColor: "rgba(0,40,30,0.5)", textShadowRadius: 4 }}>
          {story.title}
        </KidsText>
      </View>
      <View style={[{ borderRadius: 32, overflow: "hidden", backgroundColor: KIDS.black, borderWidth: 4, borderColor: "rgba(255,255,255,0.7)" }, PANEL_SHADOW]}>
        <View style={{ width: playerWidth - 8, height: ((playerWidth - 8) * 9) / 16 }}>
          <WebView
            source={{ html: playerHtml(story.youtube_id), baseUrl: "https://www.youtube-nocookie.com" }}
            onMessage={onMessage}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            style={{ backgroundColor: KIDS.black }}
          />
        </View>
      </View>
      <View className="items-center">
        {watched ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, backgroundColor: KIDS.watched, paddingHorizontal: 20, paddingVertical: 8 }}>
            <CheckCircle2 size={24} color={KIDS.emeraldShadow} />
            <KidsText size={18} bold style={{ color: KIDS.emeraldShadow }}>
              أحسنت! شاهدت هذه القصة
            </KidsText>
          </View>
        ) : (
          <KidsButton tone="emerald" icon={CheckCircle2} disabled={saving} onPress={finish}>
            أنهيت القصة
          </KidsButton>
        )}
      </View>
      {(story.summary || story.lesson) && (
        <KidsPanel style={{ gap: 16 }}>
          {story.summary ? (
            <KidsText size={17} style={{ lineHeight: 34, color: KIDS.siteInk }}>
              {story.summary}
            </KidsText>
          ) : null}
          {story.lesson ? (
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 24, backgroundColor: KIDS.cream, padding: 14 }}>
              <Lightbulb size={24} color={KIDS.starStroke} />
              <KidsText size={17} bold style={{ flex: 1, color: KIDS.lessonInk }}>
                ماذا تعلّمنا؟ {story.lesson}
              </KidsText>
            </View>
          ) : null}
        </KidsPanel>
      )}
      <View className="flex-row flex-wrap justify-center gap-3">
        <KidsButton tone="white" icon={ArrowRight} onPress={() => go("/kids/stories")}>
          كل القصص
        </KidsButton>
        {next && (
          <KidsButton tone="violet" icon={ArrowLeft} onPress={() => go(`/kids/stories/${next.id}`)}>
            القصة التالية
          </KidsButton>
        )}
      </View>
    </KidsScroll>
  );
}
