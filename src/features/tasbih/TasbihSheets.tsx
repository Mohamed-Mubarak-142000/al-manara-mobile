import { LinearGradient } from "expo-linear-gradient";
import { Check, ListPlus, Palette, Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { allAdhkar, currentDhikr, MAX_TEXT, parseTarget } from "@/core/tasbih/tasbih";
import { TASBIH_THEMES } from "@/core/tasbih/tasbihData";
import { toArabicDigits } from "@/core/text/arabic";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useThemeColor } from "@/theme/useThemeColor";

import { updateTasbih, useTasbih } from "./tasbihStore";

/** "أضف ذكرًا خاصًا بك": the text and its own target (empty for open counting). */
function AddDhikrForm({ onDone }: { onDone: () => void }) {
  const fg = useThemeColor("fg");
  const muted = useThemeColor("fg-muted");
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");

  function add() {
    if (!text.trim()) return;
    updateTasbih({ type: "add", id: `custom-${Date.now().toString(36)}`, text, target: parseTarget(target) ?? 0 });
    onDone();
  }

  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface-alt p-4">
      <Text className="font-sans-bold text-sm text-fg">نص الذكر</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="مثال: سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ"
        placeholderTextColor={muted}
        maxLength={MAX_TEXT}
        multiline
        autoFocus
        className="min-h-16 rounded-2xl border border-border bg-surface px-4 py-3 font-sans text-base"
        style={{ color: fg, textAlign: "right", textAlignVertical: "top" }}
      />
      <Text className="font-sans-bold text-sm text-fg">العدد (اتركه فارغًا للعدّ المفتوح)</Text>
      <TextInput
        value={target}
        onChangeText={setTarget}
        keyboardType="number-pad"
        maxLength={6}
        className="h-14 rounded-2xl border border-border bg-surface px-4 font-sans text-base"
        style={{ color: fg, textAlign: "right" }}
      />
      <View className="flex-row gap-3">
        <Button className="flex-1" variant="secondary" onPress={onDone}>
          إلغاء
        </Button>
        <Button className="flex-1" icon={Plus} onPress={add} disabled={!text.trim()}>
          إضافة
        </Button>
      </View>
    </View>
  );
}

/** "اختر الذكر": the user's own adhkar first, then the presets; own adhkar can be deleted. */
export function AdhkarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useTasbih();
  const muted = useThemeColor("fg-muted");
  const primary = useThemeColor("primary");
  const [adding, setAdding] = useState(false);
  const selectedId = currentDhikr(state).id;
  const customIds = new Set(state.custom.map((entry) => entry.id));

  function close() {
    setAdding(false);
    onClose();
  }

  return (
    <BottomSheet visible={open} title="اختر الذكر" icon={ListPlus} onClose={close} maxHeight={0.85}>
      <View className="gap-2">
        {adding ? (
          <AddDhikrForm onDone={() => setAdding(false)} />
        ) : (
          <Button variant="secondary" icon={ListPlus} onPress={() => setAdding(true)}>
            أضف ذكرًا خاصًا بك
          </Button>
        )}
        {allAdhkar(state).map((entry) => {
          const active = entry.id === selectedId;
          const custom = customIds.has(entry.id);
          return (
            <View key={entry.id} className="flex-row items-stretch gap-2">
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  updateTasbih({ type: "select", id: entry.id });
                  close();
                }}
                className={`flex-1 flex-row items-center justify-between gap-3 rounded-2xl border p-3 ${active ? "border-primary bg-primary-soft" : "border-border bg-surface"}`}
              >
                <View className="flex-1">
                  <Text className="font-quran-fallback text-lg leading-8 text-fg">{entry.text}</Text>
                  {custom && <Text className="font-sans-bold text-xs text-accent-strong">ذكر خاص</Text>}
                </View>
                <View className="rounded-full bg-accent-soft px-2.5 py-0.5">
                  <Text className="font-sans-bold text-xs text-accent-strong">
                    {entry.target ? `×${toArabicDigits(entry.target)}` : "مفتوح"}
                  </Text>
                </View>
                {active && <Check size={16} color={primary} />}
              </Pressable>
              {custom && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`حذف ${entry.text}`}
                  onPress={() => updateTasbih({ type: "remove", id: entry.id })}
                  className="w-11 items-center justify-center rounded-2xl border border-border bg-surface"
                >
                  <Trash2 size={16} color={muted} />
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}

/** "شكل السبحة": the six stage themes, each previewed with its own colours and beads. */
export function ThemeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useTasbih();
  return (
    <BottomSheet visible={open} title="شكل السبحة" icon={Palette} onClose={onClose} primary={{ label: "تم", onPress: onClose }}>
      <View className="flex-row flex-wrap gap-3">
        {TASBIH_THEMES.map((entry) => {
          const active = entry.id === state.theme;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={entry.label}
              onPress={() => updateTasbih({ type: "theme", theme: entry.id })}
              className={`aspect-[4/3] w-[47%] overflow-hidden rounded-3xl border-2 ${active ? "border-primary" : "border-border"}`}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              {/* The stage's own palette: a preview, not app chrome. */}
              <LinearGradient colors={entry.background} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
                <View className="flex-row gap-1">
                  {[0, 1, 2, 3, 4].map((bead) => (
                    <View key={bead} className="size-3 rounded-full" style={{ backgroundColor: bead < 3 ? entry.accent : entry.track }} />
                  ))}
                </View>
                <Text className="font-sans-bold text-sm" style={{ color: entry.ink }}>
                  {entry.label}
                </Text>
                {active && (
                  <View className="absolute end-3 top-3">
                    <Check size={16} color={entry.ink} />
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}
