/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "AlManaraWidgets",
  displayName: "المنارة",
  icon: "../../assets/images/brand/icon.png",
  colors: {
    $accent: "#cda23e",
    $widgetBackground: "#012a22",
  },
  entitlements: {
    "com.apple.security.application-groups": config.ios.entitlements["com.apple.security.application-groups"],
  },
});
