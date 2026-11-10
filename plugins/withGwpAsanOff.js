const { withAndroidManifest, AndroidConfig } = require("expo/config-plugins");

/*
 * Turns GWP-ASan off for the app (android:gwpAsanMode="never").
 *
 * Android samples a few heap frees with GWP-ASan and records a backtrace for each by walking frame
 * pointers. Hermes runs JS on its own fiber stacks (boost.context make_fcontext), and the walk runs
 * past the bottom frame of one into a guard page: a SIGSEGV in android_unsafe_frame_pointer_chase,
 * usually seconds after launch. Rare per launch, but fatal, and not a memory bug in the app.
 * Upstream: facebook/hermes#1873, fixed by facebook/hermes#1874, not in the Hermes React Native
 * 0.86 pins. Drop this plugin once the app ships a Hermes build with that fix.
 */
module.exports = function withGwpAsanOff(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$["android:gwpAsanMode"] = "never";
    return cfg;
  });
};
