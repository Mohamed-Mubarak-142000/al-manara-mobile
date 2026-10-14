import { HandHeart } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageHeader } from "@/components/ui/PageHeader";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { KhatmDuas } from "@/features/khatmDua/KhatmDuas";

/** "دعاء ختم القرآن": opened from the sections, the mushaf's last page and a finished khatma. */
export default function KhatmDuaScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <PageHeader
        back
        icon={HandHeart}
        kicker="دعاء ختم القرآن"
        title="ربنا تقبّل منا"
        description="أتممت القرآن؛ فادعُ الله بما تحب، وهذه أدعية جامعة من القرآن والسنة."
      />
      <View className="px-4">
        <KhatmDuas />
      </View>
    </ScrollView>
  );
}
