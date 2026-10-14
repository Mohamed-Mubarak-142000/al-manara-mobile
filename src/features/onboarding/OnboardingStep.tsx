import { Image } from "expo-image";
import type { ReactNode } from "react";
import { ScrollView, Text, useWindowDimensions, View, type ImageSourcePropType } from "react-native";

/** A compact city scene leaves room for the location controls on small phones. */
function LocationArt({ compact }: { compact: boolean }) {
  return (
    <View className="overflow-hidden rounded-2xl bg-surface-alt">
      <Image
        source={require("@/assets/images/onboarding/location.jpg")}
        style={{ width: compact ? 132 : 168, height: compact ? 88 : 112 }}
        contentFit="cover"
        accessible={false}
      />
    </View>
  );
}

/** A step's 3D picture on a soft primary disc. */
function ArtBadge({ art, compact }: { art: ImageSourcePropType; compact: boolean }) {
  const size = compact ? 48 : 60;
  return (
    <View
      className={`${compact ? "size-20" : "size-24"} items-center justify-center rounded-full border border-primary/15 bg-primary-soft`}
    >
      <Image source={art} style={{ width: size, height: size }} contentFit="contain" accessible={false} />
    </View>
  );
}

interface StepLayoutProps {
  /** The step's 3D picture; without one the step shows the city artwork (the location step). */
  art?: ImageSourcePropType;
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Wrap the card content in a ScrollView (off when the content brings its own list). */
  scroll?: boolean;
}

/**
 * Shared layout of the setup steps: the step's picture, title and subtitle on the themed ground, then the
 * step's content in a bordered card that takes the remaining height and scrolls on small phones.
 */
export function StepLayout({ art, eyebrow, title, subtitle, children, scroll = true }: StepLayoutProps) {
  const { height } = useWindowDimensions();
  const compact = height < 700;

  return (
    <View className={`flex-1 ${compact ? "gap-3" : "gap-5"}`} style={{ minHeight: 0 }}>
      <View className={`items-center ${compact ? "gap-1.5" : "gap-2.5"}`}>
        {art ? <ArtBadge art={art} compact={compact} /> : <LocationArt compact={compact} />}
        {eyebrow ? <Text className="mt-1 font-sans-bold text-sm text-primary">{eyebrow}</Text> : null}
        <Text
          accessibilityRole="header"
          className={`text-center font-sans-bold text-fg ${compact ? "text-2xl leading-[40px]" : "text-[28px] leading-[46px]"}`}
        >
          {title}
        </Text>
        <Text className="px-2 text-center font-sans text-base leading-7 text-fg-muted">{subtitle}</Text>
      </View>
      <View className="flex-1 overflow-hidden rounded-3xl border border-border bg-surface shadow-card" style={{ minHeight: 0 }}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 18, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View className="flex-1 gap-3 p-4">{children}</View>
        )}
      </View>
    </View>
  );
}
