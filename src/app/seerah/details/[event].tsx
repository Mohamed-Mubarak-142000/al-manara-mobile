import { useLocalSearchParams } from "expo-router";
import { History, Lightbulb, ScrollText, Users, type LucideIcon } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { eventById } from "@/core/seerah/seerahContent";
import { SEERAH_DETAILS } from "@/core/seerah/seerahDetails";
import { ScreenHeader } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { SECTION_ART } from "@/features/home/sectionArt";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

const ICONS: Record<string, LucideIcon> = {
  الخلفية: History,
  "ما جرى": ScrollText,
  "شخصيات في الحدث": Users,
  "دروس وعبر": Lightbulb,
};

/** "أبو طالب: ..." → the name in bold, then the rest. */
function Person({ text, style }: { text: string; style: object }) {
  const at = text.indexOf(":");
  if (at < 1 || at > 60) {
    return (
      <Text selectable className="font-sans text-fg" style={style}>
        {text}
      </Text>
    );
  }
  return (
    <Text selectable className="font-sans text-fg" style={style}>
      <Text className="font-sans-bold text-primary">{text.slice(0, at)}</Text>
      {text.slice(at)}
    </Text>
  );
}

/** A chapter's written "تفاصيل الحدث": the key facts, then the background, the events, the people and the lessons. */
export default function SeerahDetailsScreen() {
  const { event: id } = useLocalSearchParams<{ event: string }>();
  const event = eventById(id);
  const details = id ? SEERAH_DETAILS[id] : undefined;
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const primary = useThemeColor("primary");
  const body = useScaledText(16, 34);
  const small = useScaledText(15, 30);

  if (!event || !details) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="تفاصيل الحدث" />
        <StateMessage message="تفاصيل هذا الفصل تُكتب الآن، وستصل قريبًا بإذن الله." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="تفاصيل الحدث" subtitle={event.title} art={SECTION_ART.seerah} />
      <ScrollView
        contentContainerClassName="gap-6 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap gap-2">
          {details.facts.map((fact) => (
            <View key={fact.label} className="min-w-[46%] flex-1 rounded-2xl border border-border bg-surface px-4 py-3">
              <Text className="font-sans-bold text-xs text-accent-strong">{fact.label}</Text>
              <Text className="mt-0.5 font-sans-bold text-sm leading-6 text-fg">{fact.value}</Text>
            </View>
          ))}
        </View>

        {details.sections.map((section) => {
          const Icon = ICONS[section.title] ?? ScrollText;
          const people = section.title === "شخصيات في الحدث";
          const lessons = section.title === "دروس وعبر";
          return (
            <View key={section.title} className="gap-3">
              <View className="flex-row items-center gap-2">
                <View className="size-9 items-center justify-center rounded-xl bg-primary-soft">
                  <Icon size={18} color={primary} />
                </View>
                <Text className="font-sans-bold text-lg text-fg">{section.title}</Text>
              </View>
              {section.paragraphs.map((paragraph, index) =>
                lessons ? (
                  <View key={index} className="flex-row gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3">
                    <View className="mt-3 size-2 rounded-full bg-gold" />
                    <Text selectable className="flex-1 font-sans text-fg" style={small}>
                      {paragraph}
                    </Text>
                  </View>
                ) : people ? (
                  <View key={index} className="border-s-2 border-accent/40 ps-3">
                    <Person text={paragraph} style={small} />
                  </View>
                ) : (
                  <Text key={index} selectable className="font-sans text-fg" style={body}>
                    {paragraph}
                  </Text>
                ),
              )}
            </View>
          );
        })}

        <Text className="font-sans text-xs leading-5 text-fg-muted">
          بأسلوبنا على ما في «الرحيق المختوم» وكتب السيرة المعتمدة، مقتصرين على ما اتفقت عليه المصادر، وما اختُلف فيه ذُكر الخلاف أو تُرك.
        </Text>
      </ScrollView>
    </View>
  );
}
