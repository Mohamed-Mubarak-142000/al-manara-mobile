package com.almanara.background

import android.app.NotificationManager
import android.content.*
import android.media.AudioManager
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
        // The adhan plays at the prayer time itself (the chosen muezzin, or the bundled adhan), on time,
        // and only when the phone is on ring: on vibrate/silent/DND the notice itself makes the usual
        // sound or vibration instead of the app going quiet.
        val audio = context.getSystemService(AudioManager::class.java)
        val notifications = context.getSystemService(NotificationManager::class.java)
        val ringing = audio.ringerMode == AudioManager.RINGER_MODE_NORMAL &&
          notifications.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_ALL
        val full = moment.optBoolean("play") && !moment.optBoolean("late") && ringing
        // A default notification for reminders; silent prayer notice when the service plays audio.
        val notice = BackgroundState.notification(context, BackgroundState.PRAYER_CHANNEL, moment.getString("title"), moment.getString("body"), "prayer")
          .setAutoCancel(true).setSilent(full).build()
        runCatching { NotificationManagerCompat.from(context).notify(moment.getString("id").hashCode(), notice) }
          .onFailure { BackgroundState.prefs(context).edit().putString("scheduleError", "إشعارات الصلاة غير مسموح بها، فعّلها من الإعدادات").apply() }
        if (full) {
          runCatching {
            ContextCompat.startForegroundService(context, Intent(context, AdhanService::class.java)
              .putExtra("title", moment.getString("title")).putExtra("voiceKey", moment.optString("voiceKey").takeIf { !moment.isNull("voiceKey") && it.isNotEmpty() })
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
      if (OverlayStore.enabled(context) && Settings.canDrawOverlays(context)) {
        runCatching { ContextCompat.startForegroundService(context, Intent(context, DhikrService::class.java)) }
          .onFailure {
            OverlayStore.setError(context, "توقف الذكر فوق التطبيقات بعد إعادة تشغيل الهاتف. افتح التطبيق لتشغيله مرة أخرى.")
          }
      }
    }
  }
}
