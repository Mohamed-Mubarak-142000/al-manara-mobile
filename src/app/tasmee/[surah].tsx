import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronRight, Hand, Headphones, Lightbulb, Mic, MicOff, RotateCcw, TriangleAlert } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { husaryAyahUrl } from "@/core/quran/ayahAudio";
import { splitAyahWords } from "@/core/quran/words";
import { buildExpected, matchChunk, matchPreview, type Mistake } from "@/core/tasmee/recitation";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { activeLearnerId, useAccount } from "@/features/account/accountStore";
import { audio } from "@/features/audio/playerStore";
import { recordActivity } from "@/features/journey/progress";
import { getSurah, getSurahAyahs, type MushafAyah } from "@/features/mushaf/mushaf";
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
  network: "التعرّف على الصوت يحتاج اتصالًا بالإنترنت. تحقّق من الاتصال ثم حاول مرة أخرى.",
  unsupported: "التعرّف على الكلام بالعربية غير متاح على هذا الجهاز. سمّع يدويًا.",
  other: "توقّف الاستماع بشكل غير متوقع. اضغط الميكروفون لنكمل.",
};

const fresh = (ayahs: MushafAyah[]): Item[] => ayahs.map((ayah) => ({ ayah, words: splitAyahWords(ayah.text), revealed: 0, mark: null }));

export default function TasmeeSessionScreen() {
  const params = useLocalSearchParams<{ surah: string; from?: string; to?: string }>();
  const surahNumber = Number(params.surah);
  const surah = getSurah(surahNumber);
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const primary = useThemeColor("primary");
  const surface = useThemeColor("surface");
  const border = useThemeColor("border");
  const danger = useThemeColor("danger");
  const ayahText = useScaledText(22, 48);
  const mistakeText = useScaledText(20, 44);
  const learnerId = activeLearnerId(useAccount());

  const all = useMemo(() => {
    const from = Number(params.from) || 1;
    const to = Number(params.to) || surah?.ayahCount || 1;
    return getSurahAyahs(surahNumber).filter((ayah) => ayah.ayah >= from && ayah.ayah <= to);
  }, [surahNumber, params.from, params.to, surah?.ayahCount]);

  const [sessionAyahs, setSessionAyahs] = useState(all);
  const [items, setItems] = useState(() => fresh(all));
  const [mode, setMode] = useState<Mode>("voice");
  const [hint, setHint] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");
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
    const { error } = await supabase.from("tasmee_sessions").insert({
      learner_id: learnerId,
      surah: surahNumber,
      ayah_from: Math.min(...numbers),
      ayah_to: Math.max(...numbers),
      correct: final.filter((item) => item.mark === "correct").length,
      mistakes: final.filter((item) => item.mark === "mistake").length,
    });
    setSaved(error ? "failed" : "saved");
    if (!error) recordActivity(learnerId);
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
      save(next);
    }
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else if (result.pos >= expected.length) speech.stop();
    },
    onInterim: (text) => {
      setInterim(text);
      if (!mistakeRef.current) setPreview(text ? matchPreview(expected, text, posRef.current) : posRef.current);
    },
  });

  function listen() {
    // The mic would hear the reciter.
    audio.stop();
    speech.start();
  }

  function closeMistake(override: boolean) {
    const current = mistakeRef.current;
    mistakeRef.current = null;
    setMistake(null);
    if (current && override) {
      // The recognizer misheard: accept the word(s) and move on.
      errorAyahs.current.delete(expected[current.at]!.ayah);
      advanceTo(current.kind === "wrong" ? current.at + 1 : current.kind === "missed" ? current.at + current.count : posRef.current);
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
    setSaved("idle");
  }

  const currentIndex = items.findIndex((item) => item.mark === null);
  const finished = currentIndex === -1;
  const answered = items.filter((item) => item.mark !== null).length;
  const mistakes = items.filter((item) => item.mark === "mistake");

  const mistakeAyah = mistake ? sessionAyahs[expected[mistake.at]!.ayah] : undefined;
  const mistakeWord = mistake ? expected[mistake.at] : undefined;

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-2 px-3">
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12} className="p-1">
          <ChevronRight size={26} color={fg} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-display-bold text-lg text-fg">سورة {surah?.name}</Text>
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
                setMode(value);
              }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full py-2 ${mode === value ? "bg-primary" : ""}`}
            >
              <Icon size={15} color={mode === value ? "#fbf8f1" : primary} />
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

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}>
        {items.map((item, index) => {
          const isCurrent = index === currentIndex;
          const upcoming = !finished && index > currentIndex;
          const heard = mode === "voice" ? Math.min(Math.max(Math.max(pos, preview) - (ayahStarts[index] ?? 0), 0), item.words.length) : 0;
          const shown = Math.max(item.revealed, heard, hint && (isCurrent || upcoming) ? 1 : 0);
          return (
            <View
              key={item.ayah.id}
              className={`rounded-3xl border p-4 ${
                item.mark === "correct"
                  ? "border-primary/30 bg-primary-soft"
                  : item.mark === "mistake"
                    ? "border-danger/30 bg-danger/5"
                    : isCurrent
                      ? "border-primary/40 bg-surface shadow-lift"
                      : "border-border bg-surface"
              } ${upcoming ? "opacity-60" : ""}`}
            >
              <Text className="font-quran text-fg" style={ayahText}>
                {item.words.map((word, wordIndex) => (
                  <Text key={wordIndex}>
                    {/* A hidden word keeps its width: same text, painted in the placeholder colour. */}
                    <Text style={wordIndex < shown ? undefined : { color: "transparent", backgroundColor: "rgba(0,85,68,0.12)" }}>
                      {word}
                    </Text>{" "}
                  </Text>
                ))}
                <Text className="text-accent-strong">﴿{toArabicDigits(item.ayah.ayah)}﴾</Text>
              </Text>
              {mode === "manual" && isCurrent && (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={item.revealed >= item.words.length}
                    onPress={() => {
                      const next = itemsRef.current.map((entry, i) => (i === index ? { ...entry, revealed: entry.revealed + 1 } : entry));
                      itemsRef.current = next;
                      setItems(next);
                    }}
                  >
                    أظهر كلمة
                  </Button>
                  <Button size="sm" icon={Check} onPress={() => markMany(new Map([[index, "correct"]]))}>
                    صحيحة
                  </Button>
                  <Button variant="ghost" size="sm" onPress={() => markMany(new Map([[index, "mistake"]]))}>
                    أخطأت
                  </Button>
                </View>
              )}
            </View>
          );
        })}

        {finished && (
          <View className="items-center rounded-[32px] bg-hero p-6">
            <Text className="font-display-bold text-2xl text-hero-fg">انتهى التسميع — بارك الله فيك</Text>
            <Text className="mt-2 text-center font-sans text-sm text-white/75">
              {mistakes.length
                ? `راجع الآيات: ${mistakes.map((item) => toArabicDigits(item.ayah.ayah)).join("، ")}`
                : "سمّعت كل الآيات دون خطأ."}
            </Text>
            <Text className="mt-2 font-sans text-xs text-white/60">
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
            <View className="mt-4 flex-row flex-wrap justify-center gap-2">
              {mistakes.length > 0 && (
                <Button variant="gold" size="sm" icon={RotateCcw} onPress={() => restart(true)}>
                  سمّع الخطأ فقط
                </Button>
              )}
              <Button variant="light" size="sm" onPress={() => restart(false)}>
                من جديد
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      {mode === "voice" && !finished && (
        <View className="items-center gap-2 border-t border-border bg-surface px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <Text className="text-center font-sans text-sm text-fg-muted" numberOfLines={2}>
            {speech.error
              ? SPEECH_ERRORS[speech.error]
              : speech.listening
                ? interim || "أستمع إليك… اقرأ من حفظك"
                : "اضغط الميكروفون وابدأ القراءة من حفظك. لا نحكم على التشكيل والتجويد."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={speech.listening ? "أوقف الاستماع" : "ابدأ التسميع بصوتك"}
            onPress={() => (speech.listening ? speech.stop() : listen())}
            className={`size-16 items-center justify-center rounded-full ${speech.listening ? "bg-danger" : "bg-primary"} shadow-lift`}
          >
            {speech.listening ? <MicOff size={28} color="#fff" /> : <Mic size={28} color="#fff" />}
          </Pressable>
        </View>
      )}

      <Modal visible={mistake !== null} transparent animationType="fade" onRequestClose={() => closeMistake(false)}>
        <View className="flex-1 justify-center bg-black/50 px-5">
          {mistake && mistakeAyah && mistakeWord && (
            <View className="rounded-[28px] bg-surface p-5">
              <View className="flex-row items-center gap-2">
                <TriangleAlert size={20} color={danger} />
                <Text className="font-display-bold text-lg text-fg">
                  {mistake.kind === "wrong"
                    ? `خطأ في الآية ${toArabicDigits(mistakeAyah.ayah)}`
                    : mistake.kind === "missed"
                      ? `فاتتك ${mistake.count > 1 ? "كلمات" : "كلمة"} في الآية ${toArabicDigits(mistakeAyah.ayah)}`
                      : `تجاوزت الآية ${toArabicDigits(mistakeAyah.ayah)}`}
                </Text>
              </View>
              {mistake.kind === "wrong" && (
                <Text className="mt-2 font-sans text-sm text-fg-muted">
                  سمعنا «{mistake.heard}»، والصحيح «{mistakeWord.text}».
                </Text>
              )}
              <Text className="mt-3 font-quran text-fg" style={mistakeText}>
                {mistakeAyah.text}
              </Text>
              <View className="mt-4 gap-2">
                <Button icon={RotateCcw} onPress={() => closeMistake(false)}>
                  أعد القراءة من هنا
                </Button>
                <Button
                  variant="outline"
                  icon={Headphones}
                  onPress={() =>
                    audio.playTrack({
                      id: `tasmee-fix-${mistakeAyah.id}`,
                      title: `سورة ${surah?.name ?? ""} · الآية ${toArabicDigits(mistakeAyah.ayah)}`,
                      artist: "الشيخ الحصري",
                      url: husaryAyahUrl(mistakeAyah.id),
                    })
                  }
                >
                  استمع للآية
                </Button>
                <Button variant="ghost" size="sm" onPress={() => closeMistake(true)}>
                  كنت صحيحًا (أخطأ التعرّف)
                </Button>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
