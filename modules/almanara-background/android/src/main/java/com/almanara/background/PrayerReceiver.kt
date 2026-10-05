package com.almanara.background

import android.content.*
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
      } finally { pending.finish() }
    }
  }
  companion object { private val executor = Executors.newSingleThreadExecutor() }
}

class RestoreReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // Restore alarms only. Never launch a media foreground service from BOOT_COMPLETED.
    runCatching { BackgroundState.restore(context, intent.action == Intent.ACTION_TIMEZONE_CHANGED) }
      .onFailure { BackgroundState.prefs(context).edit().putString("scheduleError", "راجع إذن المنبهات والتذكيرات لتجديد مواقيت الصلاة").apply() }
  }
}
