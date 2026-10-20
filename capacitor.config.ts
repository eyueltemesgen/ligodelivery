import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android shell for the rider portal.
 *
 * `server.url` loads the deployed site rather than a bundled copy, so rider
 * portal changes ship with a normal web deploy and the APK only needs
 * rebuilding when native code, plugins or permissions change.
 */
const LIVE_URL = process.env["RIDER_APP_URL"] ?? "https://ligodelivery.vercel.app";

const config: CapacitorConfig = {
  appId: "com.yenego.rider",
  appName: "የኔ Go Rider",
  webDir: "public",
  server: {
    url: LIVE_URL,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
