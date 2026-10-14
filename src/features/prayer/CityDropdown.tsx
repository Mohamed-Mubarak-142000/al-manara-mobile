import { Check, ChevronDown, MapPin } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { CITY_CHOICES } from "@/core/prayer/location";
import { normalizeArabic } from "@/core/text/normalizeArabic";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SearchField } from "@/components/ui/SearchField";
import { useThemeColor } from "@/theme/useThemeColor";

interface CityDropdownProps {
  /** The chosen city's key (CITY_CHOICES[].city), or null when the location came from GPS. */
  value: string | null;
  /** What the field shows: the chosen city, or the GPS location's label. */
  label: string;
  onChange: (city: string) => void;
}

/** One compact field instead of a wall of city chips; the list opens in a sheet with search. */
export function CityDropdown({ value, label, onChange }: CityDropdownProps) {
  const primary = useThemeColor("primary");
  const fg = useThemeColor("fg");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const cities = useMemo(() => {
    const needle = normalizeArabic(query.trim());
    return needle ? CITY_CHOICES.filter((city) => normalizeArabic(city.label).includes(needle)) : CITY_CHOICES;
  }, [query]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`المدينة: ${label}، اضغط للتغيير`}
        onPress={() => setOpen(true)}
        className="h-14 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <MapPin size={20} color={primary} strokeWidth={1.8} />
        <Text numberOfLines={1} className="flex-1 font-sans-bold text-base text-fg">
          {label}
        </Text>
        <ChevronDown size={20} color={fg} strokeWidth={1.8} />
      </Pressable>

      <BottomSheet visible={open} onClose={close} title="اختر مدينتك" icon={MapPin} scroll={false} padded={false} maxHeight={0.8}>
        <View className="px-5 pt-4">
          <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن مدينة" />
        </View>
        <FlatList
          data={cities}
          keyExtractor={(city) => city.city}
          keyboardShouldPersistTaps="handled"
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}
          ListEmptyComponent={<Text className="mt-6 text-center font-sans text-sm text-fg-muted">لا توجد مدينة بهذا الاسم.</Text>}
          renderItem={({ item }) => {
            const active = item.city === value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onChange(item.city);
                  close();
                }}
                className={`flex-row items-center justify-between rounded-2xl px-4 py-3.5 ${active ? "bg-primary-soft" : ""}`}
              >
                <Text className={`font-sans-bold text-base ${active ? "text-primary" : "text-fg"}`}>{item.label}</Text>
                {active && <Check size={18} color={primary} />}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </>
  );
}
