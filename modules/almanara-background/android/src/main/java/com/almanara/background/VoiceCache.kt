package com.almanara.background

import android.content.Context
import android.net.Uri
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.*
import androidx.media3.exoplayer.offline.*
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.Executors

@UnstableApi
internal object VoiceCache {
  private var instance: SimpleCache? = null
  private val executor = Executors.newFixedThreadPool(2)
  private val downloadLock = Any()
  @Synchronized fun cache(context: Context): SimpleCache {
    return instance ?: SimpleCache(File(context.filesDir, "adhan-audio"), NoOpCacheEvictor(), StandaloneDatabaseProvider(context)).also { instance = it }
  }

  // Downloaders cache the complete HLS playlist and segments, not just the playlist URL.
  fun download(context: Context, id: String, url: String): String = synchronized(downloadLock) {
    require(Uri.parse(url).scheme == "https") { "رابط الصوت غير صالح" }
    val digest = MessageDigest.getInstance("SHA-256").digest("$id|$url".toByteArray()).joinToString("") { "%02x".format(it) }
    val mime = if (url.substringBefore('?').endsWith(".m3u8", true)) MimeTypes.APPLICATION_M3U8 else null
    val request = DownloadRequest.Builder(digest, Uri.parse(url)).setMimeType(mime).build()
    val factory = CacheDataSource.Factory().setCache(cache(context))
      .setUpstreamDataSourceFactory(DefaultHttpDataSource.Factory().setConnectTimeoutMs(20_000).setReadTimeoutMs(30_000))
    val downloader = DefaultDownloaderFactory(factory, executor).createDownloader(request)
    try {
      downloader.download(null)
      val value = JSONObject().put("uri", url).put("mime", mime).put("key", digest)
      check(BackgroundState.prefs(context).edit().putString("voice:$digest", value.toString()).commit())
      digest
    } catch (error: Exception) {
      // Leave the previous committed recording and schedule untouched.
      // Cache spans may be shared with the previously selected recording; never remove them here.
      throw error
    }
  }

  fun request(context: Context, key: String): DownloadRequest? {
    val serialized = BackgroundState.prefs(context).getString("voice:$key", null) ?: return null
    val value = JSONObject(serialized)
    return DownloadRequest.Builder(key, Uri.parse(value.getString("uri")))
      .setMimeType(if (value.isNull("mime")) null else value.getString("mime")).build()
  }
}
