import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { Mic, MicOff, SkipForward, ThumbsUp, Volume2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";

import { splitAyahWords } from "@/core/kids/games/arrangeGameLogic";
import { buildExpected, matchChunk, matchPreview } from "@/core/tasmee/recitation";
import { toArabicDigits } from "@/core/text/arabic";
import { activeLearnerIdNow } from "@/features/account/accountStore";
import { useSpeech } from "@/features/tasmee/useSpeech";
import { supabase } from "@/lib/supabase";

import { useCompanion } from "../companion/companionStore";
import { kidsAudio } from "../kidsAudio";
import { husaryAyah, kidsAyahs, kidsSurah } from "../kidsData";
import { useKidsProgress } from "../progress/progressStore";
import { ReciteRecorder } from "../ReciteRecorder";
import { sfx } from "../sfx";
import { Celebration } from "../ui/Celebration";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText, QuranText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";

/** Good enough for the mission step: at least this share of the recited ayahs went well. */
const PASS_SHARE = 0.7;
/** After this many ayahs a child may finish early (long surahs like An-Naba). */
const MIN_AYAHS_TO_FINISH = 3;

type Verdict = "excellent" | "good" | "again";

const VERDICTS: Record<Verdict, { emoji: string; title: string; stars: number }> = {
  excellent: { emoji: "⭐", title: "ممتاز!", stars: 3 },
  good: { emoji: "👏", title: "أحسنت!", stars: 2 },
  again: { emoji: "🔄", title: "نسمعها مرة كمان سوا؟", stars: 1 },
};

function verdictFor(slips: number): Verdict {
  return slips === 0 ? "excellent" : slips <= 1 ? "good" : "again";
}

function speechAvailable(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

function Word({ word, heard }: { word: string; heard: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (heard) scale.value = withSequence(withTiming(1.12, { duration: 170 }), withTiming(1, { duration: 180 }));
  }, [heard, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <QuranText size={30} color={heard ? KIDS.emeraldShadow : KIDS.wordInk}>
        {word}
      </QuranText>
    </Animated.View>
  );
}

function MicButton({ listening, onPress }: { listening: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = listening ? withRepeat(withSequence(withTiming(1.1, { duration: 600 }), withTiming(1, { duration: 600 })), -1) : withTiming(1);
  }, [listening, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? "إيقاف الاستماع" : "ابدأ التسميع"}
        onPress={onPress}
        style={{
          width: 112,
          height: 112,
          borderRadius: 56,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: listening ? KIDS.rose : KIDS.emerald,
          borderBottomWidth: 8,
          borderBottomColor: listening ? KIDS.roseShadow : KIDS.emeraldShadow,
        }}
      >
        {listening ? <MicOff size={48} color={KIDS.white} /> : <Mic size={48} color={KIDS.white} />}
      </Pressable>
    </Animated.View>
  );
}

export function KidsRecite({ surahId }: { surahId: number }) {
  const surah = kidsSurah(surahId);
  const ayahs = kidsAyahs(surahId);
  const [available] = useState(speechAvailable);
  const { recordGame } = useKidsProgress();
  const { react, setMood } = useCompanion();
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState(0);
  const [preview, setPreview] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [results, setResults] = useState<Verdict[]>([]);
  const [finished, setFinished] = useState(false);
  const posRef = useRef(0);
  const slipsRef = useRef(0);
  const verdictRef = useRef<Verdict | null>(null);

  const ayah = ayahs[index];
  const words = ayah ? splitAyahWords(ayah.text) : [];
  const expected = buildExpected([words]);

  const speech = useSpeech({
    onInterim: (text) => setPreview(text ? matchPreview(expected, text, posRef.current) : posRef.current),
    onFinal: (text) => {
      if (verdictRef.current) return;
      const result = matchChunk(expected, text, posRef.current);
      posRef.current = result.pos;
      setPos(result.pos);
      setPreview(result.pos);
      // A slip is never shown on the words: the child simply carries on from where they are.
      if (result.mistake) {
        slipsRef.current += 1;
      }
      if (result.pos >= expected.length) finishAyah(slipsRef.current);
    },
  });
  const supported = available && speech.error !== "unsupported";

  useEffect(
    () => () => {
      setMood("idle");
      if (kidsAudio.getState().id?.startsWith("kids-")) kidsAudio.stop();
    },
    [setMood],
  );

  function resetAyah() {
    posRef.current = 0;
    slipsRef.current = 0;
    verdictRef.current = null;
    setPos(0);
    setPreview(0);
    setVerdict(null);
  }

  /** Trying an ayah again replaces its last result instead of adding one. */
  function retry() {
    sfx.tap();
    setResults((current) => current.slice(0, -1));
    resetAyah();
  }

  function finishAyah(finalSlips: number) {
    speech.stop();
    const next = verdictFor(finalSlips);
    verdictRef.current = next;
    setVerdict(next);
    setResults((current) => [...current, next]);
    if (next === "again") {
      sfx.flip();
      react("almost");
    } else {
      sfx.correct();
      react("correct");
    }
  }

  function listenFirst() {
    if (!ayah) return;
    speech.stop();
    kidsAudio.play(`kids-recite-${ayah.number}`, husaryAyah(surah.id, ayah.numberInSurah));
  }

  function toggleMic() {
    if (speech.listening) {
      speech.stop();
      setMood("idle");
      return;
    }
    kidsAudio.pause();
    sfx.tap();
    setMood("thinking");
    react("listening", "thinking");
    void speech.start();
  }

  async function saveSession(all: Verdict[]) {
    const good = all.filter((entry) => entry !== "again").length;
    recordGame({ game: "kids_recite", surah: good / all.length >= PASS_SHARE ? surah.id : null, score: good, total: all.length });
    const learnerId = activeLearnerIdNow();
    if (!supabase || !learnerId) return;
    await supabase.from("tasmee_sessions").insert({
      learner_id: learnerId,
      surah: surah.id,
      ayah_from: 1,
      ayah_to: all.length,
      correct: good,
      mistakes: all.length - good,
    });
  }

  function finishSession(all: Verdict[]) {
    if (all.length === 0) return;
    speech.stop();
    setMood("idle");
    sfx.win();
    setFinished(true);
    void saveSession(all).catch(() => {});
  }

  function next() {
    sfx.tap();
    if (index + 1 >= ayahs.length) {
      finishSession(results);
      return;
    }
    setIndex(index + 1);
    resetAyah();
  }

  function skip() {
    // Skipping is fine; it just counts as an ayah to come back to.
    const all = [...results, "again" as const];
    setResults(all);
    if (index + 1 >= ayahs.length) finishSession(all);
    else {
      speech.stop();
      setIndex(index + 1);
      resetAyah();
    }
  }

  function restart() {
    setIndex(0);
    setResults([]);
    setFinished(false);
    resetAyah();
  }

  if (!ayah) {
    return (
      <KidsScroll>
        <KidsPanel>
          <KidsText tone="muted" center>
            تعذّر تحميل آيات السورة الآن، جرّب بعد قليل.
          </KidsText>
        </KidsPanel>
      </KidsScroll>
    );
  }

  if (!supported) {
    return (
      <KidsScroll>
        <KidsPanel className="items-center">
          <KidsText size={26} bold center>
            🎤 سمّعني: سورة {surah.name}
          </KidsText>
          <KidsText size={17} tone="muted" center className="mt-2">
            سجّل صوتك وأنت تقرأ، ثم استمع لنفسك. هل قرأتها جيدًا؟
          </KidsText>
          <View style={{ marginTop: 18, borderRadius: 24, backgroundColor: KIDS.paper, padding: 14, alignSelf: "stretch" }}>
            <QuranText size={24}>{ayahs.map((entry) => entry.text).join(" ۝ ")}</QuranText>
          </View>
          <View className="mt-5">
            <ReciteRecorder />
          </View>
          <KidsButton
            tone="emerald"
            icon={ThumbsUp}
            className="mt-6"
            onPress={() => {
              sfx.win();
              react("finish");
              recordGame({ game: "kids_recite", surah: surah.id, score: 1, total: 1 });
              setFinished(true);
            }}
          >
            قرأتها جيدًا!
          </KidsButton>
        </KidsPanel>
        <Celebration open={finished} title="أحسنت يا بطل!" message="صوتك جميل بالقرآن 🌟" stars={3} onClose={() => setFinished(false)}>
          <KidsButton
            tone="emerald"
            onPress={() => {
              setFinished(false);
              go(`/kids/journey/${surah.id}`);
            }}
          >
            العودة للمحطة
          </KidsButton>
        </Celebration>
      </KidsScroll>
    );
  }

  const shown = Math.max(pos, preview);
  const good = results.filter((entry) => entry !== "again").length;
  const share = good / Math.max(results.length, 1);

  return (
    <KidsScroll gap={16}>
      <View
        style={[
          { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 20, paddingVertical: 10, borderWidth: 4, borderColor: "rgba(255,255,255,0.6)", gap: 2, alignItems: "center" },
          PANEL_SHADOW,
        ]}
      >
        <KidsText size={19} bold center>
          🎤 سمّعني: سورة {surah.name}
        </KidsText>
        <KidsText size={14} bold tone="muted">
          الآية {toArabicDigits(ayah.numberInSurah)} من {toArabicDigits(ayahs.length)}
        </KidsText>
      </View>

      <KidsPanel className="items-center">
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 10 }}>
          {words.map((word, wordIndex) => (
            <Word key={`${ayah.number}-${wordIndex}`} word={word} heard={wordIndex < shown} />
          ))}
        </View>

        {verdict ? (
          <Animated.View key="verdict" entering={ZoomIn} className="mt-6 items-center">
            <Text style={{ fontSize: 48 }}>{VERDICTS[verdict].emoji}</Text>
            <KidsText size={28} bold center className="mt-2">
              {VERDICTS[verdict].title}
            </KidsText>
            <View className="mt-5 flex-row flex-wrap justify-center gap-3">
              {verdict === "again" && (
                <>
                  <KidsButton tone="sky" icon={Volume2} onPress={listenFirst}>
                    اسمعها
                  </KidsButton>
                  <KidsButton tone="gold" icon={Mic} onPress={retry}>
                    مرة أخرى
                  </KidsButton>
                </>
              )}
              <KidsButton tone="emerald" onPress={next}>
                {index + 1 >= ayahs.length ? "النتيجة" : "الآية التالية"}
              </KidsButton>
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="mic" entering={FadeIn} className="mt-6 items-center gap-4">
            <MicButton listening={speech.listening} onPress={toggleMic} />
            <KidsText size={17} bold tone="muted" center>
              {speech.listening ? "أنا أسمعك… اقرأ الآية" : "اضغط على الميكروفون واقرأ الآية"}
            </KidsText>
            {speech.error === "not-allowed" && (
              <KidsText size={15} center style={{ color: KIDS.honey }}>
                نحتاج إذنًا لاستخدام الميكروفون. اطلب من أبيك أو أمك السماح بذلك من إعدادات الجهاز.
              </KidsText>
            )}
            {speech.error === "network" && (
              <KidsText size={15} center style={{ color: KIDS.honey }}>
                يحتاج التسميع إلى الإنترنت. تأكد من الاتصال وحاول مرة أخرى.
              </KidsText>
            )}
            <View className="flex-row flex-wrap justify-center gap-3">
              <KidsButton tone="white" size="sm" icon={Volume2} onPress={listenFirst}>
                اسمعها أولًا
              </KidsButton>
              <KidsButton tone="white" size="sm" icon={SkipForward} onPress={skip}>
                الآية التالية
              </KidsButton>
              {results.length >= MIN_AYAHS_TO_FINISH && (
                <KidsButton tone="white" size="sm" onPress={() => finishSession(results)}>
                  يكفي اليوم
                </KidsButton>
              )}
            </View>
          </Animated.View>
        )}
      </KidsPanel>

      <Celebration
        open={finished}
        title={share >= PASS_SHARE ? "ما شاء الله! صوتك جميل بالقرآن" : "أحسنت المحاولة يا بطل!"}
        message={`قرأت ${toArabicDigits(good)} من ${toArabicDigits(results.length)} آيات بشكل جميل`}
        stars={good === results.length ? 3 : share >= PASS_SHARE ? 2 : 1}
        onClose={() => setFinished(false)}
      >
        <KidsButton tone="rose" onPress={restart}>
          سمّع مرة أخرى
        </KidsButton>
        <KidsButton
          tone="white"
          onPress={() => {
            setFinished(false);
            go(`/kids/journey/${surah.id}`);
          }}
        >
          العودة للمحطة
        </KidsButton>
      </Celebration>
    </KidsScroll>
  );
}
