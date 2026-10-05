const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

module.exports = function withAlmanaraBackground(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = [
      "SYSTEM_ALERT_WINDOW",
      "SCHEDULE_EXACT_ALARM",
      "RECEIVE_BOOT_COMPLETED",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_SPECIAL_USE",
      "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      "POST_NOTIFICATIONS",
      "WAKE_LOCK",
    ];
    manifest["uses-permission"] ??= [];
    for (const name of permissions) {
      const full = `android.permission.${name}`;
      if (!manifest["uses-permission"].some((item) => item.$["android:name"] === full)) {
        manifest["uses-permission"].push({ $: { "android:name": full } });
      }
    }
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.service ??= [];
    app.receiver ??= [];
    const put = (list, node) => {
      const index = list.findIndex((item) => item.$["android:name"] === node.$["android:name"]);
      if (index < 0) list.push(node);
      else list[index] = node;
    };
    put(app.service, {
      $: {
        "android:name": "com.almanara.background.DhikrService",
        "android:exported": "false",
        "android:stopWithTask": "false",
        "android:foregroundServiceType": "specialUse",
      },
      property: [
        {
          $: {
            "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
            "android:value":
              "User-enabled short Arabic dhikr overlay once per minute while screen is unlocked; persistent notification provides stop control.",
          },
        },
      ],
    });
    put(app.service, {
      $: {
        "android:name": "com.almanara.background.AdhanService",
        "android:exported": "false",
        "android:foregroundServiceType": "mediaPlayback",
      },
    });
    put(app.receiver, {
      $: { "android:name": "com.almanara.background.PrayerReceiver", "android:exported": "false" },
    });
    put(app.receiver, {
      $: { "android:name": "com.almanara.background.RestoreReceiver", "android:exported": "false" },
      "intent-filter": [
        {
          action: [
            "android.intent.action.BOOT_COMPLETED",
            "android.intent.action.MY_PACKAGE_REPLACED",
            "android.intent.action.TIME_SET",
            "android.intent.action.TIMEZONE_CHANGED",
            "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED",
          ].map((name) => ({ $: { "android:name": name } })),
        },
      ],
    });
    return mod;
  });
};
