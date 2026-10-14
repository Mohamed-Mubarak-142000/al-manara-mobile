import { BookOpenCheck, Gem, RefreshCw } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { BADGE_DEFINITIONS } from "@/core/kids/badges";
import { getRewardItem, REWARD_ITEMS, type RewardItem } from "@/core/kids/catalog";
import { chestGems, gemBalance, ownedItemIds, unopenedChests } from "@/core/kids/rewards";
import { toArabicDigits } from "@/core/text/arabic";

import { Companion } from "../companion/Companion";
import { useCompanion } from "../companion/companionStore";
import { useKidsProgress } from "../progress/progressStore";
import { sfx } from "../sfx";
import { Celebration } from "../ui/Celebration";
import { KidsArt } from "../ui/KidsArt";
import { KidsButton } from "../ui/KidsButton";
import { KidsPanel, KidsText } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";
import { badgeArt } from "./badgeIcons";

export type RewardsTab = "chests" | "badges" | "shop";

const TABS: { id: RewardsTab; label: string; emoji: string }[] = [
  { id: "chests", label: "صناديقي", emoji: "🎁" },
  { id: "badges", label: "شاراتي", emoji: "🏅" },
  { id: "shop", label: "المتجر", emoji: "🛍️" },
];

const CARD = { borderRadius: 32, padding: 16, borderWidth: 4, alignItems: "center" as const };

const HEADING = {
  fontSize: 22,
  color: KIDS.white,
  textShadowColor: "rgba(0,40,30,0.5)",
  textShadowRadius: 4,
  textShadowOffset: { width: 0, height: 2 },
};

/** The games menu's springy drop-in, staggered by position; nothing moves when the phone asks for reduced motion. */
function enter(reduceMotion: boolean, index: number) {
  return reduceMotion
    ? undefined
    : FadeInDown.delay(index * 60)
        .springify()
        .stiffness(260)
        .damping(18);
}

function ChestBox({ index, opening }: { index: number; opening: boolean }) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    if (opening) {
      y.value = withTiming(0);
      rotate.value = withSequence(
        withTiming(-12, { duration: 180 }),
        withTiming(12, { duration: 180 }),
        withTiming(-12, { duration: 180 }),
        withTiming(12, { duration: 180 }),
        withTiming(0, { duration: 180 }),
      );
      scale.value = withTiming(1.4, { duration: 1100 });
    } else {
      scale.value = 1;
      // The idle bob is decoration only, so it is the part reduced motion drops.
      if (!reduceMotion)
        y.value = withDelay(
          index * 200,
          withRepeat(withSequence(withTiming(-6, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1),
        );
    }
  }, [opening, index, reduceMotion, y, rotate, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rotate.value}deg` }, { scale: scale.value }],
  }));
  return (
    <Animated.View style={style}>
      <KidsArt emoji="🎁" size={74} />
    </Animated.View>
  );
}

function ChestsTab() {
  const { state, openChest } = useKidsProgress();
  const { react } = useCompanion();
  const reduceMotion = useReducedMotion();
  const [opening, setOpening] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const chests = unopenedChests(state);

  function open(chestId: string) {
    if (opening) return;
    sfx.tap();
    setOpening(chestId);
    // Let the chest shake for a moment before it bursts open.
    setTimeout(() => {
      const reward = openChest(chestId);
      setOpening(null);
      if (!reward) return;
      sfx.win();
      react("chest");
      setRevealed(reward);
    }, 1100);
  }

  const item = revealed ? getRewardItem(revealed) : undefined;
  const gems = revealed ? chestGems(revealed) : 0;

  return (
    <View>
      {chests.length === 0 ? (
        <Animated.View entering={enter(reduceMotion, 0)}>
          <KidsPanel className="items-center">
            <KidsArt emoji="📦" size={64} />
            <KidsText size={20} bold center className="mt-3">
              لا توجد صناديق الآن
            </KidsText>
            <KidsText size={17} tone="muted" center className="mt-1">
              أكمل محطة في الرحلة أو تحدي اليوم لتحصل على صندوق مفاجآت!
            </KidsText>
          </KidsPanel>
        </Animated.View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 }}>
          {chests.map((chest, index) => (
            <Animated.View key={chest.id} entering={enter(reduceMotion, index)} style={{ width: "48%" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${chest.label}: افتحه`}
                disabled={opening !== null}
                onPress={() => open(chest.id)}
                style={[{ ...CARD, backgroundColor: "rgba(255,255,255,0.95)", borderColor: "rgba(255,255,255,0.6)" }, PANEL_SHADOW]}
              >
                <ChestBox index={index} opening={opening === chest.id} />
                <KidsText size={17} bold center className="mt-3">
                  {chest.label}
                </KidsText>
                <View
                  style={{
                    marginTop: 10,
                    borderRadius: 999,
                    backgroundColor: KIDS.rose,
                    paddingHorizontal: 18,
                    paddingVertical: 4,
                    borderBottomWidth: 5,
                    borderBottomColor: KIDS.roseShadow,
                  }}
                >
                  <KidsText size={15} bold tone="white">
                    افتحه!
                  </KidsText>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}
      <Celebration
        open={revealed !== null}
        title={item ? "مفاجأة!" : "جواهر!"}
        message={item ? `حصلت على: ${item.name}` : `حصلت على ${toArabicDigits(gems)} جوهرة`}
        onClose={() => setRevealed(null)}
      >
        <View style={{ width: "100%", alignItems: "center" }}>
          <KidsArt emoji={item ? item.emoji : "💎"} size={74} />
        </View>
        <KidsButton tone="emerald" onPress={() => setRevealed(null)}>
          رائع!
        </KidsButton>
        {item && (
          <KidsButton
            tone="white"
            onPress={() => {
              setRevealed(null);
              go("/kids/rewards?tab=shop");
            }}
          >
            {item.kind === "companion" ? "ألبسه لرفيقي" : "شاهده في المتجر"}
          </KidsButton>
        )}
      </Celebration>
    </View>
  );
}

function BadgesTab() {
  const { state } = useKidsProgress();
  const reduceMotion = useReducedMotion();
  const unlocked = new Set(state.unlockedBadgeIds);
  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
        {BADGE_DEFINITIONS.map((badge, index) => {
          const art = badgeArt(badge);
          const has = unlocked.has(badge.id);
          return (
            <Animated.View
              key={badge.id}
              entering={enter(reduceMotion, index)}
              style={[
                {
                  ...CARD,
                  width: "48%",
                  backgroundColor: has ? KIDS.white : "rgba(255,255,255,0.7)",
                  borderColor: has ? KIDS.badgeRing : "rgba(255,255,255,0.5)",
                },
                PANEL_SHADOW,
              ]}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: has ? KIDS.gold : KIDS.badgeOff,
                  borderBottomWidth: has ? 5 : 0,
                  borderBottomColor: KIDS.goldShadow,
                }}
              >
                {/* A locked badge shows a faded picture: the child sees what to aim for, but it is clearly not theirs yet. */}
                <KidsArt emoji={art.emoji} size={40} style={{ opacity: has ? 1 : 0.35 }} />
              </View>
              <KidsText size={16} bold center className="mt-2">
                {art.label}
              </KidsText>
              <KidsText size={14} tone="muted" center className="mt-0.5">
                {badge.description}
              </KidsText>
            </Animated.View>
          );
        })}
      </View>
      <View className="mt-6 items-center">
        <KidsButton tone="white" icon={BookOpenCheck} onPress={() => go("/kids/progress")}>
          ما حفظته من السور
        </KidsButton>
      </View>
    </View>
  );
}

function ShopItem({ item, index }: { item: RewardItem; index: number }) {
  const { state, buyItem, toggleEquip } = useKidsProgress();
  const { react } = useCompanion();
  const reduceMotion = useReducedMotion();
  const owned = ownedItemIds(state).has(item.id);
  const worn = state.companion?.equipped.includes(item.id) ?? false;
  const balance = gemBalance(state);
  const short = item.price - balance;

  function buy() {
    if (buyItem(item.id)) {
      sfx.win();
      react("correct");
      if (item.kind === "companion") toggleEquip(item.id);
    }
  }

  return (
    <Animated.View
      entering={enter(reduceMotion, index)}
      style={[
        {
          ...CARD,
          width: "48%",
          backgroundColor: worn ? KIDS.cream : "rgba(255,255,255,0.95)",
          borderColor: worn ? KIDS.badgeRing : "rgba(255,255,255,0.6)",
        },
        PANEL_SHADOW,
      ]}
    >
      <KidsArt emoji={item.emoji} size={52} />
      <KidsText size={16} bold center className="mt-2">
        {item.name}
      </KidsText>
      {owned ? (
        item.kind === "companion" ? (
          <KidsButton
            tone={worn ? "white" : "emerald"}
            size="sm"
            className="mt-3"
            onPress={() => {
              sfx.tap();
              toggleEquip(item.id);
            }}
          >
            {worn ? "انزعه" : "ألبسه"}
          </KidsButton>
        ) : (
          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              backgroundColor: KIDS.mint,
              paddingHorizontal: 14,
              paddingVertical: 6,
            }}
          >
            <KidsText size={15} bold style={{ color: KIDS.emeraldShadow }}>
              في حديقتك
            </KidsText>
            <KidsArt emoji="🌳" size={20} />
          </View>
        )
      ) : (
        <>
          <KidsButton tone="sky" size="sm" icon={Gem} className="mt-3" disabled={short > 0} onPress={buy}>
            {toArabicDigits(item.price)}
          </KidsButton>
          {short > 0 && (
            <KidsText size={14} bold tone="muted" center className="mt-1.5">
              تحتاج {toArabicDigits(short)} جوهرة أخرى
            </KidsText>
          )}
        </>
      )}
    </Animated.View>
  );
}

/** A shop section heading on the garden: the white title with its picture beside it. */
function ShopHeading({ title, art }: { title: string; art: string }) {
  return (
    <View className="mb-3 flex-row items-center gap-2">
      <Text className="font-kids-bold" style={HEADING}>
        {title}
      </Text>
      <KidsArt emoji={art} size={30} />
    </View>
  );
}

function ShopTab() {
  const { state } = useKidsProgress();
  const reduceMotion = useReducedMotion();
  const companionItems = REWARD_ITEMS.filter((item) => item.kind === "companion");
  const gardenItems = REWARD_ITEMS.filter((item) => item.kind === "garden");
  return (
    <View style={{ gap: 22 }}>
      <Animated.View entering={enter(reduceMotion, 0)}>
        <KidsPanel className="items-center">
          {state.companion && (
            <Companion animal={state.companion.animal} equipped={state.companion.equipped} mood="happy" width={130} height={176} />
          )}
          <KidsText size={17} tone="muted" center>
            عندك
          </KidsText>
          <View className="flex-row items-center justify-center gap-2">
            <KidsArt emoji="💎" size={38} />
            <KidsText size={34} bold center style={{ color: KIDS.gemText }}>
              {toArabicDigits(gemBalance(state))} <Text style={{ fontSize: 22 }}>جوهرة</Text>
            </KidsText>
          </View>
          <KidsText size={15} tone="muted" center className="mt-2">
            تجمع الجواهر من المحطات وتحدي اليوم والشارات والصناديق.
          </KidsText>
          <KidsButton tone="white" size="sm" icon={RefreshCw} className="mt-3" onPress={() => go("/kids/welcome")}>
            غيّر رفيقك
          </KidsButton>
        </KidsPanel>
      </Animated.View>
      <View>
        <ShopHeading title="لرفيقك" art="🐾" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
          {companionItems.map((item, index) => (
            <ShopItem key={item.id} item={item} index={index + 1} />
          ))}
        </View>
      </View>
      <View>
        <ShopHeading title="لحديقتك" art="🌳" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
          {gardenItems.map((item, index) => (
            <ShopItem key={item.id} item={item} index={index + 1} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function RewardsView({ initialTab }: { initialTab: RewardsTab }) {
  const [tab, setTab] = useState<RewardsTab>(initialTab);
  const { state } = useKidsProgress();
  const reduceMotion = useReducedMotion();
  const chests = unopenedChests(state).length;
  return (
    <KidsScroll>
      <Animated.View entering={enter(reduceMotion, 0)}>
        <KidsPanel className="items-center">
          <KidsArt emoji="🏆" size={56} />
          <KidsText size={28} bold center className="mt-2">
            جوائزي
          </KidsText>
          <View accessibilityRole="tablist" accessibilityLabel="أقسام الجوائز" className="mt-5 flex-row flex-wrap justify-center gap-2">
            {TABS.map((entry) => {
              const active = tab === entry.id;
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="tab"
                  accessibilityLabel={entry.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    sfx.tap();
                    setTab(entry.id);
                  }}
                  style={{
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    backgroundColor: active ? KIDS.violet : KIDS.white,
                    borderBottomWidth: active ? 5 : 2,
                    borderBottomColor: active ? KIDS.violetShadow : KIDS.chipRing,
                    borderWidth: active ? 0 : 2,
                    borderColor: KIDS.chipRing,
                  }}
                >
                  <KidsArt emoji={entry.emoji} size={24} />
                  <KidsText size={16} bold style={{ color: active ? KIDS.white : KIDS.muted }}>
                    {entry.label}
                  </KidsText>
                  {entry.id === "chests" && chests > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -8,
                        end: -4,
                        minWidth: 22,
                        height: 22,
                        borderRadius: 11,
                        paddingHorizontal: 5,
                        backgroundColor: KIDS.rose,
                        borderWidth: 2,
                        borderColor: KIDS.white,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text className="font-kids-bold" style={{ color: KIDS.white, fontSize: 11 }}>
                        {toArabicDigits(chests)}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </KidsPanel>
      </Animated.View>
      <View accessibilityRole="none">
        {tab === "chests" && <ChestsTab />}
        {tab === "badges" && <BadgesTab />}
        {tab === "shop" && <ShopTab />}
      </View>
    </KidsScroll>
  );
}
