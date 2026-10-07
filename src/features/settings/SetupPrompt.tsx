import { router, useIsFocused } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { Bell, BookOpen, Clock, Settings2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import { Button } from "@/components/ui/Button";
import { useAccount } from "@/features/account/accountStore";
import { useThemeColor } from "@/theme/useThemeColor";

import { useSetupComplete } from "./preferences";

const SNOOZE_KEY = "al-manara:setup-prompt-snooze:v1";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
/** Gives the account's saved settings time to arrive before deciding setup isn't done. */
const SHOW_AFTER_MS = 4000;

function snoozed(): boolean {
  try {
    return Date.now() < Number(Storage.getItemSync(SNOOZE_KEY) ?? 0);
  } catch {
    return false;
  }
}

/** Not asked again for a while ("لاحقًا", or right after onboarding, which set the essentials). */
export function snoozeSetupPrompt(ms = SNOOZE_MS) {
  try {
    Storage.setItemSync(SNOOZE_KEY, String(Date.now() + ms));
  } catch {
    // Asked again next launch.
  }
}

const ITEMS = [
  { icon: Bell, text: "الإشعارات والأذان في وقته" },
  { icon: Clock, text: "مدينتك وطريقة حساب المواقيت" },
  { icon: BookOpen, text: "تذكير الأذكار وإعدادات القراءة" },
];

/**
 * On Home, for whoever hasn't saved the settings screen yet (on the account, or on this device for a
 * guest): a short invitation to finish setting up. "لاحقًا" asks again after three days.
 */
export function SetupPrompt() {
  const account = useAccount();
  const userId = account.status === "signed-in" ? account.userId : null;
  const complete = useSetupComplete(userId);
  const focused = useIsFocused();
  const gold = useThemeColor("gold-soft");
  const [due, setDue] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (account.status === "loading" || complete || snoozed()) return;
    const id = setTimeout(() => setDue(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, [account.status, complete]);

  const visible = due && !complete && !dismissed && focused;
  const later = () => {
    snoozeSetupPrompt();
    setDismissed(true);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={later} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(200)} className="flex-1 items-center justify-center bg-black/55 px-6">
        <Pressable accessibilityLabel="لاحقًا" onPress={later} className="absolute inset-0" />
        <Animated.View entering={ZoomIn.duration(260)} accessibilityRole="alert" className="w-full max-w-sm rounded-4xl bg-hero p-6 shadow-lift">
          <View className="size-14 items-center justify-center self-center rounded-full bg-gold/20">
            <Settings2 size={28} color={gold} />
          </View>
          <Text className="mt-4 text-center font-display-bold text-xl text-hero-fg">أكمل إعداداتك</Text>
          <Text className="mt-2 text-center font-sans text-sm leading-6 text-white/75">
            دقيقة واحدة لتستفيد من كل شيء في المنارة{userId ? "، وتُحفظ في حسابك على أي جهاز." : "."}
          </Text>
          <View className="mt-4 gap-2.5">
            {ITEMS.map(({ icon: Icon, text }) => (
              <View key={text} className="flex-row items-center gap-3 rounded-2xl bg-white/8 px-3 py-2.5">
                <Icon size={18} color={gold} />
                <Text className="flex-1 font-sans text-sm text-white/85">{text}</Text>
              </View>
            ))}
          </View>
          <Button
            className="mt-5"
            variant="gold"
            size="lg"
            onPress={() => {
              setDismissed(true);
              router.push("/settings");
            }}
          >
            أكمل الإعدادات
          </Button>
          <Pressable accessibilityRole="button" onPress={later} hitSlop={8} className="mt-3 self-center py-1">
            <Text className="font-sans-bold text-sm text-white/70">لاحقًا</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
