// Lightweight Web Audio sound triggers — no asset files needed.
// Each cue is synthesized with the AudioContext API so nothing has to be
// downloaded, and playback is gated by the user's audio_settings preference.

type CueName = "new_order" | "payment" | "status_update";

const CUES: Record<CueName, { freq: number[]; dur: number; type: OscillatorType }> = {
  new_order: { freq: [660, 880, 1320], dur: 0.12, type: "sine" },
  payment: { freq: [523, 784], dur: 0.14, type: "triangle" },
  status_update: { freq: [440, 660], dur: 0.1, type: "sine" },
};

let ctx: AudioContext | null = null;
let settings: { enabled: boolean; new_order: boolean; payment: boolean; status_update: boolean } = {
  enabled: true,
  new_order: true,
  payment: true,
  status_update: true,
};

export function setAudioSettings(next: Partial<typeof settings>) {
  settings = { ...settings, ...next };
}

export function primeAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function playCue(name: CueName) {
  if (!settings.enabled || !settings[name]) return;
  if (!ctx) {
    primeAudio();
    if (!ctx) return;
  }
  const cue = CUES[name];
  const now = ctx!.currentTime;
  cue.freq.forEach((f, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = cue.type;
    osc.frequency.value = f;
    const start = now + i * (cue.dur + 0.02);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + cue.dur);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + cue.dur + 0.02);
  });
}

export const sounds = {
  newOrder: () => playCue("new_order"),
  payment: () => playCue("payment"),
  statusUpdate: () => playCue("status_update"),
};

export const playPing = () => playCue("new_order");

export async function loadAudioSettings() {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "audio_settings")
      .maybeSingle();
    if (data?.value) setAudioSettings(data.value as Partial<typeof settings>);
  } catch {
    /* ignore — keep defaults */
  }
}
