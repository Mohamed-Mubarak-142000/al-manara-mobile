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
