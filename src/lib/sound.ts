// Web Audio API sound engine — synthesises short UI tones with no audio files.
// A single shared AudioContext is created lazily and must be "unlocked" by a
// user gesture before browsers will allow playback.

export type SoundEvent = "payment" | "new_order" | "status_update" | "rider" | "generic";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

// Resume the context in response to a user gesture (autoplay policies).
export async function unlockAudio(): Promise<void> {
  const c = getContext();
  if (c && c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      /* ignored */
    }
  }
}

type Note = { freq: number; start: number; duration: number; type?: OscillatorType; gain?: number };

function playSequence(notes: Note[]) {
  const c = getContext();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const now = c.currentTime;

  for (const note of notes) {
    const osc = c.createOscillator();
    const gainNode = c.createGain();
    osc.type = note.type ?? "sine";
    osc.frequency.setValueAtTime(note.freq, now + note.start);

    const peak = note.gain ?? 0.18;
    const startAt = now + note.start;
    const endAt = startAt + note.duration;
    // Quick attack, smooth exponential release to avoid clicks.
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(peak, startAt + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

    osc.connect(gainNode);
    gainNode.connect(c.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
  }
}

// Distinct signatures so users can tell events apart by ear.
const PATTERNS: Record<SoundEvent, Note[]> = {
  // Rising major triad — celebratory payment confirmation.
  payment: [
    { freq: 523.25, start: 0, duration: 0.14, type: "triangle" },
    { freq: 659.25, start: 0.12, duration: 0.14, type: "triangle" },
    { freq: 783.99, start: 0.24, duration: 0.26, type: "triangle" },
  ],
  // Attention-grabbing double chime for incoming orders.
  new_order: [
    { freq: 880, start: 0, duration: 0.16, type: "square", gain: 0.12 },
    { freq: 1174.66, start: 0.18, duration: 0.22, type: "square", gain: 0.12 },
  ],
  // Soft two-note blip for status changes.
  status_update: [
    { freq: 587.33, start: 0, duration: 0.12, type: "sine" },
    { freq: 880, start: 0.1, duration: 0.16, type: "sine" },
  ],
  // Warm single tone for rider-related updates.
  rider: [{ freq: 493.88, start: 0, duration: 0.28, type: "triangle" }],
  generic: [{ freq: 659.25, start: 0, duration: 0.16, type: "sine" }],
};

export function playSound(event: SoundEvent) {
  playSequence(PATTERNS[event] ?? PATTERNS.generic);
}

// Map a notification "type" (and optional title) to the right sound.
export function soundForNotification(type: string | null | undefined, title?: string | null): SoundEvent {
  const t = (type ?? "").toLowerCase();
  const heading = (title ?? "").toLowerCase();
  if (t === "payment" || heading.includes("payment")) return "payment";
  if (t === "rider") return "rider";
  if (heading.includes("new order") || heading.includes("order placed")) return "new_order";
  return "status_update";
}
