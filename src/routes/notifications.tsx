import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Ligo Delivery" },
      {
        name: "description",
        content: "Order updates, delivery alerts and payment confirmations from Ligo.",
      },
      { property: "og:title", content: "Notifications — Ligo Delivery" },
      { property: "og:description", content: "Your Ligo order and delivery updates." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (!user)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sign in to see notifications</h1>
        <Button asChild className="mt-6">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );

  const markAll = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="container-ligo max-w-3xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={markAll}>
          Mark all read
        </Button>
      </div>
      {data.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${n.is_read ? "border-border bg-card" : "border-primary/40 bg-primary-soft"}`}
            >
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
