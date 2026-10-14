import { useIsFocused } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { checkForUpdate, startUpdate } from "expo-in-app-updates";
import { Download } from "lucide-react-native";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Platform, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppActive } from "@/lib/screenState";
import { track } from "@/lib/telemetry";

const SNOOZE_KEY = "al-manara:update-prompt-snooze:v1";
const SNOOZE_MS = 24 * 60 * 60 * 1000;
/** Google Play's update priority (0–5, set when releasing) from which the update can't be put off. */
const REQUIRED_PRIORITY = 4;

interface PendingUpdate {
  version: string;
  required: boolean;
  immediate: boolean;
}

function snoozedFor(version: string): boolean {
  try {
    const [snoozedVersion, until] = (Storage.getItemSync(SNOOZE_KEY) ?? "").split("|");
    return snoozedVersion === version && Date.now() < Number(until);
  } catch {
    return false;
  }
}

function snooze(version: string) {
  try {
    Storage.setItemSync(SNOOZE_KEY, `${version}|${Date.now() + SNOOZE_MS}`);
  } catch {
    // Asked again next launch.
  }
}

// Whether the sheet is up, so Home's other invitation (SetupPrompt) waits instead of stacking on it.
let open = false;
const listeners = new Set<() => void>();
function setOpen(value: boolean) {
  if (open === value) return;
  open = value;
  listeners.forEach((listener) => listener());
}
export function useUpdatePromptOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
  );
}

/**
 * On Home, when Google Play has a newer version of the app: "حدّث الآن" runs Play's own update screen,
 * "لاحقًا" asks again after a day. A release with priority 4 or more in the Play Console can't be put
 * off. Android only, and only for an install from Google Play (anything else reports no update).
 */
export function AppUpdatePrompt() {
  const focused = useIsFocused();
  const active = useAppActive();
  const [pending, setPending] = useState<PendingUpdate | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Asked on launch and every time the app comes back to the front.
  useEffect(() => {
    if (Platform.OS !== "android" || !active) return;
    let cancelled = false;
    checkForUpdate()
      .then((info) => {
        if (cancelled || !info.updateAvailable || !(info.immediateAllowed || info.flexibleAllowed)) return;
        const required = (info.serverPriority ?? 0) >= REQUIRED_PRIORITY && !!info.immediateAllowed;
        if (!required && snoozedFor(info.storeVersion)) return;
        setPending({ version: info.storeVersion, required, immediate: !!info.immediateAllowed });
        setDismissed(false);
      })
      .catch(() => {
        // Not from Google Play, or Play unreachable: nothing to offer.
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const visible = !!pending && !dismissed && focused;
  useEffect(() => {
    setOpen(visible);
    return () => setOpen(false);
  }, [visible]);

  if (!pending) return null;

  const later = () => {
    if (pending.required) return;
    snooze(pending.version);
    setDismissed(true);
    track("app_update_later", { version: pending.version });
  };
  const update = () => {
    track("app_update_start", { version: pending.version, required: pending.required });
    // Immediate is Play's full-screen download-and-install; flexible downloads in the background and
    // the library installs it once ready.
    startUpdate(pending.immediate)
      .then((started) => {
        if (started && !pending.required) setDismissed(true);
      })
      .catch(() => {});
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={later}
      title="تحديث جديد متاح"
      icon={Download}
      secondary={pending.required ? undefined : { label: "لاحقًا", onPress: later }}
      primary={{ label: "حدّث الآن", onPress: update }}
    >
      <View accessibilityRole="alert">
        <Text className="font-sans text-base leading-7 text-fg-muted">
          {pending.required
            ? "هذا التحديث ضروري لتواصل استخدام المنارة. يستغرق دقيقة واحدة."
            : "نسخة أحدث من المنارة متاحة على Google Play، بتحسينات وإصلاحات جديدة."}
        </Text>
      </View>
    </BottomSheet>
  );
}
