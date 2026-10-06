package com.almanara.background

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * On-device crash diagnostics for builds without a crash-reporting service:
 * - native (JVM) uncaught exceptions, written synchronously before the previous handler kills the process;
 * - Android's own record of why past processes ended (Android 11+), which tells a crash from the OS
 *   reclaiming memory or killing the app after a permission change in Settings.
 * Read by the About screen through AlmanaraBackgroundModule.getCrashReports().
 */
object CrashRecorder {
  private const val PREFS = "almanara_crashes"
  private const val MAX = 5
  @Volatile private var installed = false

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun install(context: Context) {
    if (installed) return
    synchronized(this) {
      if (installed) return
      installed = true
      val app = context.applicationContext ?: context
      val previous = Thread.getDefaultUncaughtExceptionHandler()
      Thread.setDefaultUncaughtExceptionHandler { thread, error ->
        try {
          record(app, thread, error)
        } catch (_: Throwable) {
          // Never get in the way of the real handler.
        }
        if (previous != null) {
          previous.uncaughtException(thread, error)
        } else {
          android.os.Process.killProcess(android.os.Process.myPid())
          kotlin.system.exitProcess(10)
        }
      }
    }
  }

  private fun record(context: Context, thread: Thread, error: Throwable) {
    val saved = prefs(context)
    val list = try { JSONArray(saved.getString("native", "[]")) } catch (_: Exception) { JSONArray() }
    val entry = JSONObject()
      .put("at", System.currentTimeMillis())
      .put("thread", thread.name)
      .put("message", "${error.javaClass.name}: ${error.message ?: ""}".take(500))
      .put("stack", Log.getStackTraceString(error).take(6000))
    val next = JSONArray().put(entry)
    for (i in 0 until minOf(list.length(), MAX - 1)) next.put(list.get(i))
    saved.edit().putString("native", next.toString()).commit()
  }

  fun report(context: Context): String {
    val saved = prefs(context)
    val native = try { JSONArray(saved.getString("native", "[]")) } catch (_: Exception) { JSONArray() }
    return JSONObject()
      .put("native", native)
      .put("exits", exitReasons(context, saved.getLong("exitsClearedAt", 0L)))
      .toString()
  }

  fun clear(context: Context) {
    // The system's exit history can't be cleared; hide what is older than now instead.
    prefs(context).edit().remove("native").putLong("exitsClearedAt", System.currentTimeMillis()).commit()
  }

  private fun exitReasons(context: Context, after: Long): JSONArray {
    val out = JSONArray()
    if (Build.VERSION.SDK_INT < 30) return out
    try {
      val manager = context.getSystemService(ActivityManager::class.java) ?: return out
      for (info in manager.getHistoricalProcessExitReasons(context.packageName, 0, MAX)) {
        if (info.timestamp <= after) continue
        out.put(
          JSONObject()
            .put("at", info.timestamp)
            .put("reason", reasonName(info.reason))
            .put("description", info.description ?: "")
            .put("importance", info.importance)
            .put("status", info.status)
            .put("pssKb", info.pss)
            .put("rssKb", info.rss)
            .put("process", info.processName ?: ""),
        )
      }
    } catch (_: Throwable) {
      // Diagnostics only.
    }
    return out
  }

  // ApplicationExitInfo.REASON_* values, by number so newer ones compile against any SDK.
  private fun reasonName(reason: Int): String = when (reason) {
    1 -> "EXIT_SELF"
    2 -> "SIGNALED"
    3 -> "LOW_MEMORY"
    4 -> "CRASH"
    5 -> "CRASH_NATIVE"
    6 -> "ANR"
    7 -> "INITIALIZATION_FAILURE"
    8 -> "PERMISSION_CHANGE"
    9 -> "EXCESSIVE_RESOURCE_USAGE"
    10 -> "USER_REQUESTED"
    11 -> "USER_STOPPED"
    12 -> "DEPENDENCY_DIED"
    13 -> "OTHER"
    14 -> "FREEZER"
    15 -> "PACKAGE_STATE_CHANGE"
    16 -> "PACKAGE_UPDATED"
    else -> "UNKNOWN($reason)"
  }
}
