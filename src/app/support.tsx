import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Check, ChevronRight, Clock, Copy, HandHeart, ImagePlus, LogIn, MessageCircleHeart, Sparkles, UserRound, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { useAccount } from "@/features/account/accountStore";
import { AuthField, FormError } from "@/features/account/AuthLayout";
import { donationProblem, submitDonation, useMyDonation, type NewDonation } from "@/features/support/donationApi";
import { INSTAPAY_NUMBER, QUICK_AMOUNTS, SUPPORTER_PERKS, useSupporter } from "@/features/support/supportStore";
import { useThemeColor } from "@/theme/useThemeColor";

function InstaPayCard() {
  const gold = useThemeColor("gold-soft");
  const [copied, setCopied] = useState(false);
  async function copy() {
    await Clipboard.setStringAsync(INSTAPAY_NUMBER).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <View className="gap-3 rounded-3xl border border-gold/40 bg-surface p-5 shadow-soft">
      <Text className="font-sans-bold text-sm text-accent-strong">١. حوّل عبر إنستاباي</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`نسخ الرقم ${INSTAPAY_NUMBER}`}
        onPress={copy}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <View className="flex-row items-center gap-3 rounded-2xl bg-hero px-4 py-3.5">
          <Text selectable className="flex-1 text-center font-display-bold text-2xl tracking-widest text-hero-fg">
            {INSTAPAY_NUMBER}
          </Text>
          <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
            {copied ? <Check size={16} color={gold} /> : <Copy size={16} color={gold} />}
            <Text className="font-sans-bold text-xs text-gold-soft">{copied ? "تم النسخ" : "نسخ"}</Text>
          </View>
        </View>
      </Pressable>
      <Text className="font-sans text-xs leading-5 text-fg-muted">
        افتح تطبيق إنستاباي وحوّل أي مبلغ تريده إلى هذا الرقم، ثم خذ لقطة شاشة لصفحة نجاح التحويل وارفعها هنا.
      </Text>
    </View>
  );
}

function StatusCard({ icon: Icon, title, body, tone }: { icon: typeof Clock; title: string; body: string; tone: "wait" | "done" | "warn" }) {
  const color = useThemeColor(tone === "warn" ? "danger" : tone === "done" ? "primary" : "accent-strong");
  return (
    <View className={`flex-row gap-3 rounded-3xl border p-4 ${tone === "warn" ? "border-danger/40 bg-surface" : "border-gold/40 bg-accent-soft"}`}>
      <Icon size={22} color={color} />
      <View className="flex-1 gap-1">
        <Text className="font-display-bold text-base text-fg">{title}</Text>
        <Text className="font-sans text-sm leading-6 text-fg-muted">{body}</Text>
      </View>
    </View>
  );
}

/** The form: amount, name, optional message, screenshot, send. All on one screen. */
function DonationForm({ defaultName, onSent }: { defaultName: string; onSent: () => void }) {
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  const muted = useThemeColor("fg-muted");
  const [amountText, setAmountText] = useState("");
  const [displayName, setDisplayName] = useState(defaultName);
  const [sender, setSender] = useState("");
  const [message, setMessage] = useState("");
  const [showName, setShowName] = useState(true);
  const [receipt, setReceipt] = useState<NewDonation["receipt"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const amount = Number(amountText.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))));

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.7 }).catch(() => null);
    const asset = result && !result.canceled ? result.assets[0] : undefined;
    if (asset) {
      setReceipt({ uri: asset.uri, mimeType: asset.mimeType });
      setError(null);
    }
  }

  async function send() {
    const input = { amount, sender, displayName, message, showName, receipt };
    const problem = donationProblem(input);
    if (problem) {
      setError(problem);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setSending(true);
    setError(null);
    const result = await submitDonation({ ...input, receipt: receipt! });
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSent();
  }

  return (
    <View className="gap-4 rounded-3xl border border-border bg-surface p-5 shadow-soft">
      <Text className="font-sans-bold text-sm text-accent-strong">٢. أرسل بيانات التحويل</Text>

      <View className="gap-2">
        <Text className="font-sans-bold text-sm text-fg">المبلغ (جنيه)</Text>
        <View className="flex-row gap-2">
          {QUICK_AMOUNTS.map((value) => {
            const active = amount === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setAmountText(String(value))}
                className={`flex-1 items-center rounded-2xl border py-2.5 ${active ? "border-primary bg-primary" : "border-border bg-bg"}`}
              >
                <Text className={`font-sans-bold text-sm ${active ? "text-on-primary" : "text-fg"}`}>{toArabicDigits(value)}</Text>
              </Pressable>
            );
          })}
        </View>
        <AuthField label="" placeholder="أو اكتب المبلغ" keyboardType="number-pad" value={amountText} onChangeText={setAmountText} accessibilityLabel="المبلغ" />
      </View>

      <AuthField label="اسمك" icon={UserRound} value={displayName} onChangeText={setDisplayName} maxLength={60} autoCapitalize="words" />
      <AuthField
        label="اسم أو رقم المحوِّل في إنستاباي"
        placeholder="كما يظهر في التحويل"
        value={sender}
        onChangeText={setSender}
        maxLength={60}
      />
      <AuthField
        label="رسالة أو دعاء (اختياري)"
        icon={MessageCircleHeart}
        placeholder="يظهر مع اسمك في الرئيسية"
        value={message}
        onChangeText={setMessage}
        maxLength={140}
      />

      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Text className="font-sans-bold text-sm text-fg">أظهر اسمي في قسم الداعمين</Text>
          <Text className="font-sans text-xs text-fg-muted">وإلا يظهر «فاعل خير». المبلغ لا يظهر أبدًا.</Text>
        </View>
        <Switch value={showName} onValueChange={setShowName} trackColor={{ false: border, true: primary }} thumbColor={surface} />
      </View>

      {receipt ? (
        <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-bg p-2.5">
          <Image source={{ uri: receipt.uri }} style={{ width: 56, height: 72, borderRadius: 12 }} contentFit="cover" />
          <Text className="flex-1 font-sans-bold text-sm text-fg">صورة التحويل جاهزة</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="إزالة الصورة" onPress={() => setReceipt(null)} hitSlop={10} className="p-2">
            <X size={18} color={muted} />
          </Pressable>
        </View>
      ) : (
        <Pressable accessibilityRole="button" onPress={pick} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <View className="items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-primary/50 bg-primary-soft py-5">
            <ImagePlus size={26} color={primary} />
            <Text className="font-sans-bold text-sm text-primary">ارفع صورة التحويل</Text>
          </View>
        </Pressable>
      )}

      <FormError message={error} />
      <Button variant="gold" size="lg" icon={HandHeart} disabled={sending} onPress={send}>
        {sending ? "جارٍ الإرسال…" : "إرسال"}
      </Button>
      {sending && <ActivityIndicator color={primary} />}
    </View>
  );
}

/**
 * "ادعم المنارة" by InstaPay, on one screen: copy the number, transfer, then send the amount, name and a
 * screenshot. The request waits for an admin (/admin/supporters on the website); once approved the name
 * shows on Home and a thank-you email goes out. An account is needed to link the request and the email.
 */
export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const gold = useThemeColor("gold-soft");
  const primary = useThemeColor("primary");
  const account = useAccount();
  const supporter = useSupporter();
  const { donation, loading, reload } = useMyDonation();
  const [sendAgain, setSendAgain] = useState(false);

  const signedIn = account.status === "signed-in";
  const defaultName = signedIn ? (account.profile?.full_name ?? "") : "";
  const pending = donation?.status === "pending";
  const showForm = signedIn && !loading && !pending && (sendAgain || donation?.status !== "rejected");

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View className="rounded-b-[32px] bg-hero px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} hitSlop={12} className="mb-3 self-start p-1">
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
        {supporter && (
          <StatusCard icon={Sparkles} tone="done" title="أنت من داعمي المنارة ✓" body="جزاك الله خيرًا. يمكنك الدعم مرة أخرى متى شئت." />
        )}

        <InstaPayCard />

        {!signedIn && account.status !== "loading" ? (
          <View className="gap-3 rounded-3xl border border-border bg-surface p-5">
            <Text className="font-display-bold text-base text-fg">سجّل الدخول لإرسال دعمك</Text>
            <Text className="font-sans text-sm leading-6 text-fg-muted">نحتاج حسابك لنربط التحويل بك ونرسل لك رسالة الشكر بعد التأكد منه.</Text>
            <Button icon={LogIn} onPress={() => router.push("/login")}>
              تسجيل الدخول
            </Button>
          </View>
        ) : loading ? (
          <ActivityIndicator color={primary} className="py-6" />
        ) : pending ? (
          <StatusCard
            icon={Clock}
            tone="wait"
            title="طلبك قيد المراجعة"
            body="سنتأكد من التحويل ونرسل لك رسالة شكر على بريدك، ثم يظهر اسمك في قسم داعمي المنارة بإذن الله."
          />
        ) : donation?.status === "rejected" && !sendAgain ? (
          <View className="gap-3">
            <StatusCard
              icon={X}
              tone="warn"
              title="لم نتمكن من تأكيد تحويلك"
              body={donation.reject_reason ?? "راجع بيانات التحويل والصورة ثم أرسلها مرة أخرى."}
            />
            <Button variant="outline" onPress={() => setSendAgain(true)}>
              إرسال طلب جديد
            </Button>
          </View>
        ) : null}

        {showForm && (
          <DonationForm
            defaultName={defaultName}
            onSent={() => {
              setSendAgain(false);
              reload();
            }}
          />
        )}

        <View className="gap-2 rounded-3xl border border-border bg-surface p-5">
          <Text className="font-display-bold text-base text-fg">ماذا يحصل الداعم؟</Text>
          {SUPPORTER_PERKS.map((perk) => (
            <View key={perk} className="flex-row items-center gap-2">
              <Check size={16} color={primary} />
              <Text className="flex-1 font-sans text-sm text-fg">{perk}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
