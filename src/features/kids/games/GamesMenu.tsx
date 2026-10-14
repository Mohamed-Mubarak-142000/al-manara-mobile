import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { KidsArt } from "../ui/KidsArt";
import { KidsText, KidsTitlePanel } from "../ui/KidsPanel";
import { KidsScroll } from "../ui/KidsScroll";
import { KIDS, PANEL_SHADOW } from "../ui/kidsStyles";
import { go } from "../ui/nav";

interface GameCard {
  href: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  shadow: string;
}

/** Each section title has its own picture beside it (kept out of the string so it draws as 3D art). */
const SECTIONS: { title: string; art: string; games: GameCard[] }[] = [
  {
    title: "ألعاب القرآن",
    art: "📖",
    games: [
      {
        href: "/kids/games/listen-pick",
        title: "اسمع واختر",
        description: "اسمع الآية واعرفها بين الآيات",
        emoji: "🎧",
        color: KIDS.sky,
        shadow: KIDS.skyShadow,
      },
      {
        href: "/kids/games/ayah-order",
        title: "رتّب الآيات",
        description: "رتّب آيات السورة كما في المصحف",
        emoji: "🧩",
        color: KIDS.gold,
        shadow: KIDS.goldShadow,
      },
      {
        href: "/kids/games/arrange",
        title: "رتّب الكلمات",
        description: "رتّب كلمات الآية بالترتيب الصحيح",
        emoji: "🔤",
        color: KIDS.emerald,
        shadow: KIDS.emeraldShadow,
      },
      {
        href: "/kids/games/surah-match",
        title: "ذاكرة السور",
        description: "طابق اسم السورة مع أول آية فيها",
        emoji: "🃏",
        color: KIDS.violet,
        shadow: KIDS.violetShadow,
      },
      {
        href: "/kids/games/true-false",
        title: "صح أم خطأ",
        description: "جمل عن السور: صحيحة أم خطأ؟",
        emoji: "✅",
        color: KIDS.rose,
        shadow: KIDS.roseShadow,
      },
      {
        href: "/kids/quiz",
        title: "اختبر نفسك",
        description: "اختبار كل سورة يفتح التي بعدها",
        emoji: "🧠",
        color: KIDS.orange,
        shadow: KIDS.orangeShadow,
      },
    ],
  },
  {
    title: "الحروف والتجويد",
    art: "🔡",
    games: [
      {
        href: "/kids/games/letters",
        title: "ذاكرة الحروف",
        description: "اقلب البطاقات وطابق كل حرف باسمه",
        emoji: "🅰️",
        color: KIDS.violet,
        shadow: KIDS.violetShadow,
      },
      {
        href: "/kids/games/tajweed",
        title: "لوّن التجويد",
        description: "اكتشف أحكام التجويد ولوّنها",
        emoji: "🎨",
        color: KIDS.rose,
        shadow: KIDS.roseShadow,
      },
    ],
  },
  {
    title: "قصص واستماع",
    art: "🎬",
    games: [
      {
        href: "/kids/stories",
        title: "قصص الأنبياء",
        description: "قصص كرتونية نتعلّم منها",
        emoji: "📺",
        color: KIDS.violet,
        shadow: KIDS.violetShadow,
      },
      {
        href: "/kids/listen",
        title: "استمع مع الأطفال",
        description: "المصحف المعلّم بصوت الشيخ والأطفال",
        emoji: "🎶",
        color: KIDS.sky,
        shadow: KIDS.skyShadow,
      },
    ],
  },
];

/** The website's /kids/games: every game, grouped. */
export function GamesMenu() {
  const reduceMotion = useReducedMotion();
  return (
    <KidsScroll gap={12}>
      <KidsTitlePanel icon={<KidsArt emoji="🎮" size={56} />} title="العب وتعلّم" subtitle="العب وتعلّم واجمع النجوم!" />
      {SECTIONS.map((section, sectionIndex) => (
        <View key={section.title} className="mt-4 gap-3">
          <View className="flex-row items-center gap-2">
            <KidsArt emoji={section.art} size={30} />
            <Text
              className="font-kids-bold"
              style={{
                fontSize: 22,
                color: KIDS.white,
                textShadowColor: "rgba(0,40,30,0.5)",
                textShadowRadius: 4,
                textShadowOffset: { width: 0, height: 2 },
              }}
            >
              {section.title}
            </Text>
          </View>
          {section.games.map((game, index) => (
            <Animated.View
              key={game.href}
              entering={
                reduceMotion
                  ? undefined
                  : FadeInDown.delay(sectionIndex * 150 + index * 60)
                      .springify()
                      .stiffness(260)
                      .damping(18)
              }
            >
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={game.title}
                onPress={() => go(game.href)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    borderRadius: 32,
                    backgroundColor: "rgba(255,255,255,0.95)",
                    padding: 16,
                    borderWidth: 4,
                    borderColor: "rgba(255,255,255,0.6)",
                    transform: [{ translateY: pressed ? -3 : 0 }],
                  },
                  PANEL_SHADOW,
                ]}
              >
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: game.color,
                    borderBottomWidth: 7,
                    borderBottomColor: game.shadow,
                  }}
                >
                  <KidsArt emoji={game.emoji} size={40} />
                </View>
                <View style={{ flex: 1 }}>
                  <KidsText size={20} bold>
                    {game.title}
                  </KidsText>
                  <KidsText size={15} tone="muted">
                    {game.description}
                  </KidsText>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      ))}
    </KidsScroll>
  );
}
