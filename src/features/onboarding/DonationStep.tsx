import { Check, ChevronLeft, HandHeart, Palette } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { StepLayout } from "@/features/onboarding/OnboardingStep";
import { tapHaptic } from "@/features/onboarding/SetupSteps";
import { DONATIONS, SUPPORTER_PERKS, useSupporter } from "@/features/support/supportStore";
import { useThemeColor } from "@/theme/useThemeColor";

/** Same copy as the supporter pack on the support screen. */

/**
 * Optional last step. Nothing is bought here: prices and the purchase itself live on /support, so this
 * step never opens a store connection and cannot fail when in-app purchases are unavailable.
 */
export function DonationStep({ onDonate }: { onDonate: () => void }) {
  const goldSoft = useThemeColor("gold-soft");
  const supporter = useSupporter();

  return (
    <StepLayout
      icon={HandHeart}
      eyebrow="صدقة جارية · اختياري"
      title="ادعم المنارة"
      subtitle="المنارة مجانية بالكامل، بلا إعلانات ولا اشتراكات، وستبقى كذلك بإذن الله."
    >
      <View className="gap-2 rounded-2xl border border-gold/30 bg-gold/10 p-4">
        <Text className="text-center font-display-bold text-base leading-8 text-gold-soft">
          «إذا مات الإنسان انقطع عنه عمله إلا من ثلاثة: إلا من صدقة جارية…»
        </Text>
        <Text className="text-center font-sans text-xs text-white/60">رواه مسلم</Text>
      </View>
      <Text className="font-sans text-sm leading-7 text-white/80">
        كل آية تُقرأ وكل أذان يُرفع عبر المنارة قد يكون في ميزانك. دعمك يغطي الخوادم، ويضيف قرّاءً وروايات ومحتوى للأطفال.
      </Text>

      <View className="gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
        <View className="flex-row items-center gap-3">
          <Palette size={20} color={goldSoft} />
          <View className="flex-1">
            <Text className="font-display-bold text-base text-white">باقة الداعمين</Text>
            <Text className="font-sans text-xs text-white/60">مرة واحدة مدى الحياة · بلا اشتراك</Text>
          </View>
          {supporter ? <Text className="font-sans-bold text-xs text-gold-soft">أنت من الداعمين ✓</Text> : null}
        </View>
        {SUPPORTER_PERKS.map((perk) => (
          <View key={perk} className="flex-row items-center gap-2">
            <Check size={14} color={goldSoft} />
            <Text className="flex-1 font-sans text-sm text-white/85">{perk}</Text>
          </View>
        ))}
      </View>

      <Text className="font-display-bold text-base text-white">أو صدقة لمرة واحدة</Text>
      {DONATIONS.map((donation) => (
        <Pressable
          key={donation.id}
          accessibilityRole="button"
          accessibilityLabel={donation.label}
          accessibilityHint="يفتح صفحة الدعم لإتمام الصدقة"
          onPress={() => {
            tapHaptic();
            onDonate();
          }}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <View className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
            <View className="size-10 items-center justify-center rounded-full bg-gold/15">
              <HandHeart size={20} color={goldSoft} />
            </View>
            <View className="flex-1">
              <Text className="font-display-bold text-base text-white">{donation.label}</Text>
              <Text className="font-sans text-xs leading-5 text-white/65">{donation.note}</Text>
            </View>
            <ChevronLeft size={20} color={goldSoft} />
          </View>
        </Pressable>
      ))}
      <Text className="text-center font-sans text-xs leading-5 text-white/50">
        الدفع يتم عبر المتجر بأمان، ويمكنك الدعم في أي وقت من صفحة «المزيد».
      </Text>
    </StepLayout>
  );
}
