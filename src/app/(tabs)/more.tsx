import { LayoutGrid } from "lucide-react-native";

import { PageHeader } from "@/components/ui/PageHeader";
import { Screen, Section } from "@/components/ui/Screen";
import { SectionGrid } from "@/features/home/SectionGrid";

export default function MoreScreen() {
  return (
    <Screen bleed>
      <PageHeader
        kicker="المزيد"
        icon={LayoutGrid}
        title="أقسام المنارة"
        description="الإذاعة والأحاديث والابتهالات والأذكار والأطفال، وكل ما في الموقع."
      />
      <Section className="mt-5">
        <SectionGrid />
      </Section>
    </Screen>
  );
}
