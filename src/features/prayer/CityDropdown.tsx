import { Check, ChevronDown, MapPin, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CITY_CHOICES } from "@/core/prayer/location";
import { normalizeArabic } from "@/core/text/normalizeArabic";
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
  const insets = useSafeAreaInsets();
  const primary = useThemeColor("primary");
  const muted = useThemeColor("fg-muted");
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
        className="h-13 flex-row items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4"
      >
        <MapPin size={18} color="#e6c977" />
        <Text numberOfLines={1} className="flex-1 font-sans-bold text-base text-white">
          {label}
        </Text>
        <ChevronDown size={20} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <Pressable accessibilityLabel="إغلاق" onPress={close} className="flex-1 bg-black/50" />
        <View className="max-h-[75%] rounded-t-[28px] bg-surface px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-border" />
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-display-bold text-lg text-fg">اختر مدينتك</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="إغلاق" onPress={close} hitSlop={10} className="p-1">
              <X size={20} color={muted} />
            </Pressable>
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="ابحث عن مدينة" />
          <FlatList
            data={cities}
            keyExtractor={(city) => city.city}
            keyboardShouldPersistTaps="handled"
            className="mt-2"
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
        </View>
      </Modal>
    </>
  );
}
