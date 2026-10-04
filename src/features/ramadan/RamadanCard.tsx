import { router } from "expo-router";
import { BookMarked, Moon } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { getHijriDate } from "@/core/calendar/hijriDate";
import { ALL_DAYS } from "@/core/plan/schedule";
import { formatPrayerClock } from "@/core/prayer/prayerTimesApi";
import { pad2, toArabicDigits } from "@/core/text/arabic";
import { Button } from "@/components/ui/Button";
import { khatma, useKhatma } from "@/features/khatma/khatmaStore";
import { usePrayerDay } from "@/features/prayer/usePrayerDay";
import { useThemeColor } from "@/theme/useThemeColor";

/** Minutes before Fajr that imsak is announced, as on Egyptian Ramadan calendars. */
export const IMSAK_MINUTES = 10;

/** Abu Dawud (hasan): what the Prophet ﷺ said when breaking his fast. */
const IFTAR_DUA = { text: "ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ العُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ", source: "رواه أبو داود" };

function at(base: Date, hhmm: string, minutesOffset = 0): Date {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const date = new Date(base);
  date.setHours(h, m + minutesOffset, 0, 0);
  return date;
}

function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return toArabicDigits(`${pad2(Math.floor(total / 3600))}:${pad2(Math.floor((total % 3600) / 60))}`);
}

/** Shown on the home screen during Ramadan only: the day, imsak and iftar, a Ramadan khatma, the iftar dua. */
export function RamadanCard() {
  const gold = useThemeColor("gold-soft");
  const { now, state } = usePrayerDay();
  const current = useKhatma();
  const [starting, setStarting] = useState(false);
  const hijri = getHijriDate(now);
  if (!hijri.isRamadan) return null;

  const times = state.status === "ready" ? state.day.times : null;
  const imsak = times ? at(now, times.fajr, -IMSAK_MINUTES) : null;
  const iftar = times ? at(now, times.maghrib) : null;
  const fasting = imsak && iftar ? now >= imsak && now < iftar : false;
  const hasKhatma = current.status === "ready" && current.current?.khatma.status === "active";

  async function startRamadanKhatma() {
    setStarting(true);
    // One juz a day finishes in the month; it replaces the current khatma, like starting any new one.
    await khatma.create({ mode: "amount", unit: "juz", perSession: 1, targetDay: "", days: [...ALL_DAYS] });
    setStarting(false);
    router.push("/khatma");
  }

  return (
    <View className="gap-4 overflow-hidden rounded-[28px] bg-emerald-night p-5">
      <View className="absolute -end-10 -top-10 size-40 rounded-full bg-gold/10" />
      <View className="flex-row items-center gap-2">
        <Moon size={18} color={gold} />
        <Text className="font-sans-bold text-sm text-gold-soft">رمضان كريم · اليوم {toArabicDigits(hijri.day)} من رمضان</Text>
      </View>

      {times && imsak && iftar ? (
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-white/10 p-3">
            <Text className="font-sans text-xs text-white/65">الإمساك</Text>
            <Text className="font-display-bold text-xl text-white">
              {toArabicDigits(formatPrayerClock(`${pad2(imsak.getHours())}:${pad2(imsak.getMinutes())}`))}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white/10 p-3">
            <Text className="font-sans text-xs text-white/65">الإفطار (المغرب)</Text>
            <Text className="font-display-bold text-xl text-white">{toArabicDigits(formatPrayerClock(times.maghrib))}</Text>
          </View>
        </View>
      ) : null}
      {fasting && iftar ? (
        <Text className="font-display-bold text-lg text-gold-soft">باقٍ على الإفطار {countdown(iftar.getTime() - now.getTime())}</Text>
      ) : imsak && now < imsak ? (
        <Text className="font-display-bold text-lg text-gold-soft">باقٍ على الإمساك {countdown(imsak.getTime() - now.getTime())}</Text>
      ) : null}

      <View className="rounded-2xl bg-white/5 p-3">
        <Text className="font-sans text-xs text-white/60">دعاء الإفطار</Text>
        <Text className="mt-1 font-quran-fallback text-lg leading-9 text-white">{IFTAR_DUA.text}</Text>
        <Text className="font-sans text-[11px] text-white/50">{IFTAR_DUA.source}</Text>
      </View>

      {!hasKhatma && (
        <Button variant="gold" icon={BookMarked} disabled={starting} onPress={startRamadanKhatma}>
          ابدأ ختمة رمضان (جزء كل يوم)
        </Button>
      )}
    </View>
  );
}
