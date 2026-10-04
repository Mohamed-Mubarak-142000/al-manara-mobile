import SwiftUI
import WidgetKit

// Home-screen widgets for iOS, the counterparts of the Android ones (src/widgets). The app writes
// today's prayer times and the reading position into the shared App Group (src/widgets/iosWidgets.ts);
// the widgets read them here and work out the next prayer themselves, so they stay right all day.

private let appGroup = "group.com.almanara.app"
private let night = Color(red: 1 / 255, green: 42 / 255, blue: 34 / 255)
private let deep = Color(red: 0, green: 62 / 255, blue: 50 / 255)
private let gold = Color(red: 205 / 255, green: 162 / 255, blue: 62 / 255)
private let goldSoft = Color(red: 232 / 255, green: 215 / 255, blue: 166 / 255)
private let ivory = Color(red: 251 / 255, green: 248 / 255, blue: 241 / 255)

private let prayerKeys = ["fajr", "dhuhr", "asr", "maghrib", "isha"]
private let prayerNames = ["fajr": "الفجر", "dhuhr": "الظهر", "asr": "العصر", "maghrib": "المغرب", "isha": "العشاء"]

private func arabicDigits(_ text: String) -> String {
  let digits: [Character: Character] = ["0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤", "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩"]
  return String(text.map { digits[$0] ?? $0 })
}

/** "HH:mm" (24h, as the prayer-times API gives it) → "h:mm ص/م" in Arabic digits. */
private func clock(_ hhmm: String) -> String {
  let parts = hhmm.split(separator: ":").compactMap { Int($0) }
  guard parts.count == 2 else { return hhmm }
  let hour12 = parts[0] % 12 == 0 ? 12 : parts[0] % 12
  return arabicDigits(String(format: "%d:%02d", hour12, parts[1])) + (parts[0] < 12 ? " ص" : " م")
}

private func date(on day: Date, _ hhmm: String) -> Date? {
  let parts = hhmm.split(separator: ":").compactMap { Int($0) }
  guard parts.count == 2 else { return nil }
  return Calendar.current.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: day)
}

// MARK: - Next prayer

struct PrayerEntry: TimelineEntry {
  let date: Date
  let label: String
  let times: [String: String]
}

struct PrayerProvider: TimelineProvider {
  private func read(at moment: Date) -> PrayerEntry {
    let shared = UserDefaults(suiteName: appGroup)
    let saved = shared?.dictionary(forKey: "prayer") as? [String: String] ?? [:]
    var times: [String: String] = [:]
    for key in prayerKeys { if let value = saved[key] { times[key] = value } }
    return PrayerEntry(date: moment, label: saved["label"] ?? "", times: times)
  }

  func placeholder(in context: Context) -> PrayerEntry {
    PrayerEntry(date: Date(), label: "القاهرة", times: ["fajr": "04:30", "dhuhr": "11:50", "asr": "15:10", "maghrib": "17:40", "isha": "19:00"])
  }

  func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
    completion(read(at: Date()))
  }

  /** An entry now and one at each of today's prayer times, so "next" moves on by itself. */
  func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
    let now = Date()
    let base = read(at: now)
    var entries = [base]
    for key in prayerKeys {
      if let hhmm = base.times[key], let at = date(on: now, hhmm), at > now {
        entries.append(PrayerEntry(date: at, label: base.label, times: base.times))
      }
    }
    let tomorrow = Calendar.current.startOfDay(for: now.addingTimeInterval(86_400))
    completion(Timeline(entries: entries, policy: .after(tomorrow)))
  }
}

struct NextPrayerView: View {
  let entry: PrayerEntry

  private var next: (key: String, time: String)? {
    for key in prayerKeys {
      if let hhmm = entry.times[key], let at = date(on: entry.date, hhmm), at > entry.date { return (key, hhmm) }
    }
    if let fajr = entry.times["fajr"] { return ("fajr", fajr) }
    return nil
  }

  var body: some View {
    VStack(alignment: .trailing, spacing: 6) {
      HStack {
        Text(entry.label).font(.caption2).foregroundColor(goldSoft)
        Spacer()
        Text("الصلاة القادمة").font(.caption2).foregroundColor(ivory.opacity(0.65))
      }
      if let next = next {
        Text(prayerNames[next.key] ?? "").font(.title2).bold().foregroundColor(ivory)
        Text(clock(next.time)).font(.headline).foregroundColor(gold)
      } else {
        Text("افتح التطبيق لتحديث المواقيت").font(.footnote).foregroundColor(ivory)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
    .environment(\.layoutDirection, .rightToLeft)
    .widgetURL(URL(string: "almanara://prayer"))
    .containerBackground(night, for: .widget)
  }
}

struct NextPrayerWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "NextPrayer", provider: PrayerProvider()) { entry in
      NextPrayerView(entry: entry)
    }
    .configurationDisplayName("الصلاة القادمة")
    .description("موعد الصلاة القادمة لمدينتك")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Continue reading

struct ReadingEntry: TimelineEntry {
  let date: Date
  let surah: String
  let ayah: String
  let page: String
}

struct ReadingProvider: TimelineProvider {
  private func read() -> ReadingEntry {
    let saved = UserDefaults(suiteName: appGroup)?.dictionary(forKey: "reading") as? [String: String] ?? [:]
    return ReadingEntry(date: Date(), surah: saved["surah"] ?? "", ayah: saved["ayah"] ?? "", page: saved["page"] ?? "")
  }

  func placeholder(in context: Context) -> ReadingEntry { ReadingEntry(date: Date(), surah: "البقرة", ayah: "255", page: "42") }
  func getSnapshot(in context: Context, completion: @escaping (ReadingEntry) -> Void) { completion(read()) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<ReadingEntry>) -> Void) {
    completion(Timeline(entries: [read()], policy: .never))
  }
}

struct ContinueReadingView: View {
  let entry: ReadingEntry

  var body: some View {
    VStack(alignment: .trailing, spacing: 6) {
      Text(entry.surah.isEmpty ? "المصحف الشريف" : "تابع القراءة").font(.caption2).foregroundColor(goldSoft)
      Text(entry.surah.isEmpty ? "ابدأ وردك اليوم" : "سورة \(entry.surah)").font(.headline).bold().foregroundColor(ivory).lineLimit(1)
      if !entry.surah.isEmpty {
        Text("الآية \(arabicDigits(entry.ayah)) · صفحة \(arabicDigits(entry.page))").font(.caption2).foregroundColor(ivory.opacity(0.65))
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
    .environment(\.layoutDirection, .rightToLeft)
    .widgetURL(URL(string: entry.page.isEmpty ? "almanara://quran" : "almanara://mushaf?page=\(entry.page)"))
    .containerBackground(deep, for: .widget)
  }
}

struct ContinueReadingWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "ContinueReading", provider: ReadingProvider()) { entry in
      ContinueReadingView(entry: entry)
    }
    .configurationDisplayName("تابع القراءة")
    .description("افتح المصحف من حيث توقفت")
    .supportedFamilies([.systemSmall])
  }
}

@main
struct AlManaraWidgets: WidgetBundle {
  var body: some Widget {
    NextPrayerWidget()
    ContinueReadingWidget()
  }
}
