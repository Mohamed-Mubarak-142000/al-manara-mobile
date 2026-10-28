import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from "expo-audio";
import { Mic, Pause, Play, Square, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { audio as appAudio, getPlayerState } from "@/features/audio/playerStore";

import { kidsAudio } from "./kidsAudio";
import { KidsButton } from "./ui/KidsButton";
import { KidsText } from "./ui/KidsPanel";
import { KIDS } from "./ui/kidsStyles";

type RecordingStatus = "idle" | "recording" | "recorded" | "denied" | "unsupported";

/** Back to playback through the speaker once the microphone is no longer needed (iOS routes to the earpiece while recording is allowed). */
function playbackMode() {
  return setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
}

/**
 * The website's ReciteRecorder: "listen to yourself next to the reciter". The recording stays on this
 * device in the app's cache and is never uploaded or saved to the account.
 */
export function ReciteRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [uri, setUri] = useState<string | null>(null);

  useEffect(
    () => () => {
      void playbackMode();
    },
    [],
  );

  async function start() {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setStatus("denied");
        return;
      }
      if (getPlayerState().playing) appAudio.toggle();
      kidsAudio.pause();
      player.pause();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus("recording");
    } catch {
      setStatus("unsupported");
      void playbackMode();
    }
  }

  async function stop() {
    try {
      await recorder.stop();
    } catch {
      // Whatever was recorded is still there.
    }
    await playbackMode();
    setUri(recorder.uri);
    if (recorder.uri) player.replace({ uri: recorder.uri });
    setStatus(recorder.uri ? "recorded" : "idle");
  }

  function discard() {
    player.pause();
    setUri(null);
    setStatus("idle");
  }

  return (
    <View className="items-center gap-3">
      {(status === "idle" || status === "denied" || status === "unsupported") && (
        <KidsButton tone="white" icon={Mic} onPress={start}>
          سجّل صوتك
        </KidsButton>
      )}
      {status === "recording" && (
        <KidsButton tone="rose" icon={Square} iconFilled onPress={stop}>
          أوقف التسجيل
        </KidsButton>
      )}
      {status === "recorded" && uri && (
        <View
          style={{ width: "100%", maxWidth: 420, alignItems: "center", gap: 8, borderRadius: 24, backgroundColor: KIDS.cream, padding: 12 }}
        >
          <KidsText size={14} bold style={{ color: KIDS.honey }}>
            اسمع صوتك
          </KidsText>
          <KidsButton
            tone="gold"
            size="sm"
            icon={playerStatus.playing ? Pause : Play}
            iconFilled
            onPress={() => {
              if (playerStatus.playing) player.pause();
              else {
                if (playerStatus.didJustFinish || (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration - 0.1))
                  void player.seekTo(0);
                kidsAudio.pause();
                player.play();
              }
            }}
          >
            {playerStatus.playing ? "إيقاف" : "تشغيل"}
          </KidsButton>
          <Pressable accessibilityRole="button" onPress={discard} className="flex-row items-center gap-1.5">
            <Trash2 size={16} color={KIDS.muted} />
            <KidsText size={14} bold tone="muted">
              امسح وسجّل مرة أخرى
            </KidsText>
          </Pressable>
        </View>
      )}
      {status === "denied" && (
        <KidsText size={14} tone="muted" center>
          نحتاج إذن الميكروفون لنسجّل صوتك — اطلب من أحد والديك السماح به.
        </KidsText>
      )}
      {status === "unsupported" && (
        <KidsText size={14} tone="muted" center>
          تعذّر تسجيل الصوت على هذا الجهاز.
        </KidsText>
      )}
    </View>
  );
}
