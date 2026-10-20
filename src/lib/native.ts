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
 * Stream GPS while `onFix` is supplied. Uses the native plugin when packaged
 * (which keeps reporting while the app is backgrounded) and falls back to the
 * browser `watchPosition` otherwise.
 *
 * Returns a stop function; always call it on unmount.
 */
export function watchPosition(
  onFix: (fix: WatchedPosition) => void,
  onError?: (err: unknown) => void,
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
  let remove: (() => void) | undefined;

  void import("@capacitor/geolocation")
    .then(async ({ Geolocation }) => {
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 },
        (pos, err) => {
          if (err) {
            onError?.(err);
            return;
          }
          if (!pos) return;
          onFix({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed,
            accuracy: pos.coords.accuracy,
          });
        },
      );
      remove = () => {
        void Geolocation.clearWatch({ id });
      };
      if (stopped) remove();
    })
    .catch((err) => onError?.(err));

  return () => {
    stopped = true;
    remove?.();
  };
}

/**
 * Ask for location permission up front. Resolves `true` when granted, and also
 * resolves `true` in a browser (where the permission prompt is deferred to the
 * first fix) so callers do not have to special-case the web.
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.requestPermissions();
    return status.location === "granted" || status.coarseLocation === "granted";
  } catch {
    return false;
  }
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
