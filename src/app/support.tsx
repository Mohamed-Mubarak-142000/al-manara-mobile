import { router } from "expo-router";
import { isUserCancelledError, useIAP, type Purchase } from "expo-iap";
import { Check, ChevronRight, HandHeart, Palette, RotateCcw, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { ALL_PRODUCT_IDS, DONATIONS, SUPPORTER_PACK, isDonation, setSupporter, useSupporter } from "@/features/support/supportStore";
import { useThemeColor } from "@/theme/useThemeColor";

const PERKS = ["ألوان إضافية لصفحات المصحف", "شكر خاص في صفحة الداعمين", "أجر المساهمة في نشر القرآن بإذن الله"];

/**
 * "ادعم المنارة": the app stays free with no ads and no subscriptions. Donations are consumable
 * one-time purchases; the supporter pack is a one-time, lifetime purchase with cosmetic perks only.
 */
export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
  const primary = useThemeColor("primary");
  const supporter = useSupporter();
  const [thanks, setThanks] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction, availablePurchases, restorePurchases } = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      // Grant first, then finish: an unfinished purchase is redelivered, a finished one is not.
      if (purchase.productId === SUPPORTER_PACK) setSupporter(true);
      await finishTransaction({ purchase, isConsumable: isDonation(purchase.productId) });
      setPending(null);
      setThanks(
        purchase.productId === SUPPORTER_PACK ? "أصبحت من داعمي المنارة. جزاك الله خيرًا." : "تقبّل الله صدقتك وجعلها في ميزان حسناتك.",
      );
    },
    onPurchaseError: (purchaseError) => {
      setPending(null);
      // Backing out of the store sheet is not an error worth showing.
      if (!isUserCancelledError(purchaseError)) setError("لم تكتمل العملية. لم يُخصم منك شيء، حاول مرة أخرى.");
    },
  });

  useEffect(() => {
    if (connected) fetchProducts({ skus: ALL_PRODUCT_IDS, type: "in-app" }).catch(() => {});
  }, [connected, fetchProducts]);

  // A pack bought on another phone (or before a reinstall) comes back with the store's purchase list.
  useEffect(() => {
    if (availablePurchases.some((purchase) => purchase.productId === SUPPORTER_PACK)) setSupporter(true);
  }, [availablePurchases]);

  function buy(productId: string) {
    setError(null);
    setThanks(null);
    setPending(productId);
    requestPurchase({
      type: "in-app",
      request: Platform.OS === "ios" ? { apple: { sku: productId } } : { google: { skus: [productId] } },
    }).catch(() => setPending(null));
  }

  const price = (id: string) => products.find((product) => product.id === id)?.displayPrice;
  const pack = price(SUPPORTER_PACK);

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => router.back()}
          hitSlop={12}
          className="mb-3 self-start p-1"
        >
          <ChevronRight size={26} color={heroFg} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <HandHeart size={16} color={gold} />
          <Text className="font-sans-bold text-sm text-gold-soft">صدقة جارية</Text>
        </View>
        <Text className="mt-2 font-display-bold text-3xl text-hero-fg">ادعم المنارة</Text>
        <Text className="mt-2 font-sans text-sm leading-7 text-white/75">
          المنارة مجانية بالكامل، بلا إعلانات وبلا اشتراكات. دعمك يغطي الخوادم ويضيف قرّاءً وروايات ومحتوى للأطفال، ويبقيها مجانية لكل مسلم.
        </Text>
      </View>

      <View className="gap-4 px-4 pt-5">
        {thanks ? (
          <View className="flex-row items-center gap-3 rounded-3xl border border-gold/40 bg-accent-soft p-4">
            <Sparkles size={22} color={gold} />
            <Text className="flex-1 font-sans-bold text-sm leading-6 text-fg">{thanks}</Text>
          </View>
        ) : null}
        {error ? <Text className="font-sans text-sm text-danger">{error}</Text> : null}

        <View className="gap-3 rounded-3xl border border-gold/40 bg-surface p-5 shadow-soft">
          <View className="flex-row items-center gap-3">
            <View className="size-11 items-center justify-center rounded-2xl bg-accent-soft">
              <Palette size={22} color={primary} />
            </View>
            <View className="flex-1">
              <Text className="font-display-bold text-lg text-fg">باقة الداعمين</Text>
              <Text className="font-sans text-xs text-fg-muted">مرة واحدة مدى الحياة · بلا اشتراك</Text>
            </View>
          </View>
          {PERKS.map((perk) => (
            <View key={perk} className="flex-row items-center gap-2">
              <Check size={16} color={primary} />
              <Text className="font-sans text-sm text-fg">{perk}</Text>
            </View>
          ))}
          {supporter ? (
            <View className="items-center rounded-2xl bg-primary-soft py-3">
              <Text className="font-sans-bold text-sm text-primary">أنت من داعمي المنارة ✓</Text>
            </View>
          ) : (
            <Button variant="gold" size="lg" onPress={() => buy(SUPPORTER_PACK)} disabled={!pack || pending !== null}>
              {pending === SUPPORTER_PACK ? "جارٍ الشراء…" : pack ? `انضم للداعمين · ${pack}` : "باقة الداعمين"}
            </Button>
          )}
        </View>

        <Text className="mt-2 font-display-bold text-lg text-fg">صدقة لمرة واحدة</Text>
        {DONATIONS.map((donation) => {
          const amount = price(donation.id);
          return (
            <Pressable
              key={donation.id}
              accessibilityRole="button"
              disabled={!amount || pending !== null}
              onPress={() => buy(donation.id)}
              style={({ pressed }) => ({ opacity: !amount ? 0.6 : pressed ? 0.8 : 1 })}
            >
              <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface p-4">
                <HandHeart size={22} color={primary} />
                <View className="flex-1">
                  <Text className="font-display-bold text-base text-fg">{donation.label}</Text>
                  <Text className="font-sans text-xs leading-5 text-fg-muted">{donation.note}</Text>
                </View>
                {pending === donation.id ? (
                  <ActivityIndicator color={primary} />
                ) : (
                  <Text className="font-display-bold text-base text-primary">{amount ?? "…"}</Text>
                )}
              </View>
            </Pressable>
          );
        })}

        {!connected && <Text className="text-center font-sans text-xs text-fg-muted">جارٍ الاتصال بالمتجر…</Text>}
        <Button variant="ghost" size="sm" icon={RotateCcw} onPress={() => restorePurchases().catch(() => {})}>
          استعادة باقة الداعمين
        </Button>
        <Text className="text-center font-sans text-xs leading-5 text-fg-muted">
          الدفع يتم عبر {Platform.OS === "ios" ? "App Store" : "Google Play"} بأمان، ولا نطّلع على بيانات بطاقتك.
        </Text>
      </View>
    </ScrollView>
  );
}
