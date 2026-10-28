package com.almanara.background

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.WindowManager

/**
 * The full-screen adhan screen (the app's /adhan-now route) over the lock screen, like an alarm: the
 * prayer notice carries a full-screen intent to almanara://adhan-now, and the activity it opens is
 * shown over the keyguard and turns the screen on — only while that screen is up, never for the rest
 * of the app.
 */
internal object AdhanScreen {
  const val HOST = "adhan-now"
  private const val NOTICE_KEY = "adhanNoticeId"

  fun isAdhanLink(intent: Intent?): Boolean = intent?.data?.let { it.scheme == "almanara" && it.host == HOST } == true

  /** On or off: shown over the lock screen and waking the screen. */
  fun showOverLock(activity: Activity, on: Boolean) {
    if (Build.VERSION.SDK_INT >= 27) {
      activity.setShowWhenLocked(on)
      activity.setTurnScreenOn(on)
    } else {
      @Suppress("DEPRECATION")
      val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      if (on) activity.window.addFlags(flags) else activity.window.clearFlags(flags)
    }
  }

  /** Whether the phone is locked now (the screen then shows over the lock screen, no unlock needed). */
  fun locked(context: Context): Boolean = context.getSystemService(KeyguardManager::class.java)?.isKeyguardLocked == true

  /**
   * The full-screen intent only opens the screen when the phone is off or locked; while someone is
   * using it Android shows a heads-up instead. Then open it directly: allowed while the app is on
   * screen, or with the "display over other apps" permission the minute dhikr uses (Android 15 also
   * wants that overlay showing); otherwise Android drops the launch and the heads-up stays.
   */
  fun openIfInUse(context: Context, path: String) {
    val interactive = context.getSystemService(PowerManager::class.java)?.isInteractive == true
    if (!interactive || locked(context)) return
    runCatching {
      context.startActivity(
        Intent(Intent.ACTION_VIEW, Uri.parse("almanara://$path")).setPackage(context.packageName)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
      )
    }
  }

  /** Android 14+ lets the user switch full-screen notifications off per app; earlier versions always allow them. */
  fun fullScreenAllowed(context: Context): Boolean =
    Build.VERSION.SDK_INT < 34 || context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()

  fun openFullScreenSettings(context: Context) {
    val intent = if (Build.VERSION.SDK_INT >= 34) {
      Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}"))
    } else {
      Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    }
    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  /** The prayer notice just posted, so the screen's «إيقاف» / «إغلاق» can take it away too. */
  fun rememberNotice(context: Context, id: Int) {
    BackgroundState.prefs(context).edit().putInt(NOTICE_KEY, id).apply()
  }

  fun dismissNotice(context: Context) {
    val prefs = BackgroundState.prefs(context)
    if (!prefs.contains(NOTICE_KEY)) return
    context.getSystemService(NotificationManager::class.java).cancel(prefs.getInt(NOTICE_KEY, 0))
    prefs.edit().remove(NOTICE_KEY).apply()
  }
}
