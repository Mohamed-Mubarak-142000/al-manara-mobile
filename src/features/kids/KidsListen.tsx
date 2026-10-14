import { FlashList } from "@shopify/flash-list";
import { Pause, Play } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { buildSurahAudioUrl, type Reciter } from "@/core/quran/api";
import { toArabicDigits } from "@/core/text/arabic";
import { audio, currentTrack, usePlayerValue, type Track } from "@/features/audio/playerStore";

import { kidsAudio } from "./kidsAudio";
import { getKidsSurahs, getTeachingReciters } from "./kidsData";
import { useLoad } from "./useLoad";
import { KidsArt } from "./ui/KidsArt";
import { KidsBeat } from "./ui/KidsMotion";
import { KidsText, KidsTitlePanel } from "./ui/KidsPanel";
import { useKidsBottomPad } from "./ui/KidsShell";
import { KidsError, KidsLoading } from "./ui/KidsStatus";
import { KIDS, PANEL_SHADOW } from "./ui/kidsStyles";

/**
 * The website's KidsListen: the teaching mushaf (the sheikh reads, the children repeat). Like the website it
 * plays in the app-wide player, as a queue of the kids surahs, so it keeps going on the lock screen.
 */
export function KidsListen() {
  const loaded = useLoad("teaching-reciters", getTeachingReciters, [] as Reciter[]);
  const reciters = loaded.status === "ready" ? loaded.data : [];
  const bottom = useKidsBottomPad();
  const [reciterId, setReciterId] = useState<number | null>(null);
  const reciter = reciters.find((entry) => entry.id === reciterId) ?? reciters[0];
  const moshaf = reciter?.moshaf[0];
  const currentId = usePlayerValue((s) => currentTrack(s)?.id ?? null);
  const playing = usePlayerValue((s) => s.playing);

  const queue = useMemo<Track[]>(() => {
    if (!reciter || !moshaf) return [];
    return getKidsSurahs()
      .filter((surah) => moshaf.surahList.includes(surah.id))
      .map((surah) => ({
        id: `kids-listen-${moshaf.id}-${surah.id}`,
        title: `سورة ${surah.name}`,
        artist: `${reciter.name} — المصحف المعلّم`,
        url: buildSurahAudioUrl(moshaf, surah.id),
      }));
  }, [reciter, moshaf]);

  const header = (
    <View style={{ marginHorizontal: 6, marginBottom: 16 }}>
      <KidsTitlePanel title="استمع مع الأطفال" icon={<KidsArt emoji="🎶" size={60} />} subtitle="اسمع الشيخ وردّد مع الأطفال!" />
      {reciters.length > 1 && (
        <View className="mt-3 flex-row flex-wrap justify-center gap-2" accessibilityLabel="اختر الشيخ">
          {reciters.map((entry) => {
            const selected = entry.id === reciter?.id;
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setReciterId(entry.id)}
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  backgroundColor: selected ? KIDS.sky : KIDS.white,
                  borderBottomWidth: selected ? 5 : 0,
                  borderBottomColor: KIDS.skyShadow,
                  borderWidth: selected ? 0 : 2,
                  borderColor: KIDS.chipRing,
                }}
              >
                <KidsText size={15} bold style={{ color: selected ? KIDS.white : KIDS.muted }}>
                  {entry.name}
                </KidsText>
              </Pressable>
            );
          })}
        </View>
      )}
      {loaded.status === "loading" ? (
        <KidsLoading label="لحظة… نجهّز التسجيلات" className="mt-4" />
      ) : queue.length === 0 ? (
        <KidsError emoji="🎧" title="لا تتوفر التسجيلات الآن" message="جرّب مرة أخرى بعد قليل." className="mt-4" />
      ) : null}
    </View>
  );

  return (
    <FlashList
      data={queue}
      numColumns={2}
      keyExtractor={(track) => track.id}
      extraData={`${currentId}-${playing}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 10, paddingBottom: bottom }}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => {
        const current = currentId === item.id;
        const on = current && playing;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => {
              if (current) audio.toggle();
              else {
                kidsAudio.stop();
                audio.playQueue(queue, index);
              }
            }}
            style={[
              {
                margin: 6,
                alignItems: "center",
                gap: 8,
                borderRadius: 32,
                padding: 18,
                borderWidth: 4,
                backgroundColor: on ? KIDS.sky : "rgba(255,255,255,0.95)",
                borderColor: on ? KIDS.white : "rgba(255,255,255,0.6)",
              },
              PANEL_SHADOW,
            ]}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: on ? "rgba(255,255,255,0.2)" : KIDS.skySoft,
              }}
            >
              {on ? <Pause size={28} color={KIDS.white} fill={KIDS.white} /> : <Play size={28} color={KIDS.sky} fill={KIDS.sky} />}
            </View>
            <KidsText size={19} bold center style={{ color: on ? KIDS.white : KIDS.deep }}>
              {item.title}
            </KidsText>
            {on ? (
              <KidsBeat>
                <KidsArt emoji="🎶" size={26} />
              </KidsBeat>
            ) : (
              <KidsText size={15} bold style={{ color: KIDS.deep, opacity: 0.6, lineHeight: 26 }}>
                {toArabicDigits(index + 1)}
              </KidsText>
            )}
          </Pressable>
        );
      }}
    />
  );
}
