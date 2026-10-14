import { Search } from "lucide-react-native";
import { TextInput, View } from "react-native";

import { useThemeColor } from "@/theme/useThemeColor";

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  const muted = useThemeColor("fg-muted");
  const fg = useThemeColor("fg");
  return (
    <View className="h-14 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4">
      <Search size={20} color={fg} strokeWidth={1.8} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={muted}
        returnKeyType="search"
        autoCorrect={false}
        className="flex-1 font-sans text-base"
        style={{ color: fg, textAlign: "right" }}
      />
    </View>
  );
}
