import { useQuery } from "@tanstack/react-query";
import { Bike, ClipboardList, Star, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ETB, formatDate } from "@/lib/format";
import { STATUS_LABEL, statusTone, type OrderStatus } from "@/lib/orders";
import { IdentityAvatar } from "@/components/ligo/IdentityAvatar";
import { TierBadge } from "@/components/ligo/TierBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type RiderDossierIdentity = {
  avatarUrl?: string | null | undefined;
  vehicleType?: string | null | undefined;
  isOnline?: boolean | undefined;
  verificationStatus?: string | null | undefined;
  commissionTier?: string | null | undefined;
};

/**
 * Admin-side rider dossier: lifetime stats, delivery history, earnings
 * ledger summary and offer acceptance behaviour for one rider.
 */
export function RiderDossier({
  riderId,
  riderName,
  identity,
  open,
  onOpenChange,
}: {
  riderId: string | null;
  riderName: string;
  identity?: RiderDossierIdentity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = useQuery({
    queryKey: ["rider-dossier", riderId],
    enabled: open && !!riderId,
    queryFn: async () => {
      const [orders, earnings, ratings, offers, payouts] = await Promise.all([
        supabase
          .from("orders")
          .select("id,order_code,status,total,created_at")
          .eq("rider_id", riderId!)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("rider_earnings")
          .select("amount,base_fare,tip,bonus,distance_incentive,distance_km,status")
          .eq("rider_id", riderId!),
        supabase.from("rider_ratings").select("rating").eq("rider_id", riderId!),
        supabase.from("rider_offer_events").select("event").eq("rider_id", riderId!),
        supabase
          .from("payout_requests")
          .select("id,amount,status,created_at,processed_at")
          .eq("rider_id", riderId!)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const earningsRows = earnings.data ?? [];
      const ratingRows = ratings.data ?? [];
      const offerRows = offers.data ?? [];

      const totalEarnings = earningsRows.reduce((s, e) => s + Number(e.amount), 0);
      const pendingEarnings = earningsRows
        .filter((e) => e.status !== "paid")
        .reduce((s, e) => s + Number(e.amount), 0);
      const totalKm = earningsRows.reduce((s, e) => s + Number(e.distance_km), 0);

      const accepted = offerRows.filter((o) => o.event === "accepted").length;
      const declined = offerRows.filter((o) => o.event === "declined").length;
      const acceptanceRate =
        accepted + declined > 0 ? Math.round((accepted / (accepted + declined)) * 100) : null;

      const avgRating =
        ratingRows.length > 0
          ? ratingRows.reduce((s, r) => s + r.rating, 0) / ratingRows.length
          : null;

      return {
        deliveries: earningsRows.length,
        totalEarnings,
        pendingEarnings,
        totalKm,
        avgRating,
        ratingCount: ratingRows.length,
        accepted,
        declined,
        acceptanceRate,
        recentOrders: orders.data ?? [],
        payoutRequests: payouts.data ?? [],
      };
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rider dossier</DialogTitle>
          <DialogDescription>
            Delivery history, earnings, customer ratings and dispatch behaviour.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
          <div className="relative">
            <IdentityAvatar
              path={identity?.avatarUrl}
              name={riderName}
              className="h-12 w-12 text-base"
            />
            <span
              aria-label={identity?.isOnline ? "Online" : "Offline"}
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${
                identity?.isOnline ? "bg-primary" : "bg-muted-foreground/40"
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-bold">{riderName}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {identity?.isOnline ? "Online now" : "Offline"} · {identity?.vehicleType ?? "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                identity?.verificationStatus === "approved"
                  ? "bg-primary-soft text-accent-foreground"
                  : "bg-warning/20 text-warning-foreground"
              }`}
            >
              {(identity?.verificationStatus ?? "pending_verification").replace(/_/g, " ")}
            </span>
            <TierBadge tier={identity?.commissionTier} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            icon={ClipboardList}
            label="Deliveries"
            value={String(data?.deliveries ?? 0)}
            hint={`${(data?.totalKm ?? 0).toFixed(1)} km covered`}
          />
          <Stat
            icon={Wallet}
            label="Total earnings"
            value={ETB(data?.totalEarnings ?? 0)}
            hint={`${ETB(data?.pendingEarnings ?? 0)} unpaid`}
          />
          <Stat
            icon={Star}
            label="Rating"
            value={data?.avgRating != null ? `${data.avgRating.toFixed(2)} ★` : "—"}
            hint={`${data?.ratingCount ?? 0} customer ratings`}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Bike className="h-4 w-4" /> Offer acceptance
          </span>
          <span className="font-semibold">
            {data?.acceptanceRate != null
              ? `${data.acceptanceRate}% (${data.accepted} accepted · ${data.declined} declined)`
              : "No offers yet"}
          </span>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Payout requests
          </p>
          {data?.payoutRequests.length ? (
            <ul className="max-h-36 space-y-1.5 overflow-y-auto">
              {data.payoutRequests.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{ETB(p.amount)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      p.status === "paid"
                        ? "bg-primary-soft text-accent-foreground"
                        : p.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                    {p.processed_at ? ` · processed ${formatDate(p.processed_at)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No payout requests yet.</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent deliveries
          </p>
          {data?.recentOrders.length ? (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto">
              {data.recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs font-semibold">{o.order_code}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(o.status)}`}
                  >
                    {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                  </span>
                  <span className="ml-auto font-medium">{ETB(o.total)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(o.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No deliveries recorded yet.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-1 font-display text-lg font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
