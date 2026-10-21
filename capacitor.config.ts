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
    // The background-geolocation plugin delivers fixes through the bridge while
    // the app is backgrounded. With the default (non-legacy) bridge those
    // callbacks stop after roughly five minutes in the background, so the rider
    // silently drops off the map. This is the plugin's documented Android fix.
    useLegacyBridge: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
