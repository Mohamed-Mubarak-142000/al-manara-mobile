import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  MapPin,
  Pause,
  ScrollText,
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";

import { DUAS } from "@/core/adhkar/duasData";
import { toArabicDigits } from "@/core/text/arabic";
import { HADITHS, MIQATS, VERSES, type Block, type HadithKey, type VerseKey } from "@/core/umrah/umrahGuide";
import { dhikrTrack, useListenState } from "@/features/adhkar/dhikrTrack";
import { audio, type Track } from "@/features/audio/playerStore";
import { ayahSource } from "@/features/downloads/ayahPacks";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

import { SaiCounter, TawafCounter } from "./Counters";
import { updateUmrah, useUmrah } from "./umrahStore";

/** A size grown by both the app's text size and the guide's own text-size control (the website's zoom). */
export function useUmrahText(fontSize: number, lineHeight: number) {
  const { scale } = useUmrah();
  return useScaledText(fontSize * scale, lineHeight * scale);
}

/** Play a track in the shared player (the mini player shows it), or pause/resume it if it's the one loaded. */
function ListenButton({ track, label, tone = "light" }: { track: Track; label: string; tone?: "light" | "dark" }) {
  const state = useListenState(track.id);
  const onPrimary = useThemeColor("on-primary");
  const primary = useThemeColor("primary");
  const color = state || tone === "dark" ? onPrimary : primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={state === "playing" ? `إيقاف ${label} مؤقتًا` : `استماع: ${label}`}
      onPress={() => (state ? audio.toggle() : audio.playTrack(track))}
      className={`h-10 flex-row items-center gap-1.5 rounded-full px-4 ${state ? "bg-primary" : tone === "dark" ? "bg-white/15" : "bg-primary-soft"}`}
    >
      {state === "loading" ? (
        <ActivityIndicator size="small" color={color} />
      ) : state === "playing" ? (
        <Pause size={16} color={color} fill={color} />
      ) : (
        <Volume2 size={16} color={color} />
      )}
      <Text className={`font-sans-bold text-sm ${state || tone === "dark" ? "text-on-primary" : "text-primary"}`}>
        {state === "playing" ? "إيقاف" : "استمع"}
      </Text>
    </Pressable>
  );
}

function DuaBlock({ id, when }: { id: string; when?: string }) {
  const duaText = useUmrahText(21, 42);
  const dua = DUAS.find((entry) => entry.id === id);
  if (!dua) return null;
  return (
    <View className="rounded-3xl border border-border bg-surface p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          {when && <Text className="font-sans-bold text-xs text-accent-strong">{when}</Text>}
          <Text className="font-sans-bold text-base text-fg">{dua.title}</Text>
        </View>
        <ListenButton track={dhikrTrack(dua)} label={dua.title} />
      </View>
      {/* Amiri Quran, as on the adhkar cards: the Hafs face draws the Arabic comma as a dotted circle. */}
      <Text className="mt-3 font-quran-fallback text-fg" style={duaText}>
        {dua.text}
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(dua.sourceUrl).catch(() => {})}
        hitSlop={6}
        className="mt-1 self-start"
      >
        <Text className="font-sans text-xs text-fg-muted underline">{dua.source}</Text>
      </Pressable>
    </View>
  );
}

function VerseBlock({ verseKey, when }: { verseKey: VerseKey; when?: string }) {
  const verse = VERSES[verseKey];
  const quranText = useUmrahText(23, 48);
  const label = `سورة البقرة، الآية ${toArabicDigits(verse.ayah)}`;
  const track: Track = {
    id: `umrah-verse-${verse.audio}`,
    title: label,
    artist: "مشاري العفاسي",
    // A saved Alafasy pack plays from the device, the stream as backup.
    ...ayahSource("alafasy", verse.surah, verse.ayah),
  };
  return (
    <View className="rounded-3xl bg-hero p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          {when && <Text className="font-sans-bold text-xs text-gold-soft">{when}</Text>}
          <Text className="font-sans text-sm text-white/75">{label}</Text>
        </View>
        <ListenButton track={track} label={label} tone="dark" />
      </View>
      <Text className="mt-3 font-quran text-hero-fg" style={quranText}>
        {/* The ellipsis in the UI face, as its own word: it is not a Quranic character. */}
        {verse.partial && <Text className="font-sans">… </Text>}﴿{verse.text}﴾
      </Text>
    </View>
  );
}

function EvidenceBlock({ keys }: { keys: HadithKey[] }) {
  const [open, setOpen] = useState(false);
  const accent = useThemeColor("accent-strong");
  const muted = useThemeColor("fg-muted");
  const body = useUmrahText(15, 30);
  return (
    <View className="rounded-3xl border border-border bg-surface-alt p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className="flex-row items-center gap-2"
      >
        <ScrollText size={20} color={accent} />
        <Text className="flex-1 font-sans-bold text-base text-fg">الدليل من السنة</Text>
        {!open && <Text className="font-sans text-xs text-fg-muted">{toArabicDigits(keys.length)} حديث</Text>}
        {open ? <ChevronUp size={18} color={muted} /> : <ChevronDown size={18} color={muted} />}
      </Pressable>
      {open && (
        <View className="mt-3 gap-4">
          {keys.map((key, index) => {
            const hadith = HADITHS[key];
            return (
              <View key={key} className={index > 0 ? "border-t border-border pt-3" : ""}>
                <Text className="font-sans text-fg" style={body}>
                  {hadith.text}
                </Text>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <View className="rounded-full bg-primary-soft px-2.5 py-0.5">
                    <Text className="font-sans-bold text-xs text-primary">{hadith.grade}</Text>
                  </View>
                  <Text className="font-sans text-xs text-fg-muted">{hadith.attribution}</Text>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityHint="يفتح شرح الحديث على موسوعة الأحاديث النبوية"
                    onPress={() => Linking.openURL(hadith.url).catch(() => {})}
                    hitSlop={8}
                    className="ms-auto flex-row items-center gap-1"
                  >
                    <Text className="font-sans text-xs text-fg-muted underline">الشرح</Text>
                    <ExternalLink size={12} color={muted} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Literal class names per tone, so Tailwind finds them. */
const NOTE_STYLES: Record<
  "info" | "mistake" | "women",
  { icon: LucideIcon; box: string; title: string; color: "accent-strong" | "danger" | "tile-sky" }
> = {
  info: { icon: Info, box: "border-accent/40 bg-accent-soft", title: "text-accent-strong", color: "accent-strong" },
  mistake: { icon: AlertTriangle, box: "border-danger/30 bg-danger/5", title: "text-danger", color: "danger" },
  women: { icon: Users, box: "border-tile-sky/30 bg-tile-sky/10", title: "text-tile-sky", color: "tile-sky" },
};

function NoteBlock({ tone, title, items }: { tone: keyof typeof NOTE_STYLES; title: string; items: string[] }) {
  const style = NOTE_STYLES[tone];
  const color = useThemeColor(style.color);
  const body = useUmrahText(15, 28);
  const Icon = style.icon;
  return (
    <View className={`rounded-3xl border p-5 ${style.box}`}>
      <View className="flex-row items-center gap-2">
        <Icon size={20} color={color} />
        <Text className={`font-sans-bold text-base ${style.title}`}>{title}</Text>
      </View>
      <View className="mt-2 gap-1.5">
        {items.map((item) => (
          <View key={item} className="flex-row gap-2">
            <Text className={`font-sans ${style.title}`} style={body}>
              •
            </Text>
            <Text className="flex-1 font-sans text-fg" style={body}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MiqatPicker() {
  const { origin } = useUmrah();
  const accent = useThemeColor("accent-strong");
  const body = useUmrahText(15, 28);
  const chosen = MIQATS.find((entry) => entry.id === origin) ?? MIQATS[0]!;
  return (
    <View className="rounded-3xl border border-border bg-surface p-5">
      <Text accessibilityRole="header" className="font-sans-bold text-base text-fg">
        من أين ستبدأ رحلتك؟
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="مكان الانطلاق" className="mt-3 flex-row flex-wrap gap-2">
        {MIQATS.map((entry) => {
          const active = entry.id === chosen.id;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => updateUmrah((current) => ({ ...current, origin: entry.id }))}
              className={`rounded-full border px-4 py-2 ${active ? "border-primary bg-primary" : "border-border bg-bg"}`}
            >
              <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg-muted"}`}>{entry.from}</Text>
            </Pressable>
          );
        })}
      </View>
      <View className="mt-4 flex-row gap-3 rounded-2xl bg-accent-soft p-4">
        <MapPin size={24} color={accent} style={{ marginTop: 4 }} />
        <View className="flex-1">
          <Text className="font-sans text-sm text-fg-muted">ميقاتك</Text>
          <Text className="font-sans-bold text-xl text-fg">{chosen.miqat}</Text>
          <Text className="mt-1 font-sans text-fg" style={body}>
            {chosen.detail}
          </Text>
        </View>
      </View>
    </View>
  );
}

function StepsBlock({ items }: { items: string[] }) {
  const body = useUmrahText(15, 28);
  return (
    <View className="gap-3">
      {items.map((item, index) => (
        <View key={item} className="flex-row gap-3">
          <View className="size-7 items-center justify-center rounded-full bg-primary-soft">
            <Text className="font-sans-bold text-sm text-primary">{toArabicDigits(index + 1)}</Text>
          </View>
          <Text className="flex-1 font-sans text-fg" style={body}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "text":
      return <TextBlock text={block.text} />;
    case "steps":
      return <StepsBlock items={block.items} />;
    case "dua":
      return <DuaBlock id={block.id} when={block.when} />;
    case "verse":
      return <VerseBlock verseKey={block.key} when={block.when} />;
    case "evidence":
      return <EvidenceBlock keys={block.keys} />;
    case "note":
      return <NoteBlock tone={block.tone} title={block.title} items={block.items} />;
    case "miqat":
      return <MiqatPicker />;
    case "tawaf":
      return <TawafCounter />;
    case "sai":
      return <SaiCounter />;
  }
}

function TextBlock({ text }: { text: string }) {
  const body = useUmrahText(16, 30);
  return (
    <Text className="font-sans text-fg" style={body}>
      {text}
    </Text>
  );
}
