package com.almanara.background

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues
import org.json.JSONArray

class AlmanaraBackgroundModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("AlmanaraBackground")
    Function("getStatus") {
      val saved = BackgroundState.prefs(context)
      val moments = JSONArray(saved.getString("moments", "[]"))
      mapOf(
        "overlayAllowed" to Settings.canDrawOverlays(context),
        "overlayEnabled" to saved.getBoolean("overlayEnabled", false),
        "overlayRunning" to BackgroundState.overlayRunning,
        "overlayError" to saved.getString("overlayError", ""),
        "exactAllowed" to BackgroundState.exactAllowed(context),
        "batteryOptimized" to DeviceAccess.batteryOptimized(context),
        "autostartHint" to DeviceAccess.autostartHint(),
        "scheduleThrough" to (0 until moments.length()).maxOfOrNull { moments.getJSONObject(it).getLong("at") }.let { it ?: 0L },
        "error" to saved.getString("scheduleError", ""),
      )
    }
    AsyncFunction("openOverlaySettings") {
      context.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("openAlarmSettings") {
      if (android.os.Build.VERSION.SDK_INT >= 31) {
        context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("openBatterySettings") { DeviceAccess.openBatterySettings(context) }.runOnQueue(Queues.MAIN)
    AsyncFunction("openAutostartSettings") { DeviceAccess.openAutostartSettings(context) }.runOnQueue(Queues.MAIN)
    AsyncFunction("setOverlay") { enabled: Boolean, config: String ->
      val saved = BackgroundState.prefs(context)
      if (enabled) {
        check(Settings.canDrawOverlays(context)) { "اسمح بالظهور فوق التطبيقات أولًا" }
        org.json.JSONObject(config) // Validate before changing the active configuration.
        saved.edit().putString("overlayConfig", config).apply()
        saved.edit().putBoolean("overlayEnabled", true).putString("overlayError", "").commit()
        try {
          ContextCompat.startForegroundService(context, Intent(context, DhikrService::class.java))
        } catch (error: Exception) {
          saved.edit().putBoolean("overlayEnabled", false)
            .putString("overlayError", "تعذّر تشغيل التذكير في الخلفية. راجع أذونات الإشعارات والظهور فوق التطبيقات ثم فعّله مرة أخرى.").commit()
          throw error
        }
      } else {
        saved.edit().putBoolean("overlayEnabled", false).putString("overlayError", "").commit()
        context.stopService(Intent(context, DhikrService::class.java))
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("updateOverlay") { config: String ->
      org.json.JSONObject(config)
      BackgroundState.prefs(context).edit().putString("overlayConfig", config).apply()
    }
    AsyncFunction("downloadVoice") { id: String, url: String -> VoiceCache.download(context, id, url) }
    AsyncFunction("replaceSchedule") { moments: String -> BackgroundState.replace(context, moments) }
    AsyncFunction("stopAdhan") { context.stopService(Intent(context, AdhanService::class.java)) }.runOnQueue(Queues.MAIN)
  }
}
