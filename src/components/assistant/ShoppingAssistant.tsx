/**
 * The lazy-loaded assistant island: a floating launcher plus the chat panel.
 *
 * This module is imported with `React.lazy` from the root shell so its chunk
 * never enters another route's initial bundle. It reads auth/language/cart from
 * the providers above it and talks to the server through `askAssistantFn`.
 *
 * The transcript is ephemeral client state — no table, no migration. History is
 * not persisted across reloads, by design for v1.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { askAssistantFn } from "@/lib/assistant.functions";
import {
  ASSISTANT_MAX_CHARS,
  ASSISTANT_MAX_TURNS,
  ASSISTANT_STARTERS,
  type AssistantMessage,
  type AssistantToolResult,
  type AssistantTurn,
} from "@/lib/assistant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AssistantResults } from "@/components/assistant/AssistantResults";
import { useAssistant } from "@/components/assistant/AssistantProvider";

type Coords = { lat: number | null; lng: number | null };

/** Best-effort coordinates, used only to price a delivery. Never blocks a turn. */
function useCoords(enabled: boolean): Coords {
  const [coords, setCoords] = useState<Coords>({ lat: null, lng: null });
  useEffect(() => {
    // Only ask once the visitor actually opens the assistant: a geolocation
    // request triggers a browser permission prompt, and asking someone who is
    // just browsing the catalogue would be intrusive.
    if (!enabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: null, lng: null }),
      { timeout: 8000, maximumAge: 5 * 60_000 },
    );
  }, [enabled]);
  return coords;
}

let seq = 0;
const nextId = () => `m${++seq}`;

export default function ShoppingAssistant() {
  const { t, language } = useLanguage();
  const { open, setOpen } = useAssistant();
  const coords = useCoords(open);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [open, messages, busy]);

  // Focus the input when the panel opens so the customer can type immediately.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(
    async (text: string, base?: AssistantMessage[]) => {
      const trimmed = text.trim().slice(0, ASSISTANT_MAX_CHARS);
      if (!trimmed || busy) return;

      const userMessage: AssistantMessage = {
        id: nextId(),
        role: "user",
        text: trimmed,
        results: [],
      };
      const history = [...(base ?? messages), userMessage];
      setMessages(history);
      setInput("");
      setBusy(true);

      const turns: AssistantTurn[] = history
        .slice(-ASSISTANT_MAX_TURNS)
        .map((m) => ({ role: m.role, text: m.text }));

      try {
        const res = await askAssistantFn({
          data: { messages: turns, language, lat: coords.lat, lng: coords.lng },
        });
        const results: AssistantToolResult[] = res.results ?? [];
        const reply = (res.reply ?? "").trim();
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            // With no prose, the cards (or the note they carry) speak for
            // themselves; otherwise show the model's commentary.
            text: reply,
            results,
          },
        ]);
      } catch (err) {
        console.error("[assistant] request failed", err);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", text: "", results: [], failed: true },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, language, coords.lat, coords.lng],
  );

  const retry = () => {
    // Drop the failed bubble, then re-send the last user turn from the cleaned
    // history so the transcript never keeps a duplicate of that message.
    const cleaned = messages.filter((m) => !m.failed);
    const lastUser = [...cleaned].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    void send(
      lastUser.text,
      cleaned.filter((m) => m.id !== lastUser.id),
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("ai_launcher_label")}
        className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:bottom-6"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={t("ai_panel_title")}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
      className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col rounded-t-2xl border border-border bg-background shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:h-[600px] md:w-[400px] md:rounded-2xl"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <p className="truncate text-sm font-semibold">{t("ai_panel_title")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("ai_close_label")}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("ai_greeting")}</p>
            <div className="flex flex-wrap gap-2">
              {ASSISTANT_STARTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => void send(t(key))}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "space-y-2"}>
              {m.text && (
                <p
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "text-sm text-foreground"
                  }
                >
                  {m.text}
                </p>
              )}
              {m.failed && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t("ai_error")}</span>
                  <Button size="sm" variant="outline" onClick={retry}>
                    {t("ai_retry")}
                  </Button>
                </div>
              )}
              {m.results.length > 0 && <AssistantResults results={m.results} />}
            </div>
          ))
        )}
        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("ai_thinking")}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, ASSISTANT_MAX_CHARS))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder={t("ai_input_placeholder")}
          aria-label={t("ai_input_placeholder")}
          rows={1}
          className="max-h-24 min-h-[40px] resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !input.trim()}
          aria-label={t("ai_send_label")}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
