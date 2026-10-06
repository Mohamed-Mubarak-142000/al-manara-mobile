package com.almanara.background

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings

/**
 * Battery optimization and manufacturer "autostart" lists are what stop alarms once the app is
 * swiped away: the system force-stops the process and drops its alarms until it is opened again.
 */
internal object DeviceAccess {
  // Manufacturers whose default policy blocks background starts of swiped-away apps.
  private val restrictive = setOf("xiaomi", "redmi", "poco", "oppo", "realme", "oneplus", "vivo", "iqoo", "huawei", "honor", "samsung", "asus", "meizu", "tecno", "infinix", "itel")

  private val autostartScreens = listOf(
    "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
    "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
    "com.coloros.safecenter" to "com.coloros.safecenter.startupapp.StartupAppListActivity",
    "com.oplus.safecenter" to "com.oplus.safecenter.permission.startup.StartupAppListActivity",
    "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity",
    "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
    "com.iqoo.secure" to "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity",
    "com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
    "com.huawei.systemmanager" to "com.huawei.systemmanager.optimize.process.ProtectActivity",
    "com.hihonor.systemmanager" to "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
    "com.samsung.android.lool" to "com.samsung.android.sm.battery.ui.BatteryActivity",
    "com.asus.mobilemanager" to "com.asus.mobilemanager.autostart.AutoStartActivity",
    "com.meizu.safe" to "com.meizu.safe.permission.SmartBGActivity",
    "com.transsion.phonemanager" to "com.itel.autobootmanager.activity.AutoBootMgrActivity",
  )

  fun batteryOptimized(context: Context) =
    !context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName)

  fun autostartHint() = Build.MANUFACTURER.lowercase() in restrictive || Build.BRAND.lowercase() in restrictive

  /**
   * The system list where the user marks the app "not optimized". The direct per-app request
   * (REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) is restricted by Play policy, so it is not used.
   */
  fun openBatterySettings(context: Context) {
    if (!start(context, Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))) openAppDetails(context)
  }

  /** Opens the first manufacturer autostart screen that exists, else the app's own settings. */
  fun openAutostartSettings(context: Context): Boolean {
    for ((pkg, cls) in autostartScreens) {
      if (start(context, Intent().setComponent(ComponentName(pkg, cls)))) return true
    }
    openAppDetails(context)
    return false
  }

  private fun openAppDetails(context: Context) {
    start(context, Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))
  }

  private fun start(context: Context, intent: Intent) =
    runCatching { context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess
}
