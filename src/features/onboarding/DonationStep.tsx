import { Check, ChevronLeft, HandHeart, Smartphone } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { StepLayout } from "@/features/onboarding/OnboardingStep";
import { tapHaptic } from "@/features/onboarding/SetupSteps";
import { INSTAPAY_NUMBER, SUPPORTER_PERKS, useSupporter } from "@/features/support/supportStore";
import { useThemeColor } from "@/theme/useThemeColor";

/**
 * Optional last step. Nothing is sent from here: the InstaPay number and the form for the transfer
 * screenshot live on /support, which `onDonate` opens once onboarding is done.
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ادعم عبر إنستاباي على الرقم ${INSTAPAY_NUMBER}`}
        accessibilityHint="يفتح صفحة الدعم لإرسال صورة التحويل"
        onPress={() => {
          tapHaptic();
          onDonate();
        }}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <View className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
          <View className="size-10 items-center justify-center rounded-full bg-gold/15">
            <Smartphone size={20} color={goldSoft} />
          </View>
          <View className="flex-1">
            <Text className="font-display-bold text-base text-white">إنستاباي</Text>
            <Text className="font-display-bold text-lg tracking-widest text-gold-soft">{INSTAPAY_NUMBER}</Text>
          </View>
          <ChevronLeft size={20} color={goldSoft} />
        </View>
      </Pressable>

      <View className="gap-3 rounded-2xl border border-white/10 bg-white/8 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display-bold text-base text-white">داعمو المنارة</Text>
          {supporter ? <Text className="font-sans-bold text-xs text-gold-soft">أنت من الداعمين ✓</Text> : null}
        </View>
        {SUPPORTER_PERKS.map((perk) => (
          <View key={perk} className="flex-row items-center gap-2">
            <Check size={14} color={goldSoft} />
            <Text className="flex-1 font-sans text-sm text-white/85">{perk}</Text>
          </View>
        ))}
      </View>
      <Text className="text-center font-sans text-xs leading-5 text-white/50">حوّل أي مبلغ ثم ارفع صورة التحويل، ويمكنك الدعم في أي وقت من «المزيد».</Text>
    </StepLayout>
  );
}
