import { ExternalLink, Info } from "lucide-react-native";
import { Linking, Pressable, Text, View } from "react-native";

import { QURAN_DUAS, SUNNAH_DUAS } from "@/core/khatmDua/khatmDuaData";
import { toArabicDigits } from "@/core/text/arabic";
import { useScaledText } from "@/theme/textScale";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * The khatm duas (the website's features/khatmDua/KhatmDuas.tsx): a note on what is (and isn't)
 * established, then the Quranic and prophetic duas. Shown on its own screen and under a finished khatma.
 */
export function KhatmDuas() {
  const accent = useThemeColor("accent-strong");
  const ayahMark = useThemeColor("accent");
  const muted = useThemeColor("fg-muted");
  const quranText = useScaledText(24, 50);
  const duaText = useScaledText(22, 44);

  return (
    <View className="gap-6">
      <View className="flex-row gap-3 rounded-3xl border border-accent/40 bg-accent-soft p-5">
        <Info size={20} color={accent} style={{ marginTop: 4 }} />
        <View className="flex-1 gap-2">
          <Text className="font-sans text-sm leading-7 text-fg">
            لم يثبت عن النبي ﷺ دعاء مخصوص بختم القرآن، وثبت عن أنس بن مالك رضي الله عنه أنه كان إذا ختم القرآن جمع أهله ودعا. فادعُ بما شئت
            من خيري الدنيا والآخرة، وأفضله ما جاء في القرآن والسنة.
          </Text>
          <Text className="font-sans text-sm leading-7 text-fg-muted">
            الدعاء المتداول المنسوب إلى شيخ الإسلام ابن تيمية لا تثبت نسبته إليه.
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <Text accessibilityRole="header" className="font-sans-bold text-base text-fg">
          من القرآن الكريم
        </Text>
        {QURAN_DUAS.map((dua) => (
          <View key={dua.key} className="rounded-3xl border border-border bg-surface p-5 shadow-card">
            <Text className="font-quran text-fg" style={quranText}>
              {/* The ellipsis in the UI face: it is not a Quranic character, and it is its own word. */}
              {dua.partial && <Text className="font-sans">… </Text>}
              {dua.text}
              <Text style={{ color: ayahMark }}>{` ﴿${toArabicDigits(dua.ayah)}﴾`}</Text>
            </Text>
            <Text className="mt-2 font-sans text-xs leading-5 text-fg-muted">
              {dua.surahName}، الآية {toArabicDigits(dua.ayah)}
              {dua.note && <Text className="text-accent-strong"> — {dua.note}</Text>}
            </Text>
          </View>
        ))}
      </View>

      <View className="gap-3">
        <Text accessibilityRole="header" className="font-sans-bold text-base text-fg">
          من السنة النبوية
        </Text>
        {SUNNAH_DUAS.map((dua) => (
          <View key={dua.id} className="rounded-3xl border border-border bg-surface p-5 shadow-card">
            <Text className="font-sans-bold text-sm text-accent-strong">{dua.title}</Text>
            {/* Amiri Quran: the Hafs face draws the Arabic comma these duas use as a dotted circle. */}
            <Text className="mt-2 font-quran-fallback text-fg" style={duaText}>
              {dua.dua}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              <View className="rounded-full bg-primary-soft px-2.5 py-0.5">
                <Text className="font-sans-bold text-xs text-primary">{dua.grade}</Text>
              </View>
              <Text className="font-sans text-xs text-fg-muted">{dua.attribution}</Text>
              <Pressable
                accessibilityRole="link"
                accessibilityHint="يفتح شرح الحديث على موسوعة الأحاديث النبوية"
                onPress={() => Linking.openURL(dua.url).catch(() => {})}
                hitSlop={8}
                className="ms-auto flex-row items-center gap-1"
              >
                <Text className="font-sans text-xs text-fg-muted underline">الشرح</Text>
                <ExternalLink size={12} color={muted} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
