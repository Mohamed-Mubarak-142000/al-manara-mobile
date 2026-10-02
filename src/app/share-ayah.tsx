import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, Share2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Ornament";
import { getSurah, getSurahAyahs } from "@/features/mushaf/mushaf";
import { useThemeColor } from "@/theme/useThemeColor";

type Style = "night" | "parchment" | "emerald";

/** Fixed colours: the image must look the same whatever theme the sharer's phone is in. */
const STYLES: Record<
  Style,
  { label: string; bg: string; card: string; ink: string; accent: string; muted: string; lightDivider: boolean }
> = {
  night: {
    label: "ليلي",
    bg: "#012a22",
    card: "#0d1d18",
    ink: "#ebe5d1",
    accent: "#d9b35a",
    muted: "rgba(235,229,209,0.6)",
    lightDivider: true,
  },
  parchment: { label: "ورقي", bg: "#f3ecdc", card: "#fffdf7", ink: "#1b2a24", accent: "#9c7a26", muted: "#68766e", lightDivider: false },
  emerald: {
    label: "زمردي",
    bg: "#003e32",
    card: "#005544",
    ink: "#fbf8f1",
    accent: "#e8d7a6",
    muted: "rgba(251,248,241,0.65)",
    lightDivider: true,
  },
};

/** An ayah as a ready-to-share card in the Al-Manara look, carrying the app's name. */
export default function ShareAyahScreen() {
  const params = useLocalSearchParams<{ surah: string; ayah: string }>();
  const surahNumber = Number(params.surah);
  const ayahNumber = Number(params.ayah);
  const insets = useSafeAreaInsets();
  const fg = useThemeColor("fg");
  const card = useRef<View>(null);
  const [style, setStyle] = useState<Style>("night");
  const [busy, setBusy] = useState(false);
  const ayah = getSurahAyahs(surahNumber).find((entry) => entry.ayah === ayahNumber);
  const colors = STYLES[style];

  async function share() {
    if (!card.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile" });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "مشاركة الآية" });
    } finally {
      setBusy(false);
    }
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

      {ayah && (
        <View ref={card} collapsable={false} style={{ backgroundColor: colors.bg }} className="rounded-[28px] p-5">
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.accent }}
            className="items-center rounded-[22px] border px-5 pb-5 pt-6"
          >
            <Text style={{ color: colors.accent }} className="font-sans-bold text-xs">
              قال الله تعالى
            </Text>
            <Text style={{ color: colors.ink }} className="mt-4 text-center font-quran text-[24px] leading-[52px]">
              {ayah.text} <Text style={{ color: colors.accent }}>﴿{toArabicDigits(ayah.ayah)}﴾</Text>
            </Text>
            <View className="my-4 w-1/2">
              <Divider tone={colors.lightDivider ? "light" : "gold"} />
            </View>
            <Text style={{ color: colors.muted }} className="font-sans-bold text-sm">
              سورة {getSurah(surahNumber)?.name} · الآية {toArabicDigits(ayah.ayah)}
            </Text>
          </View>
          <View className="mt-4 flex-row items-center justify-center gap-2">
            <Image source={require("@/assets/images/brand/logo.png")} contentFit="contain" style={{ width: 22, height: 22 }} />
            <Text style={{ color: colors.accent }} className="font-display-bold text-sm">
              تطبيق المنارة
            </Text>
          </View>
        </View>
      )}

      <View className="flex-row gap-2">
        {(Object.keys(STYLES) as Style[]).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected: key === style }}
            onPress={() => setStyle(key)}
            className={`flex-1 items-center rounded-2xl border-2 py-3 ${key === style ? "border-primary" : "border-border"}`}
            style={{ backgroundColor: STYLES[key].card }}
          >
            <Text style={{ color: STYLES[key].ink }} className="font-sans-bold text-sm">
              {STYLES[key].label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button variant="gold" size="lg" icon={Share2} onPress={share} disabled={busy || !ayah}>
        {busy ? "جارٍ التجهيز…" : "مشاركة كصورة"}
      </Button>
    </ScrollView>
  );
}
