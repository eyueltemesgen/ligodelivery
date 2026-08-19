import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ETB } from "@/lib/format";
import { growthPercent, monthlySeries, totals, type FinanceOrder } from "@/lib/finance";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const revenueConfig = {
  revenue: { label: "Revenue", color: "hsl(142 71% 45%)" },
  payouts: { label: "Rider payouts", color: "hsl(24 95% 53%)" },
} satisfies ChartConfig;

function KpiCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
      {delta != null ? (
        <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
          {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% vs last month
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function FinancialOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-financials"],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("total,subtotal,delivery_fee,status,created_at,rider_id");
      const list = (orders ?? []) as FinanceOrder[];

      // Resolve rider names for the payout leaderboard.
      const riderIds = Array.from(new Set(list.filter((o) => o.status === "delivered" && o.rider_id).map((o) => o.rider_id as string)));
      const { data: profiles } = riderIds.length
        ? await supabase.from("profiles").select("id,full_name").in("id", riderIds)
        : { data: [] };
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name] as const));

      const payoutByRider = new Map<string, { name: string; payout: number; deliveries: number }>();
      for (const o of list) {
        if (o.status !== "delivered" || !o.rider_id) continue;
        const entry = payoutByRider.get(o.rider_id) ?? { name: nameById.get(o.rider_id) ?? "Rider", payout: 0, deliveries: 0 };
        entry.payout += Number(o.delivery_fee ?? 0) || 0;
        entry.deliveries += 1;
        payoutByRider.set(o.rider_id, entry);
      }

      return {
        series: monthlySeries(list, 6),
        totals: totals(list),
        riders: Array.from(payoutByRider.values()).sort((a, b) => b.payout - a.payout).slice(0, 6),
      };
    },
  });

  if (isLoading || !data) return <p className="mt-6 text-sm text-muted-foreground">Loading financials…</p>;

  const { series, totals: t, riders } = data;
  const revenueGrowth = growthPercent(series, "revenue");
  const maxPayout = Math.max(1, ...riders.map((r) => r.payout));

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Platform revenue" value={ETB(t.revenue)} delta={revenueGrowth} />
        <KpiCard label="Rider payouts" value={ETB(t.payouts)} hint="Delivery fees paid to riders" />
        <KpiCard label="Platform margin" value={ETB(t.net)} hint="Revenue minus payouts" />
        <KpiCard label="Avg. order value" value={ETB(t.avgOrder)} hint={`${t.deliveries} delivered orders`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display text-lg font-bold">Monthly revenue growth</h3>
          <p className="text-xs text-muted-foreground">Delivered order value over the last 6 months</p>
          <ChartContainer config={revenueConfig} className="mt-4 aspect-[16/9] w-full">
            <AreaChart data={series} margin={{ left: 4, right: 4, top: 8 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => ETB(Number(v))} />} />
              <Area dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} fill="url(#fillRevenue)" />
            </AreaChart>
          </ChartContainer>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="font-display text-lg font-bold">Revenue vs rider payouts</h3>
          <p className="text-xs text-muted-foreground">How much of revenue goes to delivery</p>
          <ChartContainer config={revenueConfig} className="mt-4 aspect-[16/9] w-full">
            <BarChart data={series} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => ETB(Number(v))} />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payouts" fill="var(--color-payouts)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display text-lg font-bold">Top rider payouts</h3>
        {riders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No completed deliveries yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {riders.map((r) => (
              <li key={r.name + r.payout} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{ETB(r.payout)} · {r.deliveries} trips</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(r.payout / maxPayout) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
