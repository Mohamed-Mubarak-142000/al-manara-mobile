import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageHeader } from "@/components/ui/PageHeader";
import { useMiniPlayerInset } from "@/features/audio/MiniPlayer";
import { SECTION_ART } from "@/features/home/sectionArt";
import { SectionGrid } from "@/features/home/SectionGrid";

/** Every built section of the app in the same tiles as Home, grouped. Opened from Home's "كل الأقسام". */
export default function SectionsScreen() {
  const insets = useSafeAreaInsets();
  const miniPlayer = useMiniPlayerInset();

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + miniPlayer + 32 }}>
      <PageHeader
        back
        kicker="أقسام المنارة"
        art={SECTION_ART.sections}
        title="كل الأقسام"
        description="القرآن، ويومك، ورحلتك في الحفظ، والأدعية — كل قسم في مكانه."
      />

      <View className="px-4">
        <SectionGrid />
      </View>
    </ScrollView>
  );
}
