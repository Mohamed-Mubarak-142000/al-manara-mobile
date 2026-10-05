package com.almanara.background

import android.app.*
import android.content.*
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.*
import android.provider.Settings
import android.view.*
import android.widget.*
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.util.Calendar

class DhikrService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var card: View? = null
  private val windows get() = getSystemService(WindowManager::class.java)
  private val power get() = getSystemService(PowerManager::class.java)
  private val keyguard get() = getSystemService(KeyguardManager::class.java)
  private val screenEvents = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      hide()
      handler.removeCallbacks(tick)
      if (intent.action != Intent.ACTION_SCREEN_OFF) {
        handler.postDelayed(tick, 60_000)
      }
    }
  }
  private val tick = object : Runnable {
    override fun run() {
      if (!Settings.canDrawOverlays(this@DhikrService)) {
        BackgroundState.prefs(this@DhikrService).edit().putBoolean("overlayEnabled", false).apply()
        stopSelf()
        return
      }
      val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
      if (power.isInteractive && !keyguard.isKeyguardLocked && hour in 7..21 &&
          !BackgroundState.adhanPlaying && System.currentTimeMillis() - BackgroundState.adhanFinishedAt >= 60_000) {
        runCatching { show() }.onFailure {
          BackgroundState.prefs(this@DhikrService).edit().putBoolean("overlayEnabled", false).apply()
          stopSelf()
        }
      }
      handler.postDelayed(this, 60_000)
    }
  }

  override fun onCreate() {
    super.onCreate()
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_SCREEN_ON); addAction(Intent.ACTION_USER_PRESENT)
      addAction("${packageName}.ADHAN_STARTED")
    }
    if (Build.VERSION.SDK_INT >= 33) registerReceiver(screenEvents, filter, Context.RECEIVER_NOT_EXPORTED)
    else @Suppress("DEPRECATION") registerReceiver(screenEvents, filter)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == "stop") {
      BackgroundState.prefs(this).edit().putBoolean("overlayEnabled", false).commit()
      stopSelf()
      return START_NOT_STICKY
    }
    if (!Settings.canDrawOverlays(this) || !BackgroundState.prefs(this).getBoolean("overlayEnabled", false)) {
      stopSelf()
      return START_NOT_STICKY
    }
    val stop = PendingIntent.getService(this, 7104, Intent(this, DhikrService::class.java).setAction("stop"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val notification = BackgroundState.notification(this, BackgroundState.DHIKR_CHANNEL, "ذكر كل دقيقة", "تذكير قصير من ٧ صباحًا إلى ١٠ مساءً أثناء فتح الشاشة", "adhkar")
      .setOngoing(true).setSilent(true)
      .addAction(NotificationCompat.Action.Builder(0, "إيقاف تذكير الأذكار", stop).build()).build()
    startForeground(BackgroundState.DHIKR_NOTIFICATION, notification)
    BackgroundState.overlayRunning = true
    handler.removeCallbacks(tick)
    handler.postDelayed(tick, 60_000)
    return START_STICKY
  }

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

  private fun show() {
    hide()
    val saved = BackgroundState.prefs(this)
    val config = JSONObject(saved.getString("overlayConfig", "{}")!!)
    val entries = config.getJSONArray("entries")
    if (entries.length() == 0) return
    val index = (saved.getInt("index", -1) + 1) % entries.length()
    val entry = entries.getJSONObject(index)
    saved.edit().putInt("index", index).apply()
    val colors = config.getJSONObject("colors")
    val fg = colors.getInt("fg")
    val panel = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      layoutDirection = View.LAYOUT_DIRECTION_RTL
      setPadding(dp(18), dp(12), dp(18), dp(12))
      elevation = dp(8).toFloat()
      background = GradientDrawable().apply {
        setColor(colors.getInt("surface"))
        cornerRadius = dp(20).toFloat()
        setStroke(dp(1), colors.getInt("border"))
      }
      contentDescription = "${entry.getString("text")}، اضغط للإغلاق"
      setOnClickListener { hide() }
    }
    fun text(value: String, size: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
      text = value; textSize = size; setTextColor(color)
      textDirection = View.TEXT_DIRECTION_RTL
      gravity = Gravity.RIGHT
      typeface = Typeface.create("sans-serif", if (bold) Typeface.BOLD else Typeface.NORMAL)
    }
    panel.addView(text("ذكّر قلبك", 12f, colors.getInt("primary"), true))
    panel.addView(text(entry.getString("text"), 18f, fg))
    panel.addView(text(entry.getString("source"), 11f, colors.getInt("muted")))
    val params = WindowManager.LayoutParams(
      resources.displayMetrics.widthPixels - dp(24), WindowManager.LayoutParams.WRAP_CONTENT,
      if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      android.graphics.PixelFormat.TRANSLUCENT,
    ).apply { gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL; y = dp(48) }
    windows.addView(panel, params)
    card = panel
    handler.postDelayed({ hide() }, 5_000)
  }

  private fun hide() {
    card?.let { runCatching { windows.removeView(it) } }
    card = null
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    hide()
    unregisterReceiver(screenEvents)
    BackgroundState.overlayRunning = false
    super.onDestroy()
  }
  override fun onBind(intent: Intent?) = null
}
