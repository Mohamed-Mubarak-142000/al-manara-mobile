import { LinearGradient } from "expo-linear-gradient";
import { BookOpen, CalendarClock, Flame, Star, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { BADGE_DEFINITIONS } from "@/core/kids/badges";
import { getDueReviews } from "@/core/kids/reviewSchedule";
import { computeStars, countMemorizedAyahs } from "@/core/kids/stars";
import { computeStreak } from "@/core/kids/streak";
import { getSurahAyahCount } from "@/core/quran/surahAyahCounts";
import { toArabicDigits } from "@/core/text/arabic";

import { getKidsSurahs } from "../kidsData";
import { badgeArt } from "../rewards/badgeIcons";
import { KidsArt } from "../ui/KidsArt";
import { KidsButton } from "../ui/KidsButton";
import { KidsEnter } from "../ui/KidsMotion";
import { KidsPanel, KidsText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS } from "../ui/kidsStyles";
import { go } from "../ui/nav";
import { useKidsState } from "./progressStore";

/** The website's /kids/progress: "رحلتي وشاراتي". */
export function KidsProgress() {
  const state = useKidsState();
  const surahs = getKidsSurahs();
  const unlocked = new Set(state.unlockedBadgeIds);
  const due = getDueReviews(state.reviewSchedule);
  const names = new Map(surahs.map((surah) => [surah.id, surah.name]));
  const stats: { label: string; value: number; icon: LucideIcon; color: string }[] = [
    { label: "نجمة", value: computeStars(state), icon: Star, color: KIDS.gold },
    { label: "آية محفوظة", value: countMemorizedAyahs(state), icon: BookOpen, color: KIDS.emerald },
    { label: "أيام متتالية", value: computeStreak(state.activityDates), icon: Flame, color: KIDS.flame },
  ];

  return (
    <KidsScroll>
      <KidsEnter index={0}>
        <KidsPanel>
          <KidsText size={28} bold center>
            رحلتي وشاراتي
          </KidsText>
          <View className="mt-6 flex-row gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Animated.View
                  key={stat.label}
                  entering={ZoomIn.delay(index * 100).springify()}
                  style={{ flex: 1, borderRadius: 24, backgroundColor: KIDS.ivory, padding: 12, alignItems: "center" }}
                >
                  <Icon size={34} color={stat.color} fill={stat.color} />
                  <KidsText size={28} bold center className="mt-1">
                    {toArabicDigits(stat.value)}
                  </KidsText>
                  <KidsText size={14} bold tone="muted" center>
                    {stat.label}
                  </KidsText>
                </Animated.View>
              );
            })}
          </View>
        </KidsPanel>
      </KidsEnter>

      {due.length > 0 && (
        <KidsEnter index={1}>
          <KidsPanel>
            <View className="flex-row items-center gap-2">
              <CalendarClock size={26} color={KIDS.sky} />
              <KidsText size={22} bold>
                حان وقت المراجعة
              </KidsText>
            </View>
            <View className="mt-4 flex-row flex-wrap gap-2">
              {due.map((entry) => (
                <KidsButton key={entry.surahId} tone="sky" size="sm" onPress={() => go(`/kids/progress/${entry.surahId}`)}>
                  سورة {names.get(entry.surahId) ?? toArabicDigits(entry.surahId)}
                </KidsButton>
              ))}
            </View>
          </KidsPanel>
        </KidsEnter>
      )}

      <KidsEnter index={2}>
        <KidsPanel>
          <KidsText size={22} bold>
            شاراتي
          </KidsText>
          <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
            {BADGE_DEFINITIONS.map((badge) => {
              const art = badgeArt(badge);
              const has = unlocked.has(badge.id);
              return (
                <View
                  key={badge.id}
                  style={{
                    width: "48%",
                    borderRadius: 24,
                    padding: 14,
                    alignItems: "center",
                    borderWidth: 4,
                    backgroundColor: has ? KIDS.cream : KIDS.softer,
                    borderColor: has ? KIDS.starFill : "transparent",
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: has ? KIDS.gold : KIDS.line,
                      borderBottomWidth: has ? 5 : 0,
                      borderBottomColor: KIDS.goldShadow,
                    }}
                  >
                    <KidsArt emoji={art.emoji} size={40} style={has ? undefined : { opacity: 0.35 }} />
                  </View>
                  <KidsText size={16} bold center className="mt-3">
                    {art.label}
                  </KidsText>
                  <KidsText size={14} tone="muted" center>
                    {badge.description}
                  </KidsText>
                </View>
              );
            })}
          </View>
        </KidsPanel>
      </KidsEnter>

      <KidsEnter index={3}>
        <KidsPanel>
          <KidsText size={22} bold>
            ما حفظته من السور
          </KidsText>
          <View className="mt-4 gap-3">
            {surahs.map((surah) => {
              const total = getSurahAyahCount(surah.id);
              const count = state.memorizedAyahsBySurah[surah.id]?.length ?? 0;
              return (
                <Pressable
                  key={surah.id}
                  accessibilityRole="link"
                  onPress={() => go(`/kids/progress/${surah.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: 24,
                    backgroundColor: KIDS.ivory,
                    padding: 12,
                    transform: [{ translateY: pressed ? -2 : 0 }],
                  })}
                >
                  <KidsText size={16} bold style={{ width: 88 }} numberOfLines={1}>
                    {surah.name}
                  </KidsText>
                  <View style={{ flex: 1, height: 16, borderRadius: 8, overflow: "hidden", backgroundColor: KIDS.white }}>
                    <View style={{ width: `${total ? (count / total) * 100 : 0}%`, height: "100%", borderRadius: 8, overflow: "hidden" }}>
                      <LinearGradient
                        colors={[KIDS.emerald, KIDS.emeraldPale]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                  <KidsText size={14} bold tone="muted" center style={{ width: 60 }}>
                    {toArabicDigits(count)}/{toArabicDigits(total)}
                  </KidsText>
                </Pressable>
              );
            })}
          </View>
        </KidsPanel>
      </KidsEnter>
    </KidsScroll>
  );
}
