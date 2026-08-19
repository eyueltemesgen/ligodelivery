import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playSound, soundForNotification, unlockAudio, type SoundEvent } from "@/lib/sound";

const STORAGE_KEY = "ligo:sound-enabled";

type SoundValue = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  play: (event: SoundEvent) => void;
};

const SoundContext = createContext<SoundValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState(true);
  const enabledRef = useRef(true);

  // Load persisted preference.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored != null) {
      const on = stored === "true";
      setEnabledState(on);
      enabledRef.current = on;
    }
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    enabledRef.current = v;
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, String(v));
    if (v) void unlockAudio();
  }, []);

  const play = useCallback((event: SoundEvent) => {
    if (!enabledRef.current) return;
    playSound(event);
  }, []);

  // Unlock the AudioContext on the first user interaction (autoplay policy).
  useEffect(() => {
    const unlock = () => void unlockAudio();
    const opts = { once: true } as const;
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Auto-play a sound whenever a notification is inserted for the current user.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`sound-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { type?: string; title?: string };
          play(soundForNotification(row.type, row.title));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, play]);

  return <SoundContext.Provider value={{ enabled, setEnabled, play }}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used inside SoundProvider");
  return ctx;
}
