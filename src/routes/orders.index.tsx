import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ETB, formatDate } from "@/lib/format";
import { STATUS_LABEL, statusTone, type OrderStatus } from "@/lib/orders";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — Ligo Delivery" },
      { name: "description", content: "Track your current and past Ligo deliveries in Bishoftu." },
      { property: "og:title", content: "My orders — Ligo Delivery" },
      { property: "og:description", content: "Track your Ligo deliveries." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user, loading } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (loading) return <div className="container-ligo py-16 text-muted-foreground">Loading…</div>;
  if (!user)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sign in to track your orders</h1>
        <Button asChild className="mt-6"><Link to="/auth" search={{ mode: "login", role: "customer" }}>Sign in</Link></Button>
      </div>
    );

  return (
    <div className="container-ligo max-w-3xl py-10">
      <h1 className="font-display text-3xl font-extrabold">My orders</h1>
      {data.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.map((o) => (
            <li key={o.id}>
              <Link to="/orders/$orderId" params={{ orderId: o.id }} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-pop">
                <div>
                  <p className="font-display font-bold">{o.order_code}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(o.status)}`}>
                    {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                  </span>
                  <p className="mt-1 text-sm font-semibold">{ETB(o.total)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
