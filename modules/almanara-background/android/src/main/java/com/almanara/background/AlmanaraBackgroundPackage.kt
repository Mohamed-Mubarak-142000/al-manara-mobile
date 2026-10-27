package com.almanara.background

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.Intent
import android.os.Bundle
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/**
 * Found by Expo autolinking (a *Package.kt that implements expo.modules.core.interfaces.Package).
 * Installs the native crash recorder in Application.onCreate, before any screen or JS runs.
 */
class AlmanaraBackgroundPackage : Package {
  override fun createApplicationLifecycleListeners(context: Context?): List<ApplicationLifecycleListener> =
    listOf(object : ApplicationLifecycleListener {
      override fun onCreate(application: Application?) {
        if (application != null) CrashRecorder.install(application)
      }
    })

  /**
   * The adhan notice's full-screen intent opens the app on almanara://adhan-now: show it over the lock
   * screen at once, before the JS has started (a cold start takes a few seconds). The screen turns it
   * off again when it closes (setShowOverLock).
   */
  override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> {
    val activity = activityContext as? Activity ?: return emptyList()
    return listOf(object : ReactActivityLifecycleListener {
      override fun onCreate(activity: Activity, savedInstanceState: Bundle?) {
        if (AdhanScreen.isAdhanLink(activity.intent)) AdhanScreen.showOverLock(activity, true)
      }
      override fun onNewIntent(intent: Intent): Boolean {
        if (AdhanScreen.isAdhanLink(intent)) AdhanScreen.showOverLock(activity, true)
        return false
      }
    })
  }
}
