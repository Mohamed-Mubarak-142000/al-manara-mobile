import { Palette } from "lucide-react-native";
import { Text, View } from "react-native";

import { TAJWEED_LEGEND } from "@/core/quran/tajweedLegend";
import { BottomSheet } from "@/components/ui/BottomSheet";

/** What each tajweed colour on the page means, in the colours the page draws them in (`dark`: a dark reader theme). */
export function TajweedLegendSheet({ visible, dark, onClose }: { visible: boolean; dark: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="ألوان التجويد" icon={Palette} maxHeight={0.85}>
      <View className="gap-2">
        {TAJWEED_LEGEND.map((entry) => (
          <View key={entry.label} className="flex-row items-start gap-3 rounded-2xl border border-border bg-surface p-3.5">
            <View className="mt-1 size-4 rounded-full" style={{ backgroundColor: dark ? entry.dark : entry.light }} />
            <View className="flex-1 gap-0.5">
              <Text className="font-sans-bold text-sm text-fg">{entry.label}</Text>
              <Text className="font-sans text-xs leading-5 text-fg-muted">{entry.explanation}</Text>
            </View>
          </View>
        ))}
        <Text className="mt-1 font-sans text-xs leading-5 text-fg-muted">
          مصحف التجويد الملوّن من طبعة مجمع الملك فهد ١٤٢١هـ، وتبدأ فيه ٢٥ صفحة بآية تختلف قليلًا عن طبعة ١٤٠٥هـ.
        </Text>
      </View>
    </BottomSheet>
  );
}
