# Al-Manara background reminders

Local Expo module for SDK 57 / Android. Autolinking discovers it under `modules/`.
`plugins/withAlmanaraBackground.js` adds manifest entries during CNG. Rebuild the app;
Expo Go and an OTA-only update cannot provide these native services.

## Delivery

- `DhikrService`: opt-in foreground service, one card per minute for five seconds,
  07:00–22:00 device time. Screen-off cancels ticks; unlock starts a fresh minute.
  Uses a non-focusable overlay, semantic theme colors, sequential sourced adhkar,
  and a notification stop action. Android's native preference is authoritative.
- `AdhanService`: cached Media3 playback with audio focus, stop action, a bounded
  wake lock and a ten-minute safety timeout. Silent mode and Do Not Disturb are
  respected. Notification taps open the prayer screen and never start audio.
- `VoiceCache`: complete progressive/HLS downloads in app-private persistent
  storage. Only completed downloads are selectable. Playback has no network source.
- `BackgroundState`: saves the whole current/next-month schedule but arms only
  the next alarm. A receiver consumes it, persists the remaining schedule and
  arms the following alarm. Stale deliveries are ignored. Boot/time/permission
  receivers restore alarms without starting a media service at boot. Boot and
  app update also restart `DhikrService` when it was enabled.

Exact alarm access is required. The system may show the next prayer/reminder as an
upcoming alarm. Overlay service uses `specialUse`, with its purpose declared in
the manifest; this foreground service type must also be declared for a Play release.
Force-stop, revoked permissions and manufacturer process restrictions can stop
delivery. Reopen the app to recover. `DeviceAccess` reports battery optimization
(opens the system list; the restricted direct request is not used) and the manufacturer autostart screen
(Xiaomi, Oppo/Realme/OnePlus, Vivo, Huawei/Honor, Samsung…); without both, swiping
the app away on those phones drops its alarms. No background network refresh is promised:
the prayer settings show when the saved schedule expires.

iOS uses at most 40 pending prayer notices, 15 optional hourly text notices and
two independent morning/evening reminders. Its 28-second bundled notification
excerpt is shared across voices. It does not provide cross-app overlays or exact
minute-by-minute background notifications.

## Device acceptance checks

1. Install the preview APK, allow notifications and enable the overlay from
   الأذكار. Grant overlay access and return. In another app, verify one card after
   a minute; it disappears after five seconds, and tapping dismisses it.
2. Lock the screen for several minutes, then unlock: no backlog; first card after
   a fresh minute. Check no delivery outside 07:00–22:00 and correct light/dark colors.
3. Stop from the persistent notification; return to the app and verify its switch
   stays off. Deny/revoke overlay access and verify no crash or repeated permission prompt.
4. Select/download a voice, allow exact alarms and enable prayer notifications.
   Leave the app, disable networking and lock the screen before a real prayer.
   Verify one full playback, notification stop, audio-focus interruption and no replay
   when opening an old notification. Repeat after reboot and swiping away the app.
5. During adhan, the dhikr card disappears and resumes at least a minute after
   playback finishes. Disabling every prayer cancels alarms and current playback.
6. Refuse/revoke exact access; verify the settings explain how to recover. Fail
   calendar fetching or voice download: existing alarms/voice stay available.
7. On iOS, check the short notification sound, text notices, selected-dhikr link,
   morning/evening independence and that the pending count remains below 64.

Automated verification: `npx expo lint`, `npx tsc --noEmit`, `npx jest --runInBand`,
`npx expo config --type introspect`, and native EAS APK compilation. Device behavior
still needs the physical-device checks above.
