import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { useThemeColor } from "@/theme/useThemeColor";

/** The kids' Quran garden, one tap from Home: its own garden scene, so children recognise the door. */
export function KidsBanner() {
  const night = useThemeColor("emerald-night");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="حديقة القرآن للأطفال"
      accessibilityHint="يفتح قسم الأطفال: رحلة السور والألعاب والقصص"
      onPress={() => router.push("/kids")}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      {/* Edge to edge: the garden scene runs the full width of the screen. */}
      <View className="h-48 overflow-hidden">
        <Image
          source={require("@/assets/images/scenes/garden.jpg")}
          contentFit="cover"
          contentPosition="center"
          style={{ position: "absolute", inset: 0 }}
        />
        {/* Darkens the reading side (start, in RTL the right) so the white text stays legible. */}
        <LinearGradient
          colors={["rgba(1,42,34,0.82)", "rgba(1,42,34,0.35)", "transparent"]}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={{ position: "absolute", inset: 0 }}
        />
        <View className="flex-1 justify-center gap-1.5 p-5">
          <View className="self-start rounded-full bg-gold px-3 py-1">
            <Text className="font-kids text-xs text-emerald-night">للأطفال</Text>
          </View>
          <Text className="font-kids text-2xl leading-10 text-white">حديقة القرآن 🌳</Text>
          <Text className="w-2/3 font-sans text-xs leading-5 text-white/85">رحلة في السور، وألعاب، وقصص، وجوائز لطفلك</Text>
          <View className="mt-1 flex-row items-center gap-1 self-start rounded-full bg-white px-3.5 py-1.5">
            <Text className="font-sans-bold text-xs text-emerald-night">ادخل الحديقة</Text>
            <ArrowLeft size={14} color={night} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
