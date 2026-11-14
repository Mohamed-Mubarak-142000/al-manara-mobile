import { useEvent } from "expo";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import { Download, Share2, SmilePlus, type LucideIcon } from "lucide-react-native";
import { memo, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { toArabicDigits } from "@/core/text/arabic";
import type { NafhaEmoji } from "@/lib/database.types";
import { useThemeColor } from "@/theme/useThemeColor";

import { NAFAHAT_EMOJIS, NAFAHAT_TITLE, type Nafha, type ReactionCounts } from "./nafahatApi";
import { saveNafhaMedia, shareNafha } from "./nafhaMedia";

const MEDIA_HEIGHT = 240;
const TIME = new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" });
const CHAR = Object.fromEntries(NAFAHAT_EMOJIS.map((emoji) => [emoji.id, emoji.char])) as Record<NafhaEmoji, string>;

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
      style={{ width: "100%", height: MEDIA_HEIGHT, borderRadius: 12, backgroundColor: night }}
    />
  );
}

/** The bubble's tail at its top start corner (the right, in this RTL app). */
function Tail({ color }: { color: string }) {
  return (
    <Svg width={8} height={13} viewBox="0 0 8 13" style={{ position: "absolute", top: 0, start: -7 }}>
      <Path d="M8 0H0v13C1.5 8 4.5 3.5 8 1.2z" fill={color} />
    </Svg>
  );
}

function SideButton({
  icon: Icon,
  label,
  busy = false,
  onPress,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  busy?: boolean;
  onPress: () => void;
  children?: ReactNode;
}) {
  const muted = useThemeColor("fg-muted");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      hitSlop={6}
      className="size-9 items-center justify-center rounded-full bg-surface/85"
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}
    >
      {busy ? <ActivityIndicator size="small" color={muted} /> : (children ?? (Icon ? <Icon size={17} color={muted} /> : null))}
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

/**
 * One post as an incoming chat message, WhatsApp-style: a bubble with a tail, the media inside a thin frame,
 * the time at the bottom end, the reactions in a pill under it, and react/share/save beside it.
 */
export const NafhaBubble = memo(function NafhaBubble({ nafha, counts, mine, signedIn, onReact, onNeedSignIn }: NafhaBubbleProps) {
  const surface = useThemeColor("surface");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const used = NAFAHAT_EMOJIS.filter((emoji) => (counts[emoji.id] ?? 0) > 0);
  const total = used.reduce((sum, emoji) => sum + (counts[emoji.id] ?? 0), 0);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), 3000);
    return () => clearTimeout(id);
  }, [note]);

  function openPicker() {
    if (!signedIn) return onNeedSignIn();
    Haptics.selectionAsync().catch(() => {});
    setPicking((value) => !value);
  }

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
    <View className="items-start">
      <View className="max-w-[88%] flex-row items-center gap-2">
        <View className="shrink">
          {picking ? (
            <Animated.View
              entering={ZoomIn.springify().damping(16)}
              exiting={ZoomOut.duration(120)}
              className="absolute -top-14 start-0 z-10 flex-row gap-0.5 rounded-full bg-surface p-1.5 shadow-card"
              style={{ elevation: 6 }}
            >
              {NAFAHAT_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji.id}
                  accessibilityRole="button"
                  accessibilityLabel={emoji.label}
                  accessibilityState={{ selected: mine === emoji.id }}
                  onPress={() => {
                    setPicking(false);
                    onReact(nafha.id, emoji.id);
                  }}
                  className={`size-10 items-center justify-center rounded-full ${mine === emoji.id ? "bg-primary-soft" : ""}`}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 1.25 : 1 }] })}
                >
                  <Text className="text-2xl">{emoji.char}</Text>
                </Pressable>
              ))}
            </Animated.View>
          ) : null}

          <Pressable onLongPress={openPicker} delayLongPress={300} accessibilityHint="اضغط مطولًا للتفاعل">
            <View className="rounded-2xl bg-surface p-1 shadow-card" style={{ borderTopStartRadius: 0 }}>
              <Tail color={surface} />
              {nafha.media_url && nafha.media_type === "image" ? (
                <Image
                  source={{ uri: nafha.media_url }}
                  style={{ width: "100%", minWidth: 230, height: MEDIA_HEIGHT, borderRadius: 12 }}
                  className="bg-surface-alt"
                  contentFit="cover"
                  transition={200}
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={nafha.title}
                />
              ) : null}
              {nafha.media_url && nafha.media_type === "video" ? (
                <View style={{ minWidth: 250 }}>
                  <NafhaVideo uri={nafha.media_url} />
                </View>
              ) : null}
              <View className="px-2 pb-0.5 pt-1.5">
                <Text className="font-sans-bold text-xs text-accent-strong">{NAFAHAT_TITLE}</Text>
                <Text selectable className="mt-0.5 font-sans-bold text-base leading-7 text-fg">
                  {nafha.title}
                </Text>
                {nafha.body ? (
                  <Text selectable className="mt-0.5 font-sans text-[15px] leading-7 text-fg">
                    {nafha.body}
                  </Text>
                ) : null}
                <Text className="mt-0.5 self-end font-sans text-[11px] text-fg-muted">{TIME.format(new Date(nafha.created_at))}</Text>
              </View>
            </View>
          </Pressable>

          {total > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`التفاعلات (${total})`}
              onPress={openPicker}
              className={`-mt-1.5 ms-2 h-7 flex-row items-center gap-1 self-start rounded-full border bg-surface px-2 ${
                mine ? "border-gold" : "border-border"
              }`}
            >
              <Text className="text-sm">
                {used
                  .slice(0, 3)
                  .map((emoji) => emoji.char)
                  .join("")}
              </Text>
              <Text className="font-sans-bold text-xs text-fg-muted">{toArabicDigits(total)}</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="gap-1.5">
          <SideButton label={mine ? `تفاعلك ${CHAR[mine]}، غيّره` : "تفاعل"} onPress={openPicker} icon={mine ? undefined : SmilePlus}>
            {mine ? <Text className="text-base">{CHAR[mine]}</Text> : undefined}
          </SideButton>
          <SideButton icon={Share2} label="مشاركة" busy={busy === "share"} onPress={share} />
          {nafha.media_url ? (
            <SideButton
              icon={Download}
              label={nafha.media_type === "video" ? "تنزيل الفيديو" : "تنزيل الصورة"}
              busy={busy === "save"}
              onPress={save}
            />
          ) : null}
        </View>
      </View>

      {note ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} className="mt-1.5 rounded-full bg-surface px-3 py-1">
          <Text accessibilityLiveRegion="polite" className="font-sans-bold text-xs text-primary">
            {note}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
});
