package com.almanara.background

import android.app.*
import android.content.Intent
import android.net.Uri
import android.os.*
import androidx.core.app.NotificationCompat
import androidx.media3.common.*
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory

@UnstableApi
class AdhanService : Service() {
  private var player: ExoPlayer? = null
  private var wake: PowerManager.WakeLock? = null
  private val handler = Handler(Looper.getMainLooper())

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == "stop" || intent == null) {
      stopSelf()
      return START_NOT_STICKY
    }
    val stop = PendingIntent.getService(this, 7105, Intent(this, AdhanService::class.java).setAction("stop"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val title = intent.getStringExtra("title") ?: "حان وقت الصلاة"
    val notification = BackgroundState.notification(this, BackgroundState.AUDIO_CHANNEL, title, "الأذان جارٍ", "prayer")
      .setOngoing(true).setSilent(true)
      .addAction(NotificationCompat.Action.Builder(0, "إيقاف الأذان", stop).build()).build()
    // startForegroundService() must be answered with startForeground() even when we bail out,
    // or the system kills the process.
    startForeground(BackgroundState.AUDIO_NOTIFICATION, notification)
    // Receiver deduplicates alarms; ignore a repeated delivery to the running service too (after
    // startForeground, which every startForegroundService() must get).
    if (BackgroundState.adhanPlaying) return START_NOT_STICKY
    if (intent.getLongExtra("scheduleVersion", -1) != BackgroundState.prefs(this).getLong("scheduleVersion", 0)) {
      stopSelf()
      return START_NOT_STICKY
    }
    // The receiver already checked the ringer and Do Not Disturb. The muezzin the user downloaded, or
    // the adhan bundled with the app when none is (or its download is gone).
    val voice = intent.getStringExtra("voiceKey")?.let { VoiceCache.request(this, it) }
    val bundled = resources.getIdentifier("adhan_short", "raw", packageName)
    if (voice == null && bundled == 0) {
      stopSelf()
      return START_NOT_STICKY
    }
    try {
      BackgroundState.adhanPlaying = true
      sendBroadcast(Intent("${packageName}.ADHAN_STARTED").setPackage(packageName))
      wake = getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "almanara:adhan").apply { acquire(10 * 60_000L) }
      // No upstream: playback must succeed from the downloaded recording without the network.
      val sources = if (voice != null) {
        DefaultMediaSourceFactory(CacheDataSource.Factory().setCache(VoiceCache.cache(this)).setUpstreamDataSourceFactory(null))
      } else DefaultMediaSourceFactory(this)
      val item = voice?.toMediaItem() ?: MediaItem.fromUri(Uri.parse("android.resource://$packageName/$bundled"))
      player = ExoPlayer.Builder(this).setMediaSourceFactory(sources).build().apply {
        // The alarm stream: it follows the alarm volume (rarely muted), not the media volume.
        setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_ALARM).setContentType(C.AUDIO_CONTENT_TYPE_SONIFICATION).build(), true)
        addListener(object : Player.Listener {
          override fun onPlaybackStateChanged(state: Int) { if (state == Player.STATE_ENDED) stopSelf() }
          override fun onPlayerError(error: PlaybackException) {
            BackgroundState.prefs(this@AdhanService).edit().putString("scheduleError", "تعذّر تشغيل صوت الأذان المحفوظ، أعد تنزيله").apply()
            stopSelf()
          }
          override fun onPlayWhenReadyChanged(ready: Boolean, reason: Int) {
            if (!ready && reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_FOCUS_LOSS) stopSelf()
          }
        })
        setMediaItem(item); prepare(); play()
      }
      handler.postDelayed({ stopSelf() }, 10 * 60_000L)
    } catch (error: Exception) {
      BackgroundState.prefs(this).edit().putString("scheduleError", "تعذّر تشغيل الأذان: ${error.message}").apply()
      stopSelf()
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    player?.release(); player = null
    wake?.let { if (it.isHeld) it.release() }; wake = null
    if (BackgroundState.adhanPlaying) BackgroundState.adhanFinishedAt = System.currentTimeMillis()
    BackgroundState.adhanPlaying = false
    super.onDestroy()
  }
  override fun onBind(intent: Intent?) = null
}
