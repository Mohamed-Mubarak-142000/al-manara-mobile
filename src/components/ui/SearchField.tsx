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
    <View className="h-12 flex-row items-center gap-2 rounded-full border border-border bg-surface px-4 shadow-soft">
      <Search size={18} color={muted} />
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
