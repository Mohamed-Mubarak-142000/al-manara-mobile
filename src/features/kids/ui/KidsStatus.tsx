import { RotateCcw } from "lucide-react-native";
import { View } from "react-native";

import { KidsArt } from "./KidsArt";
import { KidsButton } from "./KidsButton";
import { KidsBob } from "./KidsMotion";
import { KidsPanel, KidsText } from "./KidsPanel";

/** Waiting in the garden: a little sprout floats instead of a bare spinner, so the wait feels part of the game. */
export function KidsLoading({ label = "لحظة… نجهّز لك الحديقة", className }: { label?: string; className?: string }) {
  return (
    <KidsPanel className={`items-center ${className ?? ""}`}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={label} className="items-center">
        <KidsBob>
          <KidsArt emoji="🌱" size={72} />
        </KidsBob>
        <KidsText size={19} bold center className="mt-3">
          {label}
        </KidsText>
      </View>
    </KidsPanel>
  );
}

/** Something didn't load: a friendly picture, one short line, and the way to try again. */
export function KidsError({
  title,
  message,
  onRetry,
  emoji = "🌈",
  className,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  emoji?: string;
  className?: string;
}) {
  return (
    <KidsPanel className={`items-center ${className ?? ""}`}>
      <KidsArt emoji={emoji} size={80} />
      <KidsText size={22} bold center className="mt-3">
        {title}
      </KidsText>
      {message ? (
        <KidsText size={16} tone="muted" center className="mt-1">
          {message}
        </KidsText>
      ) : null}
      {onRetry ? (
        <KidsButton tone="emerald" icon={RotateCcw} className="mt-5" onPress={onRetry}>
          حاول مرة أخرى
        </KidsButton>
      ) : null}
    </KidsPanel>
  );
}
