package com.almanara.background

import android.content.*
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

class PrayerReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val pending = goAsync()
    executor.execute {
      try {
        val moment = BackgroundState.consume(context, intent.getLongExtra("at", 0)) ?: return@execute
        if (BackgroundState.prefs(context).getLong("scheduleVersion", 0) != moment.getLong("deliveryVersion")) return@execute
        val full = moment.optBoolean("play") && !moment.isNull("voiceKey")
        // A default notification for reminders; silent prayer notice when the service plays audio.
        val notice = BackgroundState.notification(context, BackgroundState.PRAYER_CHANNEL, moment.getString("title"), moment.getString("body"), "prayer")
          .setAutoCancel(true).setSilent(full).build()
        runCatching { NotificationManagerCompat.from(context).notify(moment.getString("id").hashCode(), notice) }
        if (full) {
          runCatching {
            ContextCompat.startForegroundService(context, Intent(context, AdhanService::class.java)
              .putExtra("title", moment.getString("title")).putExtra("voiceKey", moment.getString("voiceKey"))
              .putExtra("scheduleVersion", moment.getLong("deliveryVersion")))
          }.onFailure {
            BackgroundState.prefs(context).edit().putString("scheduleError", "تعذّر بدء الأذان، راجع أذونات المنبهات").apply()
          }
        }
      } finally {
        // A prayer (or its reminder) just began: move the home-screen widget to the next one.
        PrayerWidget.refresh(context)
        pending.finish()
      }
    }
  }
  companion object { private val executor = Executors.newSingleThreadExecutor() }
}

class RestoreReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // Restore alarms only. Never launch a media foreground service from BOOT_COMPLETED.
    runCatching { BackgroundState.restore(context, intent.action == Intent.ACTION_TIMEZONE_CHANGED) }
      .onFailure { BackgroundState.prefs(context).edit().putString("scheduleError", "راجع إذن المنبهات والتذكيرات لتجديد مواقيت الصلاة").apply() }
    // The minute-dhikr overlay (specialUse, not media) may restart from boot/update without opening the app.
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      if (BackgroundState.prefs(context).getBoolean("overlayEnabled", false) && Settings.canDrawOverlays(context)) {
        runCatching { ContextCompat.startForegroundService(context, Intent(context, DhikrService::class.java)) }
          .onFailure {
            BackgroundState.prefs(context).edit()
              .putString("overlayError", "توقف ذكر كل دقيقة بعد إعادة تشغيل الهاتف. افتح التطبيق لتشغيله مرة أخرى.").apply()
          }
      }
    }
  }
}
