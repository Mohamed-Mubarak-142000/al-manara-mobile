import { FlexWidget, TextWidget } from "react-native-android-widget";

import { PRAYER_LABELS, formatPrayerClock, getPrayerWindow, type PrayerKey, type PrayerTimes } from "@/core/prayer/prayerTimesApi";
import { toArabicDigits } from "@/core/text/arabic";

/**
 * Home-screen widgets (Android). Drawn with the widget primitives, so colours are the design
 * system's values written out (widgets can't read the app's CSS variables).
 */
const C = {
  night: "#012a22",
  deep: "#003e32",
  ivory: "#fbf8f1",
  gold: "#cda23e",
  goldSoft: "#e8d7a6",
  faint: "#9db0a6",
} as const;
const FONT = "Cairo_700Bold";
const OBLIGATORY: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export interface PrayerWidgetData {
  label: string;
  times: PrayerTimes | null;
}

export function NextPrayerWidget({ data, now }: { data: PrayerWidgetData; now: Date }) {
  const next = data.times ? getPrayerWindow(data.times, now).next : null;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: "almanara://prayer" }}
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: C.night,
        borderRadius: 24,
        padding: 14,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", width: "match_parent" }}>
        <TextWidget text="الصلاة القادمة" style={{ fontSize: 12, color: C.faint, fontFamily: FONT }} />
        <TextWidget text={data.label} style={{ fontSize: 12, color: C.goldSoft, fontFamily: FONT }} />
      </FlexWidget>
      {next && data.times ? (
        <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent", justifyContent: "space-between" }}>
          <TextWidget text={next.label} style={{ fontSize: 26, color: C.ivory, fontFamily: FONT }} />
          <TextWidget
            text={toArabicDigits(formatPrayerClock(data.times[next.key]))}
            style={{ fontSize: 22, color: C.gold, fontFamily: FONT }}
          />
        </FlexWidget>
      ) : (
        <TextWidget text="افتح التطبيق لتحديث المواقيت" style={{ fontSize: 14, color: C.ivory, fontFamily: FONT }} />
      )}
      {data.times && (
        <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", width: "match_parent" }}>
          {OBLIGATORY.map((key) => (
            <FlexWidget key={key} style={{ flexDirection: "column", alignItems: "center" }}>
              <TextWidget
                text={PRAYER_LABELS[key]}
                style={{ fontSize: 10, color: key === next?.key ? C.gold : C.faint, fontFamily: FONT }}
              />
              <TextWidget
                text={toArabicDigits(formatPrayerClock(data.times![key]).split(" ")[0] ?? "")}
                style={{ fontSize: 11, color: key === next?.key ? C.gold : C.ivory, fontFamily: FONT }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

export interface ReadingWidgetData {
  surahName: string | null;
  ayah: number;
  page: number;
}

export function ContinueReadingWidget({ data }: { data: ReadingWidgetData }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: data.surahName ? `almanara://mushaf?page=${data.page}` : "almanara://quran" }}
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: C.deep,
        borderRadius: 24,
        padding: 14,
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <TextWidget text={data.surahName ? "تابع القراءة" : "المصحف الشريف"} style={{ fontSize: 12, color: C.goldSoft, fontFamily: FONT }} />
      <TextWidget
        text={data.surahName ? `سورة ${data.surahName}` : "ابدأ وردك اليوم"}
        style={{ fontSize: 20, color: C.ivory, fontFamily: FONT }}
        maxLines={1}
      />
      {data.surahName && (
        <TextWidget
          text={`الآية ${toArabicDigits(data.ayah)} · صفحة ${toArabicDigits(data.page)}`}
          style={{ fontSize: 12, color: C.faint, fontFamily: FONT }}
        />
      )}
    </FlexWidget>
  );
}
