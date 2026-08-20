import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquareWarning } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ETB, formatDate } from "@/lib/format";
import { notify, STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "Support — Ligo Admin" },
      { name: "description", content: "Order disputes and support actions for LIGO operations." },
      { property: "og:title", content: "Support — Ligo Admin" },
      { property: "og:description", content: "Order disputes and support actions." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const { data: disputes = [] } = useQuery({
    queryKey: ["admin-support-disputes"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data: cancelledOrders } = await supabase
        .from("orders")
        .select(
          "id,order_code,status,total,cancel_reason,refunded,customer_id,customer_name,rider_id,created_at",
        )
        .eq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(30);
      const { data: events } = await supabase
        .from("order_events")
        .select("id,order_id,event,reason,created_at")
        .order("created_at", { ascending: false })
        .limit(60);
      return (cancelledOrders ?? []).map((o) => ({
        ...o,
        events: (events ?? []).filter((e) => e.order_id === o.id),
      }));
    },
  });

  const sendReply = async (order: (typeof disputes)[number]) => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await supabase.from("order_events").insert({
        order_id: order.id,
        actor_id: user?.id ?? null,
        event: "ops_message",
        reason: reply.trim(),
      });
      await notify(
        order.customer_id,
        `Support update · Order ${order.order_code}`,
        reply.trim(),
        "support",
        order.id,
      );
      if (order.rider_id) {
        await notify(
          order.rider_id,
          `Support update · Order ${order.order_code}`,
          reply.trim(),
          "support",
          order.id,
        );
      }
      toast.success("Reply sent");
      setReply("");
      setReplyTarget(null);
      void qc.invalidateQueries({ queryKey: ["admin-support-disputes"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cancelled orders and dispute history. Reply directly to the customer and rider.
        </p>
      </div>

      {disputes.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <MessageSquareWarning className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No open disputes or cancelled orders.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {disputes.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display font-bold">{o.order_code}</p>
                <p className="text-xs text-muted-foreground">
                  {o.customer_name} · {ETB(o.total)} · {formatDate(o.created_at)}
                  {o.refunded ? " · Refunded" : ""}
                </p>
              </div>
              <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
              </span>
            </div>
            {o.cancel_reason && (
              <p className="mt-2 rounded-lg bg-destructive/5 p-2 text-sm">
                Cancellation reason: {o.cancel_reason}
              </p>
            )}
            {o.events.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {o.events.map((e) => (
                  <li key={e.id}>
                    <span className="font-semibold capitalize">{e.event}</span>
                    {e.reason ? ` — ${e.reason}` : ""} · {formatDate(e.created_at)}
                  </li>
                ))}
              </ul>
            )}
            {replyTarget === o.id ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a support reply…"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={sending || !reply.trim()}
                    onClick={() => void sendReply(o)}
                  >
                    {sending ? "Sending…" : "Send reply"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReplyTarget(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setReplyTarget(o.id);
                  setReply("");
                }}
              >
                Reply to parties
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
