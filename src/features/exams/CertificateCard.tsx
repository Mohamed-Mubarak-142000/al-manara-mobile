import { Image } from "expo-image";
import { forwardRef } from "react";
import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { toArabicDigits } from "@/core/text/arabic";
import { Divider } from "@/components/ui/Ornament";

import { juzOrdinal } from "./juzNames";

export interface CertificateData {
  juz: number;
  holder_name: string;
  score: number;
  total: number;
  issued_at: string;
  verification_code: string;
}

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

function formatDate(iso: string, calendar: "gregory" | "islamic-umalqura"): string {
  try {
    return new Intl.DateTimeFormat(calendar === "gregory" ? "ar-EG" : "ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * The juz certificate in the website's parchment-and-gold design, drawn with fixed colours (not the
 * theme) because it is saved and shared as an image. The QR code opens the website's verification page.
 */
export const CertificateCard = forwardRef<View, { certificate: CertificateData }>(function CertificateCard({ certificate }, ref) {
  const verifyUrl = SITE_URL ? `${SITE_URL}/certificates/${certificate.verification_code}` : certificate.verification_code;
  return (
    <View ref={ref} collapsable={false} style={{ backgroundColor: "#fbf8f1" }} className="rounded-[28px] p-2">
      <View className="items-center rounded-[22px] border-2 px-5 py-6" style={{ borderColor: "#cda23e", backgroundColor: "#fffdf7" }}>
        <Image source={require("@/assets/images/brand/logo.png")} contentFit="contain" style={{ width: 64, height: 64 }} />
        <Text className="mt-2 font-sans-bold text-xs" style={{ color: "#9c7a26" }}>
          منصة المنارة لتعليم القرآن الكريم
        </Text>
        <Text className="mt-4 font-display-black text-3xl" style={{ color: "#003e32" }}>
          شهادة إتمام
        </Text>
        <View className="my-4 w-2/3">
          <Divider />
        </View>
        <Text className="font-sans text-sm" style={{ color: "#68766e" }}>
          تشهد منصة المنارة بأن
        </Text>
        <Text className="mt-2 text-center font-display-bold text-2xl" style={{ color: "#183d34" }}>
          {certificate.holder_name}
        </Text>
        <Text className="mt-3 text-center font-sans text-base leading-8" style={{ color: "#183d34" }}>
          قد أتم حفظ الجزء {juzOrdinal(certificate.juz)} من القرآن الكريم، واجتاز اختباره بدرجة {toArabicDigits(certificate.score)} من{" "}
          {toArabicDigits(certificate.total)}.
        </Text>
        <Text className="mt-3 font-sans text-xs" style={{ color: "#68766e" }}>
          {formatDate(certificate.issued_at, "islamic-umalqura")} · {formatDate(certificate.issued_at, "gregory")}
        </Text>
        <View className="mt-5 flex-row items-center gap-4">
          <View className="rounded-xl bg-white p-2">
            <QRCode value={verifyUrl} size={76} color="#003e32" backgroundColor="#ffffff" />
          </View>
          <View>
            <Text className="font-sans text-xs" style={{ color: "#68766e" }}>
              رمز التحقق
            </Text>
            <Text className="font-display-bold text-lg" style={{ color: "#003e32", letterSpacing: 1 }}>
              {certificate.verification_code}
            </Text>
            <Text className="font-sans text-[10px]" style={{ color: "#68766e" }}>
              امسح الرمز للتحقق من الشهادة
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});
