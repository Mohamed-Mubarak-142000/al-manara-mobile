import { useEvent } from "expo";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import { Download, Share2, type LucideIcon } from "lucide-react-native";
import { memo, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { toArabicDigits } from "@/core/text/arabic";
import type { NafhaEmoji } from "@/lib/database.types";
import { useThemeColor } from "@/theme/useThemeColor";

import { NAFAHAT_EMOJIS, NAFAHAT_TITLE, type Nafha, type ReactionCounts } from "./nafahatApi";
import { saveNafhaMedia, shareNafha } from "./nafhaMedia";

const logo = require("@/assets/images/brand/logo.png");
const MEDIA_HEIGHT = 260;

const DATE = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

// Only one video plays at a time: starting one pauses the one before.
let playing: VideoPlayer | null = null;

function NafhaVideo({ uri }: { uri: string }) {
  const night = useThemeColor("emerald-night");
  const player = useVideoPlayer(uri, (created) => {
    created.loop = false;
  });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  useEffect(() => {
    if (!isPlaying) return;
    if (playing && playing !== player) {
      try {
        playing.pause();
      } catch {
        // Already released.
      }
    }
    playing = player;
  }, [isPlaying, player]);
  useEffect(
    () => () => {
      if (playing === player) playing = null;
    },
    [player],
  );
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      style={{ width: "100%", height: MEDIA_HEIGHT, backgroundColor: night }}
    />
  );
}

function ActionIcon({ icon: Icon, label, busy, onPress }: { icon: LucideIcon; label: string; busy: boolean; onPress: () => void }) {
  const fg = useThemeColor("fg");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      hitSlop={6}
      className="size-9 items-center justify-center rounded-full"
      style={({ pressed }) => ({ opacity: pressed || busy ? 0.6 : 1 })}
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : <Icon size={18} color={fg} />}
    </Pressable>
  );
}

interface NafhaBubbleProps {
  nafha: Nafha;
  counts: ReactionCounts;
  mine: NafhaEmoji | undefined;
  signedIn: boolean;
  onReact: (id: string, emoji: NafhaEmoji) => void;
  onNeedSignIn: () => void;
}

/** One post of the channel: a message bubble from the channel's logo, with reactions, share and save. */
export const NafhaBubble = memo(function NafhaBubble({ nafha, counts, mine, signedIn, onReact, onNeedSignIn }: NafhaBubbleProps) {
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 3000);
    return () => clearTimeout(id);
  }, [note]);

  async function share() {
    setBusy("share");
    try {
      await shareNafha(nafha);
    } catch {
      setNote("تعذّرت المشاركة، تأكد من الاتصال.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    try {
      const result = await saveNafhaMedia(nafha);
      if (result === "saved") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setNote(result === "saved" ? "تم الحفظ في معرض الصور ✓" : "اسمح للمنارة بحفظ الصور من الإعدادات.");
    } catch {
      setNote("تعذّر التنزيل، تأكد من الاتصال.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <View className="flex-row items-end gap-2.5">
      <View className="size-10 items-center justify-center rounded-full border-2 border-gold-soft bg-surface">
        <Image source={logo} style={{ width: 26, height: 26 }} contentFit="contain" accessible={false} />
      </View>
      <View className="flex-1 overflow-hidden rounded-3xl rounded-bl-md border border-border bg-surface shadow-card">
        {nafha.media_url && nafha.media_type === "image" ? (
          <Image
            source={{ uri: nafha.media_url }}
            style={{ width: "100%", height: MEDIA_HEIGHT }}
            className="bg-surface-alt"
            contentFit="contain"
            transition={200}
            accessibilityIgnoresInvertColors
            accessibilityLabel={nafha.title}
          />
        ) : null}
        {nafha.media_url && nafha.media_type === "video" ? <NafhaVideo uri={nafha.media_url} /> : null}

        <View className="px-4 pb-3 pt-3.5">
          <Text className="font-sans-bold text-xs text-accent-strong">{NAFAHAT_TITLE}</Text>
          <Text selectable className="mt-1 font-sans-bold text-lg leading-8 text-fg">
            {nafha.title}
          </Text>
          {nafha.body ? (
            <Text selectable className="mt-1.5 font-sans text-base leading-8 text-fg">
              {nafha.body}
            </Text>
          ) : null}
          <Text className="mt-1.5 text-left font-sans text-[11px] text-fg-muted">{DATE.format(new Date(nafha.created_at))}</Text>
        </View>

        <View className="border-t border-border bg-bg/60 px-3 py-2.5">
          <View className="flex-row flex-wrap items-center gap-1.5">
            {NAFAHAT_EMOJIS.map((emoji) => {
              const count = counts[emoji.id] ?? 0;
              const active = mine === emoji.id;
              return (
                <Pressable
                  key={emoji.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${emoji.label}${count ? ` (${count})` : ""}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    if (!signedIn) return onNeedSignIn();
                    Haptics.selectionAsync().catch(() => {});
                    onReact(nafha.id, emoji.id);
                  }}
                  className={`h-9 flex-row items-center gap-1 rounded-full border px-2.5 ${
                    active ? "border-gold bg-accent-soft" : "border-border bg-surface"
                  }`}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}
                >
                  <Text className="text-base">{emoji.char}</Text>
                  {count > 0 ? (
                    <Text className={`font-sans-bold text-xs ${active ? "text-accent-strong" : "text-fg"}`}>{toArabicDigits(count)}</Text>
                  ) : null}
                </Pressable>
              );
            })}
            <View className="ms-auto flex-row items-center">
              <ActionIcon icon={Share2} label="مشاركة" busy={busy === "share"} onPress={share} />
              {nafha.media_url ? (
                <ActionIcon
                  icon={Download}
                  label={nafha.media_type === "video" ? "تنزيل الفيديو" : "تنزيل الصورة"}
                  busy={busy === "save"}
                  onPress={save}
                />
              ) : null}
            </View>
          </View>
          {note ? (
            <Text accessibilityLiveRegion="polite" className="mt-2 font-sans-bold text-xs text-primary">
              {note}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});
