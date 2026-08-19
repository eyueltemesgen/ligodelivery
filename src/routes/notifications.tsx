import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSound } from "@/hooks/useSound";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Ligo Delivery" },
      { name: "description", content: "Order updates, delivery alerts and payment confirmations from Ligo." },
      { property: "og:title", content: "Notifications — Ligo Delivery" },
      { property: "og:description", content: "Your Ligo order and delivery updates." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const { enabled, setEnabled, play } = useSound();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  // Keep the list fresh in real time (the sound itself is handled globally).
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);

  if (!user)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sign in to see notifications</h1>
        <Button asChild className="mt-6"><Link to="/auth" search={{ mode: "login", role: "customer" }}>Sign in</Link></Button>
      </div>
    );

  const markAll = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="container-ligo max-w-3xl py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold">Notifications</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
            {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            <span className="font-medium">Sound alerts</span>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => {
                setEnabled(v);
                if (v) play("status_update");
              }}
            />
          </label>
          <Button variant="outline" size="sm" onClick={markAll}>Mark all read</Button>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.map((n) => (
            <li key={n.id} className={`rounded-xl border p-4 ${n.is_read ? "border-border bg-card" : "border-primary/40 bg-primary-soft"}`}>
              <p className="font-semibold">{n.title}</p>
              {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
