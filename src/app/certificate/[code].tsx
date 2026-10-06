import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight, Share2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { CertificateCard, type CertificateData } from "@/features/exams/CertificateCard";
import { supabase } from "@/lib/supabase";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { useThemeColor } from "@/theme/useThemeColor";

/** One of the user's certificates, ready to share as an image. */
export default function CertificateScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();
  const fg = useThemeColor("fg");
  const card = useRef<View>(null);
  // Without Supabase there is nothing to look up: start at "not found" instead of loading.
  const [certificate, setCertificate] = useState<CertificateData | null | undefined>(supabase ? undefined : null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("certificates")
      .select("juz, holder_name, score, total, issued_at, verification_code, revoked_at")
      .eq("verification_code", code)
      .maybeSingle()
      .then(({ data }) => setCertificate(data && !data.revoked_at ? data : null));
  }, [code]);

  async function share() {
    if (!card.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile" });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "مشاركة الشهادة" });
    } finally {
      setSharing(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + miniPlayer + 32, paddingHorizontal: 16 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => router.back()}
        hitSlop={12}
        className="mb-3 self-start p-1"
      >
        <ChevronRight size={26} color={fg} />
      </Pressable>
      {certificate === undefined ? (
        <StateMessage loading />
      ) : certificate === null ? (
        <StateMessage message="لم نجد هذه الشهادة في حسابك." />
      ) : (
        <View className="gap-5">
          <CertificateCard ref={card} certificate={certificate} />
          <Button variant="gold" size="lg" icon={Share2} onPress={share} disabled={sharing}>
            {sharing ? "جارٍ التجهيز…" : "مشاركة الشهادة"}
          </Button>
          <Text className="text-center font-sans text-xs leading-5 text-fg-muted">
            يمكن لأي شخص التحقق من الشهادة بمسح الرمز أو من موقع المنارة.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
