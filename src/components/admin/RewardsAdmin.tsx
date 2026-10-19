import { useQuery } from "@tanstack/react-query";
import { Coins, Gift, TrendingDown, TrendingUp, Users } from "lucide-react";
import { fetchAdminLoyalty } from "@/lib/loyalty";
import { useLanguage } from "@/hooks/useLanguage";
import { ListSkeleton } from "@/components/account/States";

/**
 * Admin view of the loyalty and referral engine: what has been issued, spent
 * and is still outstanding, plus every wallet. Read-only — point adjustments go
 * through `admin_adjust_loyalty`, which is deliberately not exposed here yet.
 */
export function RewardsAdmin() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "loyalty"],
    queryFn: () => fetchAdminLoyalty(100),
    staleTime: 60_000,
  });

  if (isLoading) return <ListSkeleton rows={3} />;

  if (!data)
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-card">
        {t("rw_admin_empty")}
      </div>
    );

  const stats = [
    { key: "rw_admin_outstanding", value: data.outstandingPoints, icon: Coins },
    { key: "rw_admin_issued", value: data.issuedPoints, icon: TrendingUp },
    { key: "rw_admin_redeemed", value: data.redeemedPoints, icon: TrendingDown },
    { key: "rw_admin_referrals", value: data.referralCount, icon: Users },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">{t("rw_admin_title")}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("rw_admin_desc")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.key} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{t(s.key)}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">
              {s.value.toLocaleString("en-ET")}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Gift className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold">{t("rw_title")}</h3>
        </div>

        {data.wallets.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">{t("rw_admin_empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-semibold">{t("rw_admin_customer")}</th>
                  <th className="px-4 py-2 font-semibold">{t("rw_admin_code")}</th>
                  <th className="px-4 py-2 text-right font-semibold">{t("rw_admin_points")}</th>
                  <th className="px-4 py-2 text-right font-semibold">{t("rw_admin_lifetime")}</th>
                  <th className="px-4 py-2 text-right font-semibold">{t("rw_admin_invited")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.wallets.map((w) => (
                  <tr key={w.userId}>
                    <td className="px-4 py-2">
                      <span className="block truncate font-medium">
                        {w.fullName?.trim() || "—"}
                      </span>
                      {w.phone && (
                        <span className="block text-xs text-muted-foreground">{w.phone}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{w.referralCode ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {w.points.toLocaleString("en-ET")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {w.lifetimePoints.toLocaleString("en-ET")}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {w.invitedCount > 0 ? w.invitedCount : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
