import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DUAS } from "@/core/adhkar/duasData";
import { Button } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { getHadithOffline } from "@/features/hadith/offlineHadith";
import { useAsync } from "@/features/hadith/useAsync";
import { CARD_STYLES, ShareCard, useShareImage, type CardStyle, type ShareCardContent } from "@/features/share/ShareCard";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * A dhikr or a hadith as a ready-to-share image (the same look as share-ayah).
 * /share-card?kind=dhikr&id=<dua id> or /share-card?kind=hadith&id=<hadith id>.
 */
export default function ShareCardScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: "dhikr" | "hadith"; id: string }>();
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const [style, setStyle] = useState<CardStyle>("night");
  const { cardRef, busy, error, share } = useShareImage(kind === "hadith" ? "مشاركة الحديث" : "مشاركة الذكر");
  const hadith = useAsync(kind === "hadith" ? id : "", () => (kind === "hadith" ? getHadithOffline(id) : Promise.resolve(null)));

  let content: ShareCardContent | null = null;
  if (kind === "dhikr") {
    const dua = DUAS.find((entry) => entry.id === id);
    if (dua) content = { kicker: dua.title, text: dua.text, source: dua.source, face: "quran" };
  } else if (hadith.state.status === "ready") {
    const data = hadith.state.data;
    content = { kicker: "قال رسول الله ﷺ", text: data.text, source: data.attribution || undefined, face: "sans" };
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, paddingHorizontal: 16, gap: 16 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
        onPress={() => router.back()}
        hitSlop={12}
        className="self-start p-1"
      >
        <ChevronDown size={28} color={fg} />
      </Pressable>

      {content ? (
        <ShareCard content={content} style={style} cardRef={cardRef} />
      ) : kind === "hadith" && hadith.state.status === "loading" ? (
        <StateMessage loading />
      ) : kind === "hadith" && hadith.state.status === "error" ? (
        <StateMessage message="تعذّر تحميل الحديث الآن، حاول بعد قليل." onRetry={hadith.reload} />
      ) : (
        <StateMessage message="لم نجد هذا النص." />
      )}

      <View className="flex-row gap-2">
        {(Object.keys(CARD_STYLES) as CardStyle[]).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={`نمط ${CARD_STYLES[key].label}`}
            accessibilityState={{ selected: key === style }}
            onPress={() => setStyle(key)}
            className={`flex-1 items-center rounded-2xl border-2 py-3 ${key === style ? "border-primary" : "border-border"}`}
            style={{ backgroundColor: CARD_STYLES[key].card }}
          >
            <Text style={{ color: CARD_STYLES[key].ink }} className="font-sans-bold text-sm">
              {CARD_STYLES[key].label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text className="text-center font-sans text-sm text-danger">{error}</Text> : null}
      <Button variant="gold" size="lg" icon={Share2} onPress={share} disabled={busy || !content}>
        {busy ? "جارٍ التجهيز…" : "مشاركة كصورة"}
      </Button>
    </ScrollView>
  );
}
