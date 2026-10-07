package com.almanara.background

import android.app.*
import android.content.*
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

internal object BackgroundState {
  const val DHIKR_CHANNEL = "dhikr-service-v1"
  const val PRAYER_CHANNEL = "prayer-native-v1"
  const val AUDIO_CHANNEL = "adhan-playing-v1"
  const val DHIKR_NOTIFICATION = 7101
  const val AUDIO_NOTIFICATION = 7102
  private const val ON_TIME_MS = 3 * 60_000L
  private const val LATE_NOTICE_MS = 30 * 60_000L
  // App process only. The dhikr overlay runs in its own process: see OverlayStore and DhikrService.running.
  @Volatile var adhanPlaying = false
  @Volatile var adhanFinishedAt = 0L

  fun prefs(context: Context) = context.getSharedPreferences("almanara-background-v1", Context.MODE_PRIVATE)
  fun alarms(context: Context) = context.getSystemService(AlarmManager::class.java)
  fun exactAllowed(context: Context) = Build.VERSION.SDK_INT < 31 || alarms(context).canScheduleExactAlarms()

  fun channels(context: Context) {
    if (Build.VERSION.SDK_INT < 26) return
    val manager = context.getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(NotificationChannel(DHIKR_CHANNEL, "ذكر كل ١٠ دقائق", NotificationManager.IMPORTANCE_LOW).apply { setSound(null, null) })
    manager.createNotificationChannel(NotificationChannel(AUDIO_CHANNEL, "الأذان الجاري", NotificationManager.IMPORTANCE_LOW).apply { setSound(null, null) })
    manager.createNotificationChannel(NotificationChannel(PRAYER_CHANNEL, "مواقيت الصلاة", NotificationManager.IMPORTANCE_HIGH))
  }

  fun openApp(context: Context, path: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("almanara://$path")).setPackage(context.packageName)
    return PendingIntent.getActivity(context, path.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun notification(context: Context, channel: String, title: String, body: String, path: String): NotificationCompat.Builder {
    channels(context)
    return NotificationCompat.Builder(context, channel)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(title).setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(openApp(context, path))
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
  }

  private fun alarmIntent(context: Context, at: Long): PendingIntent = PendingIntent.getBroadcast(
    context, 7103, Intent(context, PrayerReceiver::class.java).putExtra("at", at),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  private fun arm(context: Context, moments: JSONArray) {
    val next = (0 until moments.length()).map { moments.getJSONObject(it) }
      .filter { it.getLong("at") > System.currentTimeMillis() }.minByOrNull { it.getLong("at") }
    if (next == null) {
      alarms(context).cancel(alarmIntent(context, 0))
      return
    }
    if (exactAllowed(context)) {
      // User-requested prayer alarms must not be delayed by the idle-mode quota between reminders.
      alarms(context).setAlarmClock(
        AlarmManager.AlarmClockInfo(next.getLong("at"), openApp(context, "prayer")),
        alarmIntent(context, next.getLong("at")),
      )
    } else {
      // Exact alarms switched off (Android 14 asks for them separately): still schedule, allowed to
      // fire in Doze. It can come a few minutes late, which beats no adhan at all.
      alarms(context).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getLong("at"), alarmIntent(context, next.getLong("at")))
    }
  }

  @Synchronized fun replace(context: Context, serialized: String): Int {
    val moments = JSONArray(serialized)
    val local = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
    for (i in 0 until moments.length()) {
      val moment = moments.getJSONObject(i)
      require(moment.getLong("at") > 0 && moment.getString("id").isNotBlank())
      local.timeZone = TimeZone.getTimeZone(moment.getString("timezone"))
      moment.put("localAt", local.format(java.util.Date(moment.getLong("at"))))
    }
    val previous = JSONArray(prefs(context).getString("moments", "[]"))
    try {
      arm(context, moments)
      val saved = prefs(context)
      check(saved.edit().putString("moments", moments.toString()).putString("scheduleError", "")
        .putLong("scheduleVersion", saved.getLong("scheduleVersion", 0) + 1).commit())
    } catch (error: Exception) {
      runCatching { arm(context, previous) }
      throw error
    }
    return moments.length()
  }

  @Synchronized fun restore(context: Context, timezoneChanged: Boolean = false) {
    val moments = JSONArray(prefs(context).getString("moments", "[]"))
    if (timezoneChanged) {
      val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
      for (i in 0 until moments.length()) {
        val moment = moments.getJSONObject(i)
        format.timeZone = TimeZone.getTimeZone(moment.getString("timezone"))
        format.parse(moment.getString("localAt"))?.let { moment.put("at", it.time) }
      }
      prefs(context).edit().putString("moments", moments.toString()).commit()
    }
    arm(context, moments)
  }

  @Synchronized fun consume(context: Context, at: Long): JSONObject? {
    val saved = prefs(context)
    val moments = JSONArray(saved.getString("moments", "[]"))
    val now = System.currentTimeMillis()
    val matched = (0 until moments.length()).map { moments.getJSONObject(it) }
      .firstOrNull { it.getLong("at") == at }
    if (matched == null) return null // An obsolete broadcast must not change the new schedule.
    matched.put("deliveryVersion", saved.getLong("scheduleVersion", 0))
    val remaining = JSONArray()
    for (i in 0 until moments.length()) {
      val moment = moments.getJSONObject(i)
      if (moment.getLong("at") > now) remaining.put(moment)
    }
    val duplicate = saved.getLong("lastAt", 0) == at
    saved.edit().putString("moments", remaining.toString()).putLong("lastAt", at).commit()
    runCatching { arm(context, remaining) }.onFailure {
      saved.edit().putString("scheduleError", it.message).apply()
    }
    // A late delivery (Doze, an inexact alarm, a busy phone) still gets its notification, without the
    // adhan audio; older ones after a restart or clock change are dropped.
    if (duplicate || now - at !in 0..LATE_NOTICE_MS) return null
    matched.put("late", now - at > ON_TIME_MS)
    return matched
  }
}
