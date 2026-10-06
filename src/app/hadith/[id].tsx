import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, ChevronRight, ChevronUp, ImageIcon, Share2 } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StateMessage } from "@/components/ui/StateMessage";
import { getHadithOffline } from "@/features/hadith/offlineHadith";
import { useAsync } from "@/features/hadith/useAsync";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2 rounded-3xl border border-border bg-surface p-5">
      <Text className="font-sans-bold text-sm text-accent-strong">{title}</Text>
      {children}
    </View>
  );
}

/** The Prophet's words (between «») in the brand colour, like the website's HadithView. */
function HadithText({ text }: { text: string }) {
  const parts = text.split(/(«[^»]*»)/g);
  return (
    <Text className="font-sans-semibold text-lg leading-9 text-fg">
      {parts.map((part, index) =>
        part.startsWith("«") ? (
          <Text key={index} className="text-primary">
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

export default function HadithScreen() {
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const fg = useThemeColor("fg");
  const muted = useThemeColor("fg-muted");
  const { state, reload } = useAsync(id, () => getHadithOffline(id));
  const [showReferences, setShowReferences] = useState(false);

  async function share() {
    if (state.status !== "ready") return;
    const hadith = state.data;
    const link = SITE_URL ? `\n${SITE_URL}/hadith/${hadith.id}` : "";
    await Share.share({ message: `${hadith.text}\n${hadith.attribution}${link}` });
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + miniPlayer + 32 }}
    >
      <View className="flex-row items-center justify-between px-3">
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12} className="flex-row items-center gap-1 p-1">
          <ChevronRight size={24} color={fg} />
          <Text className="font-sans-bold text-sm text-fg">{category ? `أحاديث ${category}` : "كل الأحاديث"}</Text>
        </Pressable>
        {state.status === "ready" && (
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مشاركة الحديث كصورة"
              onPress={() => router.push({ pathname: "/share-card", params: { kind: "hadith", id } })}
              hitSlop={10}
              className="p-2"
            >
              <ImageIcon size={20} color={muted} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="مشاركة نص الحديث" onPress={share} hitSlop={10} className="p-2">
              <Share2 size={20} color={muted} />
            </Pressable>
          </View>
        )}
      </View>

      {state.status === "loading" ? (
        <StateMessage loading />
      ) : state.status === "error" ? (
        <StateMessage message="تعذّر تحميل الحديث الآن، حاول بعد قليل." onRetry={reload} />
      ) : (
        <View className="gap-4 px-4 pt-3">
          <Text className="font-display-bold text-xl leading-9 text-fg">{state.data.title}</Text>
          <Panel title="الحديث">
            {state.data.intro ? <Text className="font-sans text-base leading-8 text-fg-muted">{state.data.intro}</Text> : null}
            <HadithText text={state.data.text} />
            <View className="mt-2 flex-row flex-wrap gap-2">
              {state.data.attribution ? (
                <View className="rounded-full bg-primary-soft px-3 py-1">
                  <Text className="font-sans-bold text-xs text-primary">التخريج: {state.data.attribution}</Text>
                </View>
              ) : null}
              {state.data.grade ? (
                <View className="rounded-full bg-accent-soft px-3 py-1">
                  <Text className="font-sans-bold text-xs text-accent-strong">الدرجة: {state.data.grade}</Text>
                </View>
              ) : null}
            </View>
          </Panel>
          {state.data.explanation ? (
            <Panel title="شرح الحديث">
              <Text className="font-sans text-base leading-8 text-fg">{state.data.explanation}</Text>
            </Panel>
          ) : null}
          {state.data.benefits.length > 0 && (
            <Panel title="من فوائد الحديث">
              {state.data.benefits.map((benefit, index) => (
                <View key={index} className="flex-row gap-2">
                  <Text className="font-sans-bold text-base text-accent-strong">•</Text>
                  <Text className="flex-1 font-sans text-base leading-8 text-fg">{benefit}</Text>
                </View>
              ))}
            </Panel>
          )}
          {state.data.words.length > 0 && (
            <Panel title="معاني الكلمات">
              {state.data.words.map((entry, index) => (
                <Text key={index} className="font-sans text-base leading-8 text-fg">
                  <Text className="font-sans-bold text-primary">{entry.word}: </Text>
                  {entry.meaning}
                </Text>
              ))}
            </Panel>
          )}
          {state.data.references.length > 0 && (
            <View className="rounded-3xl border border-border bg-surface p-5">
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowReferences((value) => !value)}
                className="flex-row items-center justify-between"
              >
                <Text className="font-sans-bold text-sm text-accent-strong">المراجع</Text>
                {showReferences ? <ChevronUp size={18} color={muted} /> : <ChevronDown size={18} color={muted} />}
              </Pressable>
              {showReferences &&
                state.data.references.map((reference, index) => (
                  <Text key={index} className="mt-2 font-sans text-sm leading-7 text-fg-muted">
                    {reference}
                  </Text>
                ))}
            </View>
          )}
          <Text className="text-center font-sans text-xs text-fg-muted">المصدر: موسوعة الأحاديث النبوية</Text>
        </View>
      )}
    </ScrollView>
  );
}
