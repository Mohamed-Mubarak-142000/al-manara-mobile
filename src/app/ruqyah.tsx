import { BookOpen, HandHeart, Pause, Play, ScrollText, type LucideIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SECTION_ART } from "@/features/home/sectionArt";
import { RUQYAH_QURAN, RUQYAH_SUNNAH, type RuqyahPassage } from "@/core/ruqyah/ruqyahData";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { audio, currentTrack, usePlayerValue } from "@/features/audio/playerStore";
import { HadithCard, PassageCard, type ListenState } from "@/features/ruqyah/RuqyahCards";
import { RUQYAH_PREFIX, isPassageTrack, passageTracks } from "@/features/ruqyah/ruqyahTracks";
import { useThemeColor } from "@/theme/useThemeColor";

type Tab = "quran" | "sunnah";
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "quran", label: "آيات الرقية", icon: BookOpen },
  { id: "sunnah", label: "من السنة النبوية", icon: ScrollText },
];

/** The website's "قبل أن تبدأ" (features/ruqyah/RuqyahView.tsx). */
const GUIDANCE = [
  "الرقية دعاء وقراءة، والشفاء من الله وحده؛ فاقرأ بيقين وحضور قلب.",
  "يرقي المسلم نفسه وأهله، ويضع يده على موضع الألم، وينفث نفثًا خفيفًا كما كان النبي ﷺ يفعل.",
  "كل رقية ليس فيها شرك فلا بأس بها، واحذر من يطلب اسم الأم أو أثرًا من الثياب أو يكتب طلاسم.",
  "الرقية لا تغني عن الطبيب والدواء؛ فالتداوي مشروع، والأخذ بالأسباب من التوكل.",
];

function Guidance() {
  const accent = useThemeColor("accent-strong");
  return (
    <View className="mx-4 rounded-3xl border border-accent/40 bg-accent-soft p-5">
      <View className="flex-row items-center gap-2">
        <HandHeart size={18} color={accent} />
        <Text className="font-sans-bold text-base text-fg">قبل أن تبدأ</Text>
      </View>
      <View className="mt-3 gap-1.5">
        {GUIDANCE.map((line) => (
          <View key={line} className="flex-row gap-2">
            <Text className="font-sans text-sm leading-7 text-accent-strong">•</Text>
            <Text className="flex-1 font-sans text-sm leading-7 text-fg">{line}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Ruqyah from the Quran (read and heard, Alafasy ayah by ayah) and from the authentic Sunnah. */
export default function RuqyahScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const onPrimary = useThemeColor("on-primary");
  const primary = useThemeColor("primary");
  const [tab, setTab] = useState<Tab>("quran");
  const fullQueue = useMemo(() => RUQYAH_QURAN.flatMap(passageTracks), []);

  // Single values, so the screen re-renders on a track or play change, not on every progress tick.
  const trackId = usePlayerValue((state) => {
    const id = currentTrack(state)?.id ?? null;
    return id?.startsWith(RUQYAH_PREFIX) ? id : null;
  });
  const queueLength = usePlayerValue((state) => state.queue.length);
  const playing = usePlayerValue((state) => state.playing);
  const buffering = usePlayerValue((state) => state.buffering);
  const playingAll = trackId !== null && queueLength === fullQueue.length;
  const listenState: ListenState = playing ? "playing" : buffering ? "loading" : "paused";

  function playPassage(passage: RuqyahPassage) {
    if (isPassageTrack(trackId, passage) && !playingAll) {
      audio.toggle();
      return;
    }
    audio.playQueue(passageTracks(passage), 0);
  }

  function playAll() {
    if (playingAll) audio.toggle();
    else audio.playQueue(fullQueue, 0);
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <PageHeader
        back
        art={SECTION_ART.ruqyah}
        kicker="الرقية الشرعية"
        title="وننزّل من القرآن ما هو شفاء"
        description="آيات الرقية وأدعية النبي ﷺ الثابتة للشفاء والتحصين، تقرؤها أو تستمع إليها."
      />

      <Guidance />

      <View accessibilityRole="tablist" className="mx-4 mt-5 flex-row gap-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = id === tab;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(id)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 ${active ? "border-primary bg-primary" : "border-border bg-surface"}`}
            >
              <Icon size={16} color={active ? onPrimary : primary} />
              <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "quran" ? (
        <>
          <Button size="lg" icon={playingAll && playing ? Pause : Play} onPress={playAll} className="mx-4 mb-4 mt-4">
            {playingAll ? (playing ? "إيقاف مؤقت" : "متابعة الاستماع") : "استمع للرقية كاملة"}
          </Button>
          {RUQYAH_QURAN.map((passage) => {
            const current = isPassageTrack(trackId, passage);
            return (
              <PassageCard
                key={passage.id}
                passage={passage}
                state={current && !playingAll ? listenState : null}
                activeAyah={current ? Number(trackId!.split("-").at(-1)) : null}
                onPlay={() => playPassage(passage)}
              />
            );
          })}
        </>
      ) : (
        <View className="mt-4">
          {RUQYAH_SUNNAH.map((hadith) => (
            <HadithCard key={hadith.id} hadith={hadith} />
          ))}
        </View>
      )}

      <Text className="mx-6 mt-4 text-center font-sans text-xs leading-6 text-fg-muted">
        الآيات من نص المصحف برواية حفص، والأحاديث بدرجاتها من{" "}
        <Text className="underline" onPress={() => Linking.openURL("https://hadeethenc.com/ar/home").catch(() => {})}>
          موسوعة الأحاديث النبوية
        </Text>
        . الآيات غير المعلَّمة بحديث هي ما جرت عادة أهل العلم بالرقية به، والقرآن كله شفاء.
      </Text>
    </ScrollView>
  );
}
