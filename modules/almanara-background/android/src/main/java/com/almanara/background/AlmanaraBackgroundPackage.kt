package com.almanara.background

import android.app.Application
import android.content.Context
import expo.modules.core.interfaces.ApplicationLifecycleListener
import expo.modules.core.interfaces.Package

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
}
