import { router, useLocalSearchParams } from "expo-router";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import {
  BookmarkCheck,
  Check,
  ChevronRight,
  Eye,
  Hand,
  Lightbulb,
  LoaderCircle,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  TriangleAlert,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { splitAyahWords } from "@/core/quran/words";
import { buildExpected, matchChunk, matchPreview, type ExpectedWord, type Mistake } from "@/core/tasmee/recitation";
import { clampRange, countsAsReview, describeMistake, heardInAyah, overrideTarget, shownCount } from "@/core/tasmee/session";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { audio, currentTrack, getPlayerState, usePlayer } from "@/features/audio/playerStore";
import { ayahSource } from "@/features/downloads/ayahPacks";
import { loadSurahReview, markAyahsMemorized, markSurahReviewed, recordActivity } from "@/features/journey/progress";
import { getSurah, getSurahAyahs, type MushafAyah } from "@/features/mushaf/mushaf";
import { playErrorTone } from "@/features/tasmee/errorTone";
import { useSpeech, type SpeechError } from "@/features/tasmee/useSpeech";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/telemetry";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

type Mode = "voice" | "manual";
type Mark = "correct" | "mistake";
interface Item {
  ayah: MushafAyah;
  words: string[];
  revealed: number;
  mark: Mark | null;
}

const SPEECH_ERRORS: Record<SpeechError, string> = {
  "not-allowed": "لم نستطع استخدام الميكروفون. اسمح للتطبيق بالوصول إليه من إعدادات الجهاز ثم حاول مرة أخرى.",
  network: "التعرّف على الصوت غير متاح الآن، حاول مرة أخرى بعد قليل.",
  unsupported: "التعرّف على الكلام بالعربية غير متاح على هذا الجهاز. سمّع يدويًا.",
  other: "توقّف الاستماع بشكل غير متوقع. اضغط الميكروفون لنكمل.",
};

const fresh = (ayahs: MushafAyah[]): Item[] => ayahs.map((ayah) => ({ ayah, words: splitAyahWords(ayah.text), revealed: 0, mark: null }));

/** The player has toggle() but no pause(): only pause what is actually playing. */
function pauseAudio() {
  if (getPlayerState().playing) audio.toggle();
}

function speechSupported(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

/** Plays (or pauses) one ayah in al-Husary's voice, like the website's AyahPlay. */
function useAyahAudio(ayah: MushafAyah, surahName: string) {
  const player = usePlayer();
  const id = `tasmee-fix-${ayah.id}`;
  const isThis = currentTrack(player)?.id === id;
  const toggle = () =>
    isThis
      ? audio.toggle()
      : audio.playTrack({
          id,
          title: `سورة ${surahName} — الآية ${toArabicDigits(ayah.ayah)}`,
          artist: "الحصري — مرتّل",
          ...ayahSource("husary", ayah.surah, ayah.ayah),
        });
  return { isThis, playing: isThis && player.playing, loading: isThis && player.buffering, toggle };
}

function AyahPlay({ ayah, surahName }: { ayah: MushafAyah; surahName: string }) {
  const primary = useThemeColor("primary");
  const { playing, loading, toggle } = useAyahAudio(ayah, surahName);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${playing ? "إيقاف" : "استمع إلى"} الآية ${toArabicDigits(ayah.ayah)}`}
      onPress={toggle}
      hitSlop={8}
      className="mt-1 size-9 items-center justify-center rounded-full border border-border bg-surface"
    >
      {loading ? <LoaderCircle size={16} color={primary} /> : playing ? <Pause size={16} color={primary} /> : <Play size={16} color={primary} />}
    </Pressable>
  );
}

/** The ring that pulses around the mic while listening (the website's animate-ping). */
function Ping({ active }: { active: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (active) progress.set(withRepeat(withTiming(1, { duration: 1000 }), -1, false));
    else {
      cancelAnimation(progress);
      progress.set(0);
    }
  }, [active, progress]);
  const style = useAnimatedStyle(() => ({ opacity: active ? 0.45 * (1 - progress.get()) : 0, transform: [{ scale: 1 + progress.get() * 0.6 }] }));
  return <Animated.View pointerEvents="none" style={style} className="absolute inset-0 rounded-full bg-danger" />;
}

function MistakeSheet({
  mistake,
  expected,
  sessionAyahs,
  words,
  surahName,
  onContinue,
  onOverride,
}: {
  mistake: Mistake;
  expected: ExpectedWord[];
  sessionAyahs: MushafAyah[];
  words: string[][];
  surahName: string;
  onContinue: () => void;
  onOverride: () => void;
}) {
  const danger = useThemeColor("danger");
  const primary = useThemeColor("primary");
  const mistakeText = useScaledText(22, 46);
  const at = expected[mistake.at]!;
  const ayah = sessionAyahs[at.ayah]!;
  const ayahNumber = toArabicDigits(ayah.ayah);
  const view = describeMistake(mistake, expected, ayahNumber);
  const highlight = new Set(view.highlight);
  const { playing, loading, toggle } = useAyahAudio(ayah, surahName);
  const skippedTo = view.skippedToAyah !== null ? sessionAyahs[view.skippedToAyah] : undefined;

  return (
    <View className="flex-1 justify-center px-4">
      <Pressable accessibilityLabel="فهمت، أكمل" onPress={onContinue} className="absolute inset-0 bg-black/55" />
      <ScrollView
        className="max-h-[90%] grow-0 rounded-4xl bg-bg"
        contentContainerStyle={{ padding: 20, gap: 16 }}
        accessibilityRole="alert"
      >
        <View className="flex-row items-center gap-3">
          <View className="size-11 items-center justify-center rounded-2xl bg-danger/10">
            <TriangleAlert size={24} color={danger} />
          </View>
          <Text className="flex-1 font-display-bold text-xl text-fg">{view.title}</Text>
        </View>

        {mistake.kind === "wrong" && (
          <View className="flex-row gap-3">
            <View className="flex-1 items-center rounded-2xl bg-danger/10 p-3">
              <Text className="font-sans-bold text-xs text-danger">قلتَ</Text>
              <Text className="mt-1 text-center font-sans-bold text-xl text-danger line-through">{mistake.heard}</Text>
            </View>
            <View className="flex-1 items-center rounded-2xl bg-primary-soft p-3">
              <Text className="font-sans-bold text-xs text-primary">الصحيح</Text>
              <Text className="mt-1 text-center font-quran text-2xl text-fg">{at.text}</Text>
            </View>
          </View>
        )}
        {mistake.kind === "missed" && (
          <View className="items-center rounded-2xl bg-primary-soft p-3">
            <Text className="font-sans-bold text-xs text-primary">لم نسمع</Text>
            <Text className="mt-1 text-center font-quran text-2xl text-fg">{view.missed.join(" ")}</Text>
          </View>
        )}
        {mistake.kind === "skipped-ayah" && (
          <Text className="rounded-2xl bg-accent-soft p-3 text-center font-sans text-sm leading-7 text-accent-strong">
            انتقلتَ إلى الآية {toArabicDigits(skippedTo?.ayah ?? ayah.ayah)} قبل أن تقرأ هذه الآية. اقرأها ثم أكمل.
          </Text>
        )}

        <View className="rounded-3xl border border-border bg-surface p-4">
          <Text className="mb-2 font-sans-bold text-xs text-fg-muted">
            سورة {surahName} — الآية {ayahNumber}
          </Text>
          <Text className="text-center font-quran text-fg" style={mistakeText}>
            {words[at.ayah]!.map((word, index) => (
              <Text key={index}>
                <Text
                  style={highlight.has(index) ? { color: primary, backgroundColor: "rgba(0,85,68,0.14)", fontWeight: "700" } : undefined}
                >
                  {word}
                </Text>{" "}
              </Text>
            ))}
            <Text className="text-accent-strong">﴿{ayahNumber}﴾</Text>
          </Text>
        </View>

        <Text className="font-sans text-sm leading-6 text-fg-muted">{view.instruction}</Text>

        <View className="gap-2">
          <Button onPress={onContinue}>فهمت، أكمل</Button>
          <Button variant="outline" icon={loading ? LoaderCircle : playing ? Pause : Play} onPress={toggle}>
            استمع للآية
          </Button>
          {view.canOverride && (
            <Pressable accessibilityRole="button" onPress={onOverride} hitSlop={8} className="self-center py-2">
              <Text className="font-sans-bold text-sm text-fg-muted">قرأتها صحيحة، أكمل</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * التسميع, as on the website (features/tasmee/TasmeeSession.tsx): the ayahs hidden, each one appearing
 * as it is recited; a mistake stops the session and shows what was said and what is right. Manual mode
 * reveals words and is marked by hand. The finished session is saved to tasmee_sessions, the correct
 * ayahs can be marked memorized, and a whole due surah with no mistake counts as today's review.
 */
export default function TasmeeSessionScreen() {
  const params = useLocalSearchParams<{ surah: string; from?: string; to?: string }>();
  const surahNumber = Number(params.surah);
  const surah = getSurah(surahNumber);
  if (!surah) return <MissingSurah />;
  // Remounts when the range changes, like the website's key={`${surah}-${from}-${to}`}.
  const range = clampRange(params.from, params.to, surah.ayahCount);
  return <TasmeeSession key={`${surah.number}-${range.from}-${range.to}`} surahNumber={surah.number} surahName={surah.name} {...range} />;
}

function MissingSurah() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-6" style={{ paddingTop: insets.top }}>
      <Text className="text-center font-sans text-base text-fg-muted">تعذّر تحميل هذه السورة الآن، حاول مرة أخرى.</Text>
      <Button variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace("/tasmee"))}>
        اختر سورة
      </Button>
    </View>
  );
}

function TasmeeSession({ surahNumber, surahName, from, to }: { surahNumber: number; surahName: string; from: number; to: number }) {
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const primary = useThemeColor("primary");
  const onPrimary = useThemeColor("on-primary");
  const surface = useThemeColor("surface");
  const border = useThemeColor("border");
  const accent = useThemeColor("accent-strong");
  const ayahText = useScaledText(22, 48);
  const learnerId = activeLearnerId(useAccount());
  const player = usePlayer();

  const all = useMemo(() => getSurahAyahs(surahNumber).filter((ayah) => ayah.ayah >= from && ayah.ayah <= to), [surahNumber, from, to]);
  const ayahCount = getSurah(surahNumber)?.ayahCount ?? all.length;

  const [supported] = useState(speechSupported);
  const [modeChoice, setModeChoice] = useState<Mode | null>(null);
  const mode: Mode = modeChoice ?? (supported ? "voice" : "manual");
  const [sessionAyahs, setSessionAyahs] = useState(all);
  const [items, setItems] = useState(() => fresh(all));
  const [hint, setHint] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [started, setStarted] = useState(false);
  const [memorized, setMemorized] = useState<"idle" | "saving" | "done" | "failed">("idle");
  const [countedAsReview, setCountedAsReview] = useState(false);
  const itemsRef = useRef(items);

  const expected = useMemo(() => buildExpected(sessionAyahs.map((ayah) => splitAyahWords(ayah.text))), [sessionAyahs]);
  const ayahStarts = useMemo(() => {
    const starts: number[] = [];
    expected.forEach((word, index) => {
      if (word.word === 0) starts[word.ayah] = index;
    });
    return starts;
  }, [expected]);
  const [pos, setPos] = useState(0);
  const [preview, setPreview] = useState(0);
  const [interim, setInterim] = useState("");
  const [mistake, setMistake] = useState<Mistake | null>(null);
  const posRef = useRef(0);
  const mistakeRef = useRef<Mistake | null>(null);
  const errorAyahs = useRef(new Set<number>());
  const ayahEnd = useCallback((index: number) => (ayahStarts[index + 1] ?? expected.length) - 1, [ayahStarts, expected.length]);

  async function save(final: Item[]) {
    if (!supabase || !learnerId) return;
    setSaved("saving");
    const numbers = final.map((item) => item.ayah.ayah);
    const ayahFrom = Math.min(...numbers);
    const ayahTo = Math.max(...numbers);
    const mistakes = final.filter((item) => item.mark === "mistake").length;
    const { error } = await supabase.from("tasmee_sessions").insert({
      learner_id: learnerId,
      surah: surahNumber,
      ayah_from: ayahFrom,
      ayah_to: ayahTo,
      correct: final.filter((item) => item.mark === "correct").length,
      mistakes,
    });
    setSaved(error ? "failed" : "saved");
    if (!error) recordActivity(learnerId);
    // The website's automatic review: the whole surah, due, recited without a mistake.
    const review = await loadSurahReview(learnerId, surahNumber).catch(() => null);
    if (review && countsAsReview({ ayahFrom, ayahTo, ayahCount, mistakes, dueAt: review.due_at })) {
      if (await markSurahReviewed(learnerId, review)) setCountedAsReview(true);
    }
  }

  function markMany(marks: Map<number, Mark>) {
    const next = itemsRef.current.map((item, index) => {
      const value = marks.get(index);
      return value ? { ...item, mark: value, revealed: item.words.length } : item;
    });
    itemsRef.current = next;
    setItems(next);
    if (next.every((item) => item.mark !== null)) {
      track("tasmee_finished", { ayahs: next.length, mistakes: next.filter((item) => item.mark === "mistake").length });
      void save(next);
    }
  }

  function update(index: number, change: Partial<Item>) {
    const next = itemsRef.current.map((item, i) => (i === index ? { ...item, ...change } : item));
    itemsRef.current = next;
    setItems(next);
  }

  function advanceTo(next: number) {
    posRef.current = next;
    setPos(next);
    const marks = new Map<number, Mark>();
    itemsRef.current.forEach((item, index) => {
      if (item.mark === null && ayahEnd(index) < next) marks.set(index, errorAyahs.current.has(index) ? "mistake" : "correct");
    });
    if (marks.size > 0) markMany(marks);
  }

  const speech = useSpeech({
    onFinal: (text) => {
      if (mistakeRef.current) return;
      const result = matchChunk(expected, text, posRef.current);
      advanceTo(result.pos);
      setPreview(result.pos);
      if (result.mistake) {
        mistakeRef.current = result.mistake;
        setMistake(result.mistake);
        errorAyahs.current.add(expected[result.mistake.at]!.ayah);
        speech.stop();
        playErrorTone();
      } else if (result.pos >= expected.length) speech.stop();
    },
    onInterim: (text) => {
      setInterim(text);
      if (!mistakeRef.current) setPreview(text ? matchPreview(expected, text, posRef.current) : posRef.current);
    },
  });
  const { listening, stop: stopListening } = speech;

  // Any recitation starting to play stops the mic, so it doesn't hear the reciter (the website does the same).
  useEffect(() => {
    if (player.playing && listening) stopListening();
  }, [player.playing, listening, stopListening]);

  function listen() {
    pauseAudio();
    setStarted(true);
    void speech.start();
  }

  function closeMistake(override: boolean) {
    const current = mistakeRef.current;
    mistakeRef.current = null;
    setMistake(null);
    pauseAudio();
    if (current && override) {
      const target = overrideTarget(current);
      if (target !== null) {
        // The recognizer misheard: accept the word(s) and move on.
        errorAyahs.current.delete(expected[current.at]!.ayah);
        advanceTo(target);
      }
    }
    if (posRef.current < expected.length) setTimeout(listen, 250);
  }

  function restart(onlyMistakes: boolean) {
    speech.stop();
    const wrong = itemsRef.current.filter((item) => item.mark === "mistake").map((item) => item.ayah);
    const subset = onlyMistakes && wrong.length ? wrong : all;
    setSessionAyahs(subset);
    const next = fresh(subset);
    itemsRef.current = next;
    setItems(next);
    posRef.current = 0;
    setPos(0);
    setPreview(0);
    mistakeRef.current = null;
    setMistake(null);
    errorAyahs.current = new Set();
    setStarted(false);
    setSaved("idle");
    setMemorized("idle");
    setCountedAsReview(false);
  }

  async function memorizeCorrect(numbers: number[]) {
    if (!learnerId) return;
    setMemorized("saving");
    setMemorized((await markAyahsMemorized(learnerId, surahNumber, numbers)) ? "done" : "failed");
  }

  const currentIndex = items.findIndex((item) => item.mark === null);
  const finished = currentIndex === -1;
  const correct = items.filter((item) => item.mark === "correct");
  const mistakes = items.filter((item) => item.mark === "mistake");
  const answered = correct.length + mistakes.length;

  // Keeps the ayah being recited in the middle of the screen (the website's scrollIntoView).
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);
  const [viewport, setViewport] = useState(0);
  useEffect(() => {
    const y = offsets.current[currentIndex];
    if (currentIndex < 0 || y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - viewport / 3), animated: true });
  }, [currentIndex, viewport]);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-2 px-3">
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12} className="p-1">
          <ChevronRight size={26} color={fg} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-display-bold text-lg text-fg">سورة {surahName}</Text>
          <Text className="font-sans text-xs text-fg-muted">
            {toArabicDigits(answered)} من {toArabicDigits(items.length)} آية
          </Text>
        </View>
      </View>

      <View className="gap-3 px-4 pt-3">
        <View className="flex-row rounded-full border border-border bg-surface p-1">
          {(
            [
              ["voice", Mic, "بصوتك (تلقائي)"],
              ["manual", Hand, "يدويًا"],
            ] as const
          ).map(([value, Icon, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === value }}
              onPress={() => {
                if (value === "manual") speech.stop();
                setModeChoice(value);
              }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2 ${mode === value ? "bg-primary" : ""}`}
            >
              <Icon size={15} color={mode === value ? onPrimary : primary} />
              <Text className={`font-sans-bold text-sm ${mode === value ? "text-on-primary" : "text-fg-muted"}`}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Lightbulb size={15} color={primary} />
            <Text className="font-sans-bold text-sm text-fg">أظهر أول كلمة من كل آية</Text>
          </View>
          <Switch value={hint} onValueChange={setHint} trackColor={{ false: border, true: primary }} thumbColor={surface} />
        </View>
        <ProgressBar value={items.length ? answered / items.length : 0} />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        onLayout={(event) => setViewport(event.nativeEvent.layout.height)}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
      >
        {items.map((item, index) => {
          const isCurrent = index === currentIndex;
          const upcoming = !finished && index > currentIndex;
          const heard = mode === "voice" ? heardInAyah(Math.max(pos, preview), ayahStarts[index], item.words.length) : 0;
          const shown = shownCount({ revealed: item.revealed, words: item.words.length, heard, hint: hint && (isCurrent || upcoming) });
          return (
            <View
              key={item.ayah.id}
              onLayout={(event) => {
                offsets.current[index] = event.nativeEvent.layout.y;
              }}
              className={`rounded-3xl border p-4 ${
                item.mark === "correct"
                  ? "border-primary/30 bg-primary-soft"
                  : item.mark === "mistake"
                    ? "border-danger/30 bg-danger/5"
                    : isCurrent
                      ? "border-primary/40 bg-surface shadow-lift"
                      : "border-border bg-surface"
              } ${upcoming ? "opacity-55" : ""}`}
            >
              <View className="flex-row items-start gap-3">
                <View
                  accessibilityLabel={item.mark === "correct" ? "صحيحة" : item.mark === "mistake" ? "للمراجعة" : undefined}
                  className={`mt-2 size-8 items-center justify-center rounded-full ${
                    item.mark === "correct" ? "bg-primary" : item.mark === "mistake" ? "bg-danger" : "bg-accent-soft"
                  }`}
                >
                  {item.mark === "correct" ? (
                    <Check size={16} color="#fff" />
                  ) : item.mark === "mistake" ? (
                    <X size={16} color="#fff" />
                  ) : (
                    <Text className="font-display-bold text-sm text-accent-strong">{toArabicDigits(item.ayah.ayah)}</Text>
                  )}
                </View>
                <Text
                  className="flex-1 font-quran text-fg"
                  style={ayahText}
                  accessibilityLabel={shown < item.words.length ? `الآية ${toArabicDigits(item.ayah.ayah)} مخفية` : undefined}
                >
                  {item.words.map((word, wordIndex) => (
                    <Text key={wordIndex}>
                      {/* A hidden word keeps its width: same text, painted in the placeholder colour. */}
                      <Text style={wordIndex < shown ? undefined : { color: "transparent", backgroundColor: "rgba(0,85,68,0.12)" }}>
                        {word}
                      </Text>{" "}
                    </Text>
                  ))}
                  <Text style={{ color: accent }}>﴿{toArabicDigits(item.ayah.ayah)}﴾</Text>
                </Text>
                {item.mark && <AyahPlay ayah={item.ayah} surahName={surahName} />}
              </View>

              {isCurrent && (
                <View className="mt-4 flex-row flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={SkipForward}
                    disabled={shown >= item.words.length}
                    onPress={() => update(index, { revealed: Math.min(shown + 1, item.words.length) })}
                  >
                    اكشف كلمة
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Eye}
                    disabled={shown >= item.words.length}
                    onPress={() => update(index, { revealed: item.words.length })}
                  >
                    اكشف الآية
                  </Button>
                  {mode === "manual" && (
                    <>
                      <Button variant="outline" size="sm" icon={X} onPress={() => markMany(new Map([[index, "mistake"]]))}>
                        أخطأت
                      </Button>
                      <Button size="sm" icon={Check} onPress={() => markMany(new Map([[index, "correct"]]))}>
                        قرأتها صحيحة
                      </Button>
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {finished && (
          <View className="rounded-4xl bg-hero p-6" accessibilityLiveRegion="polite">
            <Text className="font-display-bold text-2xl text-hero-fg">انتهى التسميع — بارك الله فيك</Text>
            <Text className="mt-2 font-sans text-base text-white/80">
              <Text className="font-sans-bold text-gold-soft">{toArabicDigits(correct.length)}</Text> آية صحيحة
              {mistakes.length > 0 && (
                <>
                  {" "}
                  و<Text className="font-sans-bold text-danger">{toArabicDigits(mistakes.length)}</Text> للمراجعة
                </>
              )}{" "}
              من {toArabicDigits(items.length)}.
            </Text>
            {mistakes.length > 0 && (
              <Text className="mt-2 font-sans text-sm text-white/70">
                راجع الآيات: {mistakes.map((item) => toArabicDigits(item.ayah.ayah)).join("، ")}
              </Text>
            )}
            {countedAsReview && <Text className="mt-3 font-sans-bold text-sm text-gold-soft">سُجّلت مراجعة السورة لليوم ✓</Text>}
            <Text className="mt-3 font-sans text-xs text-white/60">
              {!learnerId
                ? "سجّل الدخول لتُحفظ جلسات التسميع في حسابك."
                : saved === "saving"
                  ? "جارٍ حفظ الجلسة في حسابك..."
                  : saved === "saved"
                    ? "حُفظت الجلسة في رحلتك."
                    : saved === "failed"
                      ? "تعذّر حفظ الجلسة."
                      : ""}
            </Text>
            <View className="mt-5 flex-row flex-wrap gap-2">
              {correct.length > 0 && learnerId && (
                <Button
                  variant="gold"
                  size="sm"
                  icon={BookmarkCheck}
                  disabled={memorized === "saving" || memorized === "done"}
                  onPress={() => memorizeCorrect(correct.map((item) => item.ayah.ayah))}
                >
                  {memorized === "done" ? "سُجّلت كمحفوظة" : memorized === "failed" ? "تعذّر الحفظ، حاول مجددًا" : "علّم الصحيحة كمحفوظة"}
                </Button>
              )}
              {mistakes.length > 0 && (
                <Button variant="light" size="sm" icon={RotateCcw} onPress={() => restart(true)}>
                  سمّع آيات المراجعة فقط
                </Button>
              )}
              <Button variant="light" size="sm" icon={RotateCcw} onPress={() => restart(false)}>
                من جديد
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      {mode === "voice" && !finished && (
        <View className="border-t border-border bg-surface px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          {!supported ? (
            <Text className="font-sans text-sm text-danger">{SPEECH_ERRORS.unsupported}</Text>
          ) : (
            <View className="flex-row items-center gap-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={speech.listening ? "أوقف الاستماع" : "ابدأ التسميع بصوتك"}
                disabled={mistake !== null}
                onPress={() => (speech.listening ? speech.stop() : listen())}
                className={`size-14 items-center justify-center rounded-full shadow-lift ${speech.listening ? "bg-danger" : "bg-primary"}`}
                style={{ opacity: mistake !== null ? 0.5 : 1 }}
              >
                <Ping active={speech.listening} />
                {speech.listening ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
              </Pressable>
              <View className="flex-1" accessibilityLiveRegion="polite">
                <Text className="font-sans-bold text-base text-fg">
                  {speech.listening
                    ? "أستمع إليك… اقرأ من حفظك"
                    : started
                      ? "توقّف الاستماع — اضغط الميكروفون لتتابع"
                      : "اضغط الميكروفون وابدأ القراءة من حفظك"}
                </Text>
                <Text className={`mt-0.5 font-sans text-sm ${speech.error ? "text-danger" : "text-fg-muted"}`} numberOfLines={speech.error ? undefined : 2}>
                  {speech.error
                    ? SPEECH_ERRORS[speech.error]
                    : interim || "تظهر كل آية وأنت تقرؤها، ونوقفك عند أي خطأ ونريك الصحيح. لا نحكم على التشكيل والتجويد."}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      <Modal visible={mistake !== null} transparent animationType="fade" onRequestClose={() => closeMistake(false)} statusBarTranslucent>
        {mistake && (
          <MistakeSheet
            mistake={mistake}
            expected={expected}
            sessionAyahs={sessionAyahs}
            words={items.map((item) => item.words)}
            surahName={surahName}
            onContinue={() => closeMistake(false)}
            onOverride={() => closeMistake(true)}
          />
        )}
      </Modal>
    </View>
  );
}
