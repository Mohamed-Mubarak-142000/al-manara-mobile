import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { useRef, useState, type RefObject } from "react";
import { Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { Divider } from "@/components/ui/Ornament";

export type CardStyle = "night" | "parchment" | "emerald";

/**
 * Fixed colours, like share-ayah: the image must look the same whatever theme the sharer's phone is in,
 * so these are deliberately not theme tokens.
 */
export const CARD_STYLES: Record<
  CardStyle,
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

export interface ShareCardContent {
  /** The small line above the text: «ذكر», «قال رسول الله ﷺ»… */
  kicker: string;
  text: string;
  /** Source / attribution under the divider. */
  source?: string;
  /** Dhikr is set in the Quranic face; hadith in the reading face. */
  face: "quran" | "sans";
}

/** Long texts get a smaller face so a long hadith still fits a phone-sized image. */
export function cardTextSize(text: string, face: ShareCardContent["face"]): { fontSize: number; lineHeight: number } {
  const long = text.length > 420;
  const medium = text.length > 200;
  if (face === "quran")
    return long ? { fontSize: 18, lineHeight: 38 } : medium ? { fontSize: 20, lineHeight: 42 } : { fontSize: 23, lineHeight: 48 };
  return long ? { fontSize: 15, lineHeight: 28 } : medium ? { fontSize: 17, lineHeight: 32 } : { fontSize: 19, lineHeight: 36 };
}

/**
 * The shareable image: a framed card in the Al-Manara look carrying the app's name. Sizes are fixed
 * pixels on purpose: the picture should not change with the sharer's text size setting.
 */
export function ShareCard({ content, style, cardRef }: { content: ShareCardContent; style: CardStyle; cardRef: RefObject<View | null> }) {
  const colors = CARD_STYLES[style];
  const size = cardTextSize(content.text, content.face);
  return (
    <View ref={cardRef} collapsable={false} style={{ backgroundColor: colors.bg }} className="rounded-[28px] p-5">
      <View
        style={{ backgroundColor: colors.card, borderColor: colors.accent }}
        className="items-center rounded-[22px] border px-5 pb-5 pt-6"
      >
        <Text style={{ color: colors.accent }} className="font-sans-bold text-xs">
          {content.kicker}
        </Text>
        <Text
          allowFontScaling={false}
          style={{ color: colors.ink, ...size }}
          className={`mt-4 text-center ${content.face === "quran" ? "font-quran-fallback" : "font-sans-semibold"}`}
        >
          {content.text}
        </Text>
        {content.source ? (
          <>
            <View className="my-4 w-1/2">
              <Divider tone={colors.lightDivider ? "light" : "gold"} />
            </View>
            <Text style={{ color: colors.muted }} className="text-center font-sans-bold text-sm">
              {content.source}
            </Text>
          </>
        ) : null}
      </View>
      <View className="mt-4 flex-row items-center justify-center gap-2">
        <Image source={require("@/assets/images/brand/logo.png")} contentFit="contain" style={{ width: 22, height: 22 }} />
        <Text style={{ color: colors.accent }} className="font-display-bold text-sm">
          تطبيق المنارة
        </Text>
      </View>
    </View>
  );
}

/** Captures a card as a PNG and opens the system share sheet. */
export function useShareImage(dialogTitle: string) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error("unavailable");
      const uri = await captureRef(cardRef, { format: "png", quality: 1, result: "tmpfile" });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle });
    } catch {
      setError("تعذّرت مشاركة الصورة على هذا الجهاز.");
    } finally {
      setBusy(false);
    }
  }

  return { cardRef, busy, error, share };
}
