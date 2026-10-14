import { LinearGradient } from "expo-linear-gradient";
import { Check, Gift } from "lucide-react-native";
import { Pressable, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { buildDailyChallenge, DAILY_TASK_COUNT, todayKey, type DailyTaskId } from "@/core/kids/dailyChallenge";
import { toArabicDigits } from "@/core/text/arabic";

import { useKidsState } from "../progress/progressStore";
import { KidsArt } from "../ui/KidsArt";
import { KidsButton } from "../ui/KidsButton";
import { KidsText } from "../ui/KidsPanel";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";

function taskHref(task: DailyTaskId, surahId: number | null): string {
  if (surahId === null) return "/kids/games";
  switch (task) {
    case "listen":
      return `/kids/journey/${surahId}`;
    case "learn":
      return `/kids/learn/${surahId}`;
    case "quiz":
      return `/kids/quiz/${surahId}`;
    case "recite":
      return `/kids/recite/${surahId}`;
    case "play":
      return "/kids/games";
  }
}

export function DailyChallengeCard({ surahId }: { surahId: number | null }) {
  const state = useKidsState();
  const day = todayKey(new Date());
  const tasks = buildDailyChallenge(day);
  const done = state.dailyDone[day] ?? [];
  const complete = done.length >= DAILY_TASK_COUNT;

  return (
    <View style={[{ borderRadius: 36, overflow: "hidden", borderWidth: 4, borderColor: "rgba(255,255,255,0.7)" }, PANEL_SHADOW]}>
      <LinearGradient colors={[KIDS.cream, KIDS.creamDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2" style={{ flexShrink: 1 }}>
            <KidsArt emoji="🌟" size={30} />
            <KidsText size={22} bold style={{ color: KIDS.honeyDeep }}>
              تحدي اليوم
            </KidsText>
          </View>
          <View style={{ backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 2 }}>
            <KidsText size={16} bold style={{ color: KIDS.honey }}>
              {toArabicDigits(Math.min(done.length, DAILY_TASK_COUNT))} / {toArabicDigits(DAILY_TASK_COUNT)}
            </KidsText>
          </View>
        </View>
        <View className="mt-4 gap-2.5">
          {tasks.map((task) => {
            const finished = done.includes(task.id);
            return (
              <Pressable
                key={task.id}
                accessibilityRole="link"
                accessibilityState={{ checked: finished }}
                onPress={() => go(taskHref(task.id, surahId))}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 24,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: finished ? KIDS.mint : KIDS.white,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                })}
              >
                <KidsArt emoji={task.emoji} size={30} />
                <KidsText
                  size={17}
                  bold
                  className="flex-1"
                  style={{ color: finished ? KIDS.emeraldShadow : KIDS.deep, textDecorationLine: finished ? "line-through" : "none" }}
                >
                  {task.title}
                </KidsText>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: finished ? KIDS.emerald : KIDS.taskDot,
                  }}
                >
                  {finished && <Check size={20} color={KIDS.white} accessibilityLabel="تم" />}
                </View>
              </Pressable>
            );
          })}
        </View>
        {complete && (
          <Animated.View entering={ZoomIn} className="mt-4 items-center">
            <KidsButton tone="rose" icon={Gift} onPress={() => go("/kids/rewards")}>
              أحسنت! افتح صندوق اليوم
            </KidsButton>
          </Animated.View>
        )}
      </LinearGradient>
    </View>
  );
}
