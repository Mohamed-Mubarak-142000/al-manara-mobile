import { router } from "expo-router";
import { ChevronRight, KeyRound, Pencil, Plus, Trash2, UserRound } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { useAccount, type Learner } from "@/features/account/accountStore";
import { AuthField } from "@/features/account/AuthLayout";
import { MAX_CHILDREN, settings, type SettingsResult } from "@/features/account/settings";
import { unregisterPushToken } from "@/features/notifications/usePushRegistration";
import { useThemeColor } from "@/theme/useThemeColor";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface p-5">
      <View>
        <Text className="font-display-bold text-lg text-fg">{title}</Text>
        {description ? <Text className="mt-1 font-sans text-xs leading-5 text-fg-muted">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Feedback({ result }: { result: SettingsResult | null }) {
  if (!result) return null;
  return (
    <Text className={`font-sans text-sm ${result.ok ? "text-primary" : "text-danger"}`}>{result.ok ? result.message : result.error}</Text>
  );
}

/** One child: shown, edited in place, or confirming deletion (it removes all their progress). */
function ChildRow({ child }: { child: Learner }) {
  const muted = useThemeColor("fg-muted");
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [name, setName] = useState(child.display_name);
  const [year, setYear] = useState(child.birth_year ? String(child.birth_year) : "");
  const [result, setResult] = useState<SettingsResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<SettingsResult>) {
    setBusy(true);
    const outcome = await action();
    setBusy(false);
    setResult(outcome);
    if (outcome.ok) setMode("view");
  }

  return (
    <View className="gap-2 rounded-2xl bg-bg p-3">
      {mode === "edit" ? (
        <>
          <AuthField label="اسم الطفل" value={name} onChangeText={setName} autoCapitalize="words" />
          <AuthField label="سنة الميلاد (اختياري)" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
          <View className="flex-row gap-2">
            <Button size="sm" disabled={busy} onPress={() => run(() => settings.updateChild(child.id, name, year))}>
              حفظ
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setMode("view")}>
              تراجع
            </Button>
          </View>
        </>
      ) : (
        <View className="flex-row items-center gap-3">
          <View className="size-10 items-center justify-center rounded-full bg-primary-soft">
            <Text className="font-display-bold text-base text-primary">{child.display_name.slice(0, 1)}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-display-bold text-base text-fg">{child.display_name}</Text>
            {child.birth_year ? <Text className="font-sans text-xs text-fg-muted">مواليد {toArabicDigits(child.birth_year)}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="تعديل" onPress={() => setMode("edit")} hitSlop={8} className="p-2">
            <Pencil size={17} color={muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="حذف" onPress={() => setMode("delete")} hitSlop={8} className="p-2">
            <Trash2 size={17} color={muted} />
          </Pressable>
        </View>
      )}
      {mode === "delete" && (
        <View className="gap-2 rounded-xl bg-danger/10 p-3">
          <Text className="font-sans-bold text-sm text-danger">سيُحذف كل تقدّمه، متأكد؟</Text>
          <View className="flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onPress={() => run(() => settings.removeChild(child.id, child.display_name))}
            >
              نعم، احذف
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setMode("view")}>
              تراجع
            </Button>
          </View>
        </View>
      )}
      <Feedback result={result} />
    </View>
  );
}

/** The website's /account: profile, children, password, email preferences, and account deletion. */
export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const heroFg = useThemeColor("hero-fg");
  const primary = useThemeColor("primary");
  const border = useThemeColor("border");
  const surface = useThemeColor("surface");
  const state = useAccount();
  const profile = state.status === "signed-in" ? state.profile : null;
  const children = state.status === "signed-in" ? state.learners.filter((learner) => learner.kind === "child") : [];

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [certificateName, setCertificateName] = useState(profile?.certificate_name ?? "");
  const [profileResult, setProfileResult] = useState<SettingsResult | null>(null);
  const [childName, setChildName] = useState("");
  const [childYear, setChildYear] = useState("");
  const [adding, setAdding] = useState(false);
  const [childResult, setChildResult] = useState<SettingsResult | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordResult, setPasswordResult] = useState<SettingsResult | null>(null);
  const [prefResult, setPrefResult] = useState<SettingsResult | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [deleteResult, setDeleteResult] = useState<SettingsResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<SettingsResult>, show: (result: SettingsResult) => void) {
    setBusy(key);
    const result = await action();
    setBusy(null);
    show(result);
    return result;
  }

  if (state.status !== "signed-in") {
    return (
      <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8 }}>
        {state.status === "loading" ? (
          <StateMessage loading />
        ) : (
          <StateMessage message="سجّل الدخول لإدارة حسابك." actionLabel="تسجيل الدخول" onAction={() => router.push("/login")} />
        )}
      </View>
    );
  }

  const track = { false: border, true: primary };

  // Android too: edge-to-edge (forced on RN 0.86 / Android 15+) means the window is no longer resized for the
  // keyboard, so without padding it covers the lower fields. KeyboardAvoidingView measures the overlap
  // itself, so it adds nothing where the system already made room.
  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior="padding">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
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
          <Text className="font-sans-bold text-sm text-gold-soft">حسابي</Text>
          <Text className="mt-2 font-display-bold text-3xl text-hero-fg">أهلًا {profile?.full_name || "بك"}</Text>
          <Text className="mt-1 font-sans text-sm text-white/75">بياناتك، وملفات أطفالك، وكلمة المرور.</Text>
        </View>

        <View className="gap-4 px-4 pt-5">
          <Section title="بياناتي" description="الاسم على الشهادات يُثبَّت في كل شهادة لحظة إصدارها.">
            <View className="flex-row items-center gap-2 rounded-2xl bg-bg px-4 py-3">
              <UserRound size={16} color={primary} />
              <Text className="font-sans text-sm text-fg-muted">{state.email}</Text>
            </View>
            <AuthField label="الاسم" value={fullName} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" />
            <AuthField label="الاسم على الشهادات" value={certificateName} onChangeText={setCertificateName} autoCapitalize="words" />
            <Text className="-mt-1 font-sans text-xs text-fg-muted">اكتبه كاملًا كما تحب أن يُطبع على شهاداتك.</Text>
            <Feedback result={profileResult} />
            <Button
              disabled={busy === "profile"}
              onPress={() => run("profile", () => settings.updateProfile(fullName, certificateName), setProfileResult)}
            >
              حفظ البيانات
            </Button>
          </Section>

          <Section title="أطفالي" description="لكل طفل ملف مستقل بحفظه وشهاداته، وتنتقل بينهم من صفحة «المزيد».">
            {children.map((child) => (
              <ChildRow key={child.id} child={child} />
            ))}
            {adding ? (
              <View className="gap-2 rounded-2xl bg-bg p-3">
                <AuthField label="اسم الطفل" value={childName} onChangeText={setChildName} autoCapitalize="words" />
                <AuthField
                  label="سنة الميلاد (اختياري)"
                  value={childYear}
                  onChangeText={setChildYear}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <View className="flex-row gap-2">
                  <Button
                    size="sm"
                    disabled={busy === "child"}
                    onPress={async () => {
                      const result = await run("child", () => settings.addChild(childName, childYear, children.length), setChildResult);
                      if (result.ok) {
                        setAdding(false);
                        setChildName("");
                        setChildYear("");
                      }
                    }}
                  >
                    إضافة
                  </Button>
                  <Button size="sm" variant="ghost" onPress={() => setAdding(false)}>
                    تراجع
                  </Button>
                </View>
              </View>
            ) : (
              children.length < MAX_CHILDREN && (
                <Button variant="outline" icon={Plus} onPress={() => setAdding(true)}>
                  إضافة طفل
                </Button>
              )
            )}
            <Feedback result={childResult} />
          </Section>

          <Section title="كلمة المرور" description="إن كنت تدخل بحساب جوجل، يمكنك هنا تعيين كلمة مرور للدخول بالبريد أيضًا.">
            <AuthField
              label="كلمة المرور الجديدة"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <AuthField label="تأكيد كلمة المرور" value={confirm} onChangeText={setConfirm} secureTextEntry />
            <Feedback result={passwordResult} />
            <Button
              variant="outline"
              icon={KeyRound}
              disabled={busy === "password"}
              onPress={async () => {
                const result = await run("password", () => settings.changePassword(password, confirm), setPasswordResult);
                if (result.ok) {
                  setPassword("");
                  setConfirm("");
                }
              }}
            >
              تغيير كلمة المرور
            </Button>
          </Section>

          <Section title="رسائل التحديثات" description="رسائل قليلة على بريدك عند إضافة ميزة جديدة للمنارة.">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 font-sans text-sm leading-6 text-fg">أرسلوا لي رسائل عن الميزات الجديدة في المنارة</Text>
              <Switch
                value={profile?.email_updates ?? true}
                onValueChange={(value) => void run("updates", () => settings.setEmailUpdates(value), setPrefResult)}
                trackColor={track}
                thumbColor={surface}
              />
            </View>
            <Feedback result={prefResult} />
          </Section>

          {/* The Friday / fasting / seasons reminders are in Settings → الإشعارات, with the other notifications. */}
          <Pressable accessibilityRole="link" onPress={() => router.push("/settings")} hitSlop={8} className="self-center py-1">
            <Text className="font-sans-bold text-sm text-primary">تذكيرات الجمعة والصيام في الإعدادات ←</Text>
          </Pressable>

          <Section title="حذف الحساب" description="يُحذف حسابك وملفات أطفالك وكل التقدّم والشهادات نهائيًا، ولا يمكن التراجع.">
            <AuthField label='اكتب "حذف" للتأكيد' value={deleteText} onChangeText={setDeleteText} />
            <Feedback result={deleteResult} />
            <Button
              variant="outline"
              icon={Trash2}
              disabled={deleteText.trim() !== "حذف" || busy === "delete"}
              onPress={async () => {
                await unregisterPushToken();
                const result = await run("delete", () => settings.deleteAccount(deleteText), setDeleteResult);
                if (result.ok) router.dismissAll();
              }}
            >
              حذف حسابي نهائيًا
            </Button>
          </Section>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
