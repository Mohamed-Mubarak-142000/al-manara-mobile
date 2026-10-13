import { supabase } from "@/lib/supabase";

/** The website's features/kids/stories/data.ts: published stories in order, and which the learner watched. */
export interface Story {
  id: string;
  title: string;
  prophet: string | null;
  youtube_id: string;
  summary: string;
  lesson: string;
}

export async function loadStories(learnerId: string): Promise<{ stories: Story[]; watched: Set<string> } | null> {
  if (!supabase) return null;
  const [{ data: stories, error }, { data: views }] = await Promise.all([
    supabase
      .from("kids_stories")
      .select("id, title, prophet, youtube_id, summary, lesson")
      .eq("published", true)
      .order("sort_order")
      .order("created_at"),
    supabase.from("story_views").select("story_id").eq("learner_id", learnerId),
  ]);
  if (error) return null;
  return { stories: stories ?? [], watched: new Set((views ?? []).map((view) => view.story_id)) };
}

export async function markWatched(learnerId: string, storyId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("story_views")
    .upsert({ learner_id: learnerId, story_id: storyId, watched_at: new Date().toISOString() }, { onConflict: "learner_id,story_id" });
  return !error;
}

export function thumbnail(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/**
 * The website's StoryPlayer: the privacy-enhanced YouTube player, and "watched" recorded when the
 * video ends (the IFrame API reports state 0) or when the child taps "أنهيت القصة".
 */
export function playerHtml(youtubeId: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#000;height:100%}#p{width:100%;height:100%}</style></head><body><div id="p"></div><script src="https://www.youtube.com/iframe_api"></script><script>function onYouTubeIframeAPIReady(){new YT.Player("p",{host:"https://www.youtube-nocookie.com",videoId:"${youtubeId}",playerVars:{rel:0,modestbranding:1,playsinline:1,hl:"ar"},events:{onStateChange:function(e){if(e.data===0&&window.ReactNativeWebView)window.ReactNativeWebView.postMessage("ended")}}})}</script></body></html>`;
}
