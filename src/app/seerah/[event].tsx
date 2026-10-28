import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight, Lightbulb, Map as MapIcon, Volume2, VolumeX, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CHAPTERS, eventById, type Ambience, type Beat, type SeerahEvent } from "@/core/seerah/seerahContent";
import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { IconButton, ScreenHeader } from "@/components/ui/PageHeader";
import { Pager, type PagerHandle } from "@/components/ui/Pager";
import { StateMessage } from "@/components/ui/StateMessage";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { SECTION_ART } from "@/features/home/sectionArt";
import { HadithCard, VerseCard } from "@/features/seerah/Evidence";
import { SeerahMap } from "@/features/seerah/SeerahMap";
import { SeerahPanorama } from "@/features/seerah/SeerahPanorama";
import { SeerahQuiz } from "@/features/seerah/SeerahQuiz";
import { updateSeerah, useSeerah } from "@/features/seerah/seerahStore";
import { seerahSound } from "@/features/seerah/sound";
import { mapAt } from "@/features/seerah/stage";
import { useAppActive } from "@/lib/screenState";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

/** What is heard at a beat: the stretch of the panorama the camera is in. */
function ambienceAt(event: SeerahEvent, beat: number): Ambience[] {
  const pan = event.beats[beat]?.pan ?? 0;
  return event.panorama?.ambience?.find((stretch) => pan >= stretch.from && pan < stretch.to)?.sounds ?? [];
}

function BeatPage({ beat, index, count, event }: { beat: Beat; index: number; count: number; event?: SeerahEvent }) {
  const lesson = event?.lesson;
  const body = useScaledText(19, 38);
  const lessonText = useScaledText(15, 30);
  const accent = useThemeColor("accent-strong");
  return (
    <ScrollView contentContainerClassName="gap-4 px-4 pb-6 pt-2" showsVerticalScrollIndicator={false}>
      <Text className="font-sans-bold text-sm text-accent-strong">
        {toArabicDigits(index + 1)} / {toArabicDigits(count)}
      </Text>
      <Text className="font-sans text-fg" style={body}>
        {beat.text}
      </Text>
      {beat.verse && <VerseCard verseKey={beat.verse} />}
      {beat.hadith && <HadithCard hadithKey={beat.hadith} />}
      {lesson ? (
        <View className="flex-row gap-3 rounded-3xl border border-accent/40 bg-accent-soft p-4">
          <Lightbulb size={22} color={accent} />
          <View className="flex-1">
            <Text className="font-sans-bold text-base text-fg">وقفة</Text>
            <Text className="mt-1 font-sans text-fg" style={lessonText}>
              {lesson}
            </Text>
          </View>
        </View>
      ) : null}
      {event?.quiz && <SeerahQuiz chapter={event.id} title={event.title} quiz={event.quiz} />}
    </ScrollView>
  );
}

/**
 * The website's /seerah/[event]: the chapter's panorama above, the map shrunk to its corner, and its
 * beats below, swiped one at a time. Each beat sends the camera on, changes what is heard, and taps
 * lightly; the last brings the lesson and the questions.
 */
export default function SeerahChapterScreen() {
  const { event: id } = useLocalSearchParams<{ event: string }>();
  const event = eventById(id);
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const { height } = useWindowDimensions();
  const { last, sounds } = useSeerah();
  const appActive = useAppActive();
  const [mapOpen, setMapOpen] = useState(false);
  const deep = useThemeColor("emerald-deep");
  const [initial] = useState(() => (event && last?.event === event.id ? Math.min(last.beat, event.beats.length - 1) : 0));
  const [beat, setBeat] = useState(initial);
  const [pagerHeight, setPagerHeight] = useState(0);
  const pager = useRef<PagerHandle>(null);
  const finished = useRef(false);
  const stage = useMemo(() => (event && event.beats.length > 0 ? mapAt(event, beat) : null), [event, beat]);
  const ambience = event && appActive ? ambienceAt(event, beat).join() : "";
  const cue = event?.beats[beat]?.cue;

  // The place's sounds follow the beat; the app in the background or the screen closing silences them.
  useEffect(() => {
    if (ambience) seerahSound.setAmbience(ambience.split(",") as Ambience[]);
    else seerahSound.silence();
  }, [ambience, sounds]);
  useEffect(() => () => seerahSound.silence(), []);
  useEffect(() => {
    if (cue) seerahSound.effect(cue);
  }, [beat, cue]);

  if (!event || !stage || !event.panorama) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="السيرة النبوية" />
        <StateMessage message="هذا الفصل يُكتب الآن، وسيصل قريبًا بإذن الله." />
      </View>
    );
  }

  const count = event.beats.length;
  const atEnd = beat === count - 1;
  const next = CHAPTERS[CHAPTERS.findIndex((chapter) => chapter.id === event.id) + 1];

  function onBeat(index: number) {
    if (!event || index === beat) return;
    setBeat(index);
    const end = index === event.beats.length - 1;
    if (end && !finished.current) {
      finished.current = true;
      seerahSound.finish();
    } else seerahSound.beat();
    updateSeerah((current) => ({
      ...current,
      last: { event: event.id, beat: index },
      read: end && !current.read.includes(event.id) ? [...current.read, event.id] : current.read,
    }));
  }

  return (
    <View className="flex-1 bg-bg" style={{ paddingBottom: insets.bottom + miniPlayer }}>
      <ScreenHeader
        title={event.title}
        subtitle={event.date}
        art={SECTION_ART.seerah}
        actions={
          <IconButton
            icon={sounds ? Volume2 : VolumeX}
            label={sounds ? "إيقاف الأصوات" : "تشغيل الأصوات"}
            active={sounds}
            onPress={() => updateSeerah((current) => ({ ...current, sounds: !current.sounds }))}
          />
        }
      />

      <View className="mx-4 overflow-hidden rounded-3xl border border-border" style={{ height: Math.round(height * 0.36) }}>
        <SeerahPanorama
          panorama={event.panorama}
          pan={event.beats[beat]!.pan ?? 0}
          party={event.beats[beat]!.party}
          interaction={event.beats[beat]!.interaction}
        />
        {/* The map, shrunk to a corner: where on the way this moment is. Tap to open it. Out of the way while the reader is doing something. */}
        {!event.beats[beat]!.interaction && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mapOpen ? "إغلاق الخريطة" : "افتح الخريطة"}
            onPress={() => setMapOpen((open) => !open)}
            className={`absolute overflow-hidden border-2 border-white bg-surface ${mapOpen ? "inset-3 top-8 rounded-3xl" : "end-3 top-8 size-24 rounded-2xl"}`}
          >
            <SeerahMap frame={stage.frame} routes={stage.routes} named={mapOpen ? stage.named : []} glow={stage.glow} />
            <View className="absolute bottom-1 end-1 size-6 items-center justify-center rounded-full bg-white/90">
              {mapOpen ? <X size={14} color={deep} /> : <MapIcon size={13} color={deep} />}
            </View>
          </Pressable>
        )}
        <View
          className="absolute inset-x-0 top-0 flex-row gap-1 p-3"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {event.beats.map((_, index) => (
            <View key={index} className={`h-1 flex-1 rounded-full ${index <= beat ? "bg-gold" : "bg-white/60"}`} />
          ))}
        </View>
      </View>

      <View className="mt-3 flex-1" onLayout={(layout) => setPagerHeight(Math.round(layout.nativeEvent.layout.height))}>
        {pagerHeight > 0 && (
          <Pager
            ref={pager}
            data={event.beats}
            keyExtractor={(entry) => entry.text}
            height={pagerHeight}
            dots={false}
            initialIndex={initial}
            onIndexChange={onBeat}
            renderItem={(entry, index) => (
              <BeatPage beat={entry} index={index} count={count} event={index === count - 1 ? event : undefined} />
            )}
          />
        )}
      </View>

      <View className="flex-row items-center gap-3 border-t border-border px-4 pt-3">
        <IconButton icon={ChevronRight} label="السابق" onPress={() => pager.current?.goTo(beat - 1)} />
        {atEnd ? (
          <Button
            className="flex-1"
            variant="gold"
            onPress={() =>
              next ? router.replace({ pathname: "/seerah/[event]", params: { event: next.id } }) : router.navigate("/seerah")
            }
          >
            {next ? `الفصل التالي: ${next.title}` : "إلى الخط الزمني"}
          </Button>
        ) : (
          <Button className="flex-1" onPress={() => pager.current?.goTo(beat + 1)}>
            التالي
          </Button>
        )}
      </View>
    </View>
  );
}
