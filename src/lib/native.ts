/**
 * Native bridge for the Android rider app.
 *
 * The Capacitor plugins are dynamically imported so the browser build never
 * pulls them into the bundle — the web rider portal and the customer site both
 * load this module, and only the packaged app has a native runtime.
 *
 * Every helper degrades to a no-op or a `null` result when the native runtime
 * is absent, so callers can run the same code path in a browser and in the APK.
 */

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function capacitorGlobal(): CapacitorGlobal | undefined {
  return (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True only inside the packaged Android/iOS app, never in a browser tab. */
export function isNativeApp(): boolean {
  return capacitorGlobal()?.isNativePlatform?.() === true;
}

/** `"android"`, `"ios"` or `"web"`. */
export function nativePlatform(): string {
  return capacitorGlobal()?.getPlatform?.() ?? "web";
}

export type WatchedPosition = {
  lat: number;
  lng: number;
  speed: number | null;
  accuracy: number | null;
};

/**
 * Stream GPS while `onFix` is supplied.
 *
 * When packaged this runs through the background-geolocation plugin, which
 * starts an Android foreground service — that is what keeps fixes arriving
 * once the screen locks. The plugin needs a notification (see `options`) or the
 * OS suspends updates as soon as the app leaves the foreground. In a browser it
 * falls back to `watchPosition`, which is foreground-only.
 *
 * Returns a stop function; always call it on unmount.
 */
export function watchPosition(
  onFix: (fix: WatchedPosition) => void,
  onError?: (err: unknown) => void,
  options?: { notificationTitle?: string; notificationBody?: string },
): () => void {
  if (!isNativeApp()) {
    if (typeof navigator === "undefined" || !navigator.geolocation) return () => undefined;
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        onFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
        }),
      (err) => onError?.(err),
      { enableHighAccuracy: true, maximumAge: 4000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }

  let stopped = false;
  let stopNative: (() => void) | undefined;

  void import("@capgo/background-geolocation")
    .then(async ({ BackgroundGeolocation }) => {
      // The plugin's own auto-request asks only for foreground location and the
      // notification, and the plugin's start path does not request background
      // location at all. On Android 11+ that leaves tracking dead once the phone
      // is pocketed, so the two-step request is issued here before starting.
      await requestLocationPermission();
      await BackgroundGeolocation.start(
        {
          backgroundTitle: options?.notificationTitle ?? "የኔ Go Rider",
          backgroundMessage: options?.notificationBody ?? "You are online and receiving requests.",
          requestPermissions: true,
          stale: false,
          // 0 keeps reporting while the rider is stationary, so a parked rider
          // does not drop off the dispatch map.
          distanceFilter: 0,
          // Bounds the native request rate. Without this the plugin asks for a
          // fix every second, which the portal then throws away because it only
          // writes every 5 s. Matching the two avoids the wasted wake-ups.
          minIntervalMs: 5_000,
        },
        (position, error) => {
          if (error) {
            onError?.(error);
            return;
          }
          if (!position) return;
          onFix({
            lat: position.latitude,
            lng: position.longitude,
            speed: position.speed,
            accuracy: position.accuracy,
          });
        },
      );
      stopNative = () => {
        void BackgroundGeolocation.stop();
      };
      if (stopped) stopNative();
    })
    .catch((err) => onError?.(err));

  return () => {
    stopped = true;
    stopNative?.();
  };
}

/**
 * Ask for location permission up front. Resolves `true` when granted, and also
 * resolves `true` in a browser (where the permission prompt is deferred to the
 * first fix) so callers do not have to special-case the web.
 *
 * Background location is a deliberate two-step flow on Android 11+: asking for
 * it in the same request as foreground is refused outright. Foreground plus the
 * notification permission is what the foreground service needs; background
 * ("Allow all the time") is requested separately afterwards, and a refusal
 * leaves a working foreground-only app rather than failing.
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    const { BackgroundGeolocation } = await import("@capgo/background-geolocation");
    const first = await BackgroundGeolocation.requestPermissions({
      permissions: ["location", "notification"],
    });
    if (first.location !== "granted") return false;
    try {
      await BackgroundGeolocation.requestPermissions({ permissions: ["backgroundLocation"] });
    } catch {
      // Background is optional; tracking still works with the screen on.
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * True when the app appears to hold "Allow all the time" location access.
 *
 * Android 11+ (API 30) **ignores** a programmatic request for
 * `ACCESS_BACKGROUND_LOCATION` — the OS only shows it in Settings, and
 * requesting it can land the user on a screen that offers "While using" and
 * nothing more. So tracking that survives the phone being pocketed needs this
 * checked and the rider pointed at Settings, not just a permission call.
 *
 * Only a *known* negative state counts as missing: if the plugin cannot be
 * loaded or reports something unrecognised we report `true` and stay quiet,
 * because nagging a rider whose permission is actually fine is worse than a
 * missed prompt.
 */
export async function hasBackgroundLocationPermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    const { BackgroundGeolocation } = await import("@capgo/background-geolocation");
    const status = await BackgroundGeolocation.checkPermissions();
    const value = status.backgroundLocation;
    return !(value === "denied" || value === "prompt" || value === "when_in_use");
  } catch {
    return true;
  }
}

/** Send the rider to this app's system settings page (for "Allow all the time"). */
export async function openAppSettings(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { BackgroundGeolocation } = await import("@capgo/background-geolocation");
    await BackgroundGeolocation.openSettings();
  } catch {
    // Nothing useful to do if the settings intent cannot be launched.
  }
}

/**
 * Run an HTTP request through the native stack when packaged.
 *
 * Android throttles requests initiated by the WebView after roughly five
 * minutes in the background, which would silently freeze a rider's position
 * while the app still reports them online. Native HTTP is not throttled that
 * way, so position writes go through here. On the web it is plain `fetch`.
 */
export async function nativeRequest(
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
): Promise<{ ok: boolean; status: number }> {
  if (!isNativeApp()) {
    const res = await fetch(url, init);
    return { ok: res.ok, status: res.status };
  }
  const { CapacitorHttp } = await import("@capacitor/core");
  const res = await CapacitorHttp.request({
    url,
    method: init.method,
    headers: init.headers,
    data: init.body ? JSON.parse(init.body) : undefined,
  });
  return { ok: res.status >= 200 && res.status < 300, status: res.status };
}

/**
 * Register for push and hand the device token to `onToken`.
 *
 * Requires a real FCM project (`google-services.json`) in the native build; on a
 * build without one the registration call rejects, which is reported through
 * `onError` rather than thrown.
 */
export async function registerPush(
  onToken: (token: string) => void,
  onError?: (err: unknown) => void,
): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") {
      onError?.(new Error("push permission denied"));
      return () => undefined;
    }
    const handles: { remove: () => Promise<void> }[] = [];
    handles.push(
      await PushNotifications.addListener("registration", (t) => onToken(t.value)),
      await PushNotifications.addListener("registrationError", (e) => onError?.(e)),
    );
    await PushNotifications.register();
    return () => {
      for (const h of handles) void h.remove();
    };
  } catch (err) {
    onError?.(err);
    return () => undefined;
  }
}

export type CapturedPhoto = { dataUrl: string; mimeType: string };

/**
 * Take a photo for delivery proof. Falls back to a file input in the browser so
 * the same UI works on the web.
 */
export async function takePhoto(): Promise<CapturedPhoto | null> {
  if (!isNativeApp()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      quality: 70,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      allowEditing: false,
    });
    if (!photo.dataUrl) return null;
    return { dataUrl: photo.dataUrl, mimeType: `image/${photo.format || "jpeg"}` };
  } catch {
    return null;
  }
}

/** Convert a captured data URL into a File so existing upload helpers accept it. */
export function dataUrlToFile(photo: CapturedPhoto, name = "proof.jpg"): File {
  const comma = photo.dataUrl.indexOf(",");
  const meta = comma === -1 ? "" : photo.dataUrl.slice(0, comma);
  const b64 = comma === -1 ? "" : photo.dataUrl.slice(comma + 1);
  const mime = /:(.*?);/.exec(meta)?.[1] ?? photo.mimeType;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

/**
 * Native token storage for the Supabase session.
 *
 * `localStorage` is cleared when Android reclaims a backgrounded webview, which
 * would sign the rider out mid-shift, so the session is mirrored into
 * Preferences (SharedPreferences on Android) and restored on boot.
 */
export const nativeStorage = {
  async get(key: string): Promise<string | null> {
    if (!isNativeApp()) return null;
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key });
      return value ?? null;
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (!isNativeApp()) return;
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key, value });
    } catch {
      /* non-fatal: the webview still has localStorage */
    }
  },
  async remove(key: string): Promise<void> {
    if (!isNativeApp()) return;
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.remove({ key });
    } catch {
      /* non-fatal */
    }
  },
};
