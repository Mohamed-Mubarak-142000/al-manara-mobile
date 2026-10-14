import { router, useIsFocused } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { Bell, BookOpen, Clock, Settings2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { enterSoft } from "@/components/ui/PageHeader";
import { useAccount } from "@/features/account/accountStore";
import { useUpdatePromptOpen } from "@/features/appUpdate/AppUpdatePrompt";
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
  const primary = useThemeColor("primary");
  const [due, setDue] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // An app update offer goes first; this one waits until that sheet is gone.
  const updateOpen = useUpdatePromptOpen();

  useEffect(() => {
    if (account.status === "loading" || complete || snoozed()) return;
    const id = setTimeout(() => setDue(true), SHOW_AFTER_MS);
    return () => clearTimeout(id);
  }, [account.status, complete]);

  const visible = due && !complete && !dismissed && focused && !updateOpen;
  const later = () => {
    snoozeSetupPrompt();
    setDismissed(true);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={later}
      title="أكمل إعداداتك"
      icon={Settings2}
      secondary={{ label: "لاحقًا", onPress: later }}
      primary={{
        label: "أكمل الإعدادات",
        onPress: () => {
          setDismissed(true);
          router.push("/settings");
        },
      }}
    >
      <View accessibilityRole="alert">
        <Text className="font-sans text-base leading-7 text-fg-muted">
          دقيقة واحدة لتستفيد من كل شيء في المنارة{userId ? "، وتُحفظ في حسابك على أي جهاز." : "."}
        </Text>
        <View className="mt-4 gap-3">
          {ITEMS.map(({ icon: Icon, text }, index) => (
            <Animated.View
              key={text}
              entering={enterSoft(index + 1)}
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5"
            >
              <View className="size-10 items-center justify-center rounded-xl bg-primary-soft">
                <Icon size={20} color={primary} />
              </View>
              <Text className="flex-1 font-sans-semibold text-sm text-fg">{text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}
