package com.almanara.background

import android.content.Context
import org.json.JSONObject
import java.io.File

/**
 * The dhikr overlay's switch, error and card config, shared by the app process and DhikrService, which
 * runs in its own small ":dhikr" process so the whole app (React Native, the mushaf data) can be freed
 * while the reminder keeps running. SharedPreferences caches per process, so a change made in one would
 * never reach the other: this small file is read fresh on every access instead. Writes go through a
 * temp file and a rename, so a reader never sees half a file.
 */
internal object OverlayStore {
  private fun file(context: Context) = File(context.noBackupFilesDir, "almanara-overlay-v1.json")

  @Synchronized fun read(context: Context): JSONObject {
    val target = file(context)
    if (!target.exists()) return migrate(context)
    return runCatching { JSONObject(target.readText()) }.getOrElse { JSONObject() }
  }

  @Synchronized fun edit(context: Context, change: JSONObject.() -> Unit) {
    val state = read(context).apply(change)
    val target = file(context)
    val temp = File(target.parentFile, "${target.name}.tmp")
    temp.writeText(state.toString())
    if (!temp.renameTo(target)) {
      target.writeText(state.toString())
      temp.delete()
    }
  }

  fun enabled(context: Context) = read(context).optBoolean("enabled", false)
  fun error(context: Context): String = read(context).optString("error", "")
  fun config(context: Context): String = read(context).optString("config", "{}")

  fun setEnabled(context: Context, enabled: Boolean, error: String = "") = edit(context) {
    put("enabled", enabled)
    put("error", error)
  }

  fun setError(context: Context, error: String) = edit(context) { put("error", error) }

  fun setConfig(context: Context, config: String) = edit(context) { put("config", config) }

  /** Builds before the separate process kept these in SharedPreferences. */
  private fun migrate(context: Context): JSONObject {
    val saved = BackgroundState.prefs(context)
    val state = JSONObject()
      .put("enabled", saved.getBoolean("overlayEnabled", false))
      .put("error", saved.getString("overlayError", "") ?: "")
      .put("config", saved.getString("overlayConfig", "{}") ?: "{}")
    runCatching { file(context).writeText(state.toString()) }
    return state
  }
}
