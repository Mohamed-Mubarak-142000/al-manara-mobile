import { router, useLocalSearchParams } from "expo-router";
import { BookMarked, ChevronDown, ChevronUp, CircleCheck, ImageIcon, Library, ScrollText, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton, ScreenHeader, enterSoft } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";
import { getHadithOffline } from "@/features/hadith/offlineHadith";
import { HadithChip, HadithPanel, HadithText } from "@/features/hadith/HadithPanel";
import { useAsync } from "@/features/hadith/useAsync";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/** The website's HadithView: the hadith, its explanation, benefits, word meanings and references. */
export default function HadithScreen() {
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  const { state, reload } = useAsync(id, () => getHadithOffline(id));
  const [showReferences, setShowReferences] = useState(false);

  async function share() {
    if (state.status !== "ready") return;
    const hadith = state.data;
    const link = SITE_URL ? `\n${SITE_URL}/hadith/${hadith.id}` : "";
    await Share.share({ message: `${hadith.text}\n${hadith.attribution}${link}` });
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <ScreenHeader
        title={category ? `أحاديث ${category}` : "كل الأحاديث"}
        actions={
          state.status === "ready" ? (
            <>
              <IconButton
                icon={ImageIcon}
                label="مشاركة الحديث كصورة"
                onPress={() => router.push({ pathname: "/share-card", params: { kind: "hadith", id } })}
              />
              <IconButton icon={Share2} label="مشاركة نص الحديث" onPress={share} />
            </>
          ) : undefined
        }
      />

      {state.status === "loading" ? (
        <StateMessage loading />
      ) : state.status === "error" ? (
        <StateMessage message="تعذّر تحميل الحديث الآن، حاول بعد قليل." onRetry={reload} />
      ) : (
        <View className="gap-4 px-4 pt-2">
          <Animated.Text entering={enterSoft(0)} className="mb-1 font-sans-bold text-xl leading-9 text-fg">
            {state.data.title}
          </Animated.Text>
          <HadithPanel title="الحديث" icon={ScrollText}>
            {state.data.intro ? <Text className="mb-1 font-sans text-base leading-8 text-fg-muted">{state.data.intro}</Text> : null}
            <HadithText text={state.data.text} />
            <View className="mt-5 flex-row flex-wrap items-center gap-2">
              {state.data.attribution ? <HadithChip label="التخريج" value={state.data.attribution} /> : null}
              {state.data.grade ? <HadithChip label="الدرجة" value={state.data.grade} /> : null}
              <Pressable
                accessibilityRole="button"
                onPress={share}
                className="flex-row items-center gap-1.5 rounded-full border border-primary bg-surface px-3 py-1.5"
              >
                <Share2 size={14} color={primary} />
                <Text className="font-sans-bold text-sm text-primary">مشاركة</Text>
              </Pressable>
            </View>
          </HadithPanel>
          {state.data.explanation ? (
            <HadithPanel title="شرح الحديث" icon={BookMarked}>
              <View className="gap-4">
                {state.data.explanation.split(/\n+/).map((paragraph, index) => (
                  <Text key={index} className="font-sans text-lg leading-9.5 text-fg">
                    {paragraph}
                  </Text>
                ))}
              </View>
            </HadithPanel>
          ) : null}
          {state.data.benefits.length > 0 && (
            <HadithPanel title="من فوائد الحديث" icon={CircleCheck}>
              <View className="gap-3">
                {state.data.benefits.map((benefit, index) => (
                  <View key={index} className="flex-row gap-3">
                    <View className="mt-2">
                      <CircleCheck size={20} color={primary} />
                    </View>
                    <Text className="flex-1 font-sans text-lg leading-9 text-fg">{benefit}</Text>
                  </View>
                ))}
              </View>
            </HadithPanel>
          )}
          {state.data.words.length > 0 && (
            <HadithPanel title="معاني الكلمات" icon={Library}>
              {state.data.words.map((entry, index) => (
                <View key={index} className={`gap-1 pb-3 ${index > 0 ? "border-t border-border pt-3" : ""}`}>
                  <Text className="font-sans-bold text-base text-primary-strong">{entry.word}</Text>
                  <Text className="font-sans text-base leading-8 text-fg">{entry.meaning}</Text>
                </View>
              ))}
            </HadithPanel>
          )}
          {state.data.references.length > 0 && (
            <View className="rounded-3xl border border-border bg-surface p-5 shadow-card">
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowReferences((value) => !value)}
                className="flex-row items-center justify-between"
              >
                <Text className="font-sans-bold text-base text-fg">المراجع</Text>
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
