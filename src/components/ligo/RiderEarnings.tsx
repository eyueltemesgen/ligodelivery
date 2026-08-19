import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ETB } from "@/lib/format";
import { currentMonthKey, growthPercent, monthlySeries, totals, type FinanceOrder } from "@/lib/finance";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  earnings: { label: "Earnings", color: "hsl(142 71% 45%)" },
} satisfies ChartConfig;

export function RiderEarnings({ orders }: { orders: FinanceOrder[] }) {
  const { series, t, thisMonth, growth } = useMemo(() => {
    const series = monthlySeries(orders, 6);
    const t = totals(orders);
    const key = currentMonthKey();
    const thisMonth = series.find((s) => s.key === key) ?? { earnings: 0, deliveries: 0 };
    return { series, t, thisMonth, growth: growthPercent(series, "earnings") };
  }, [orders]);

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">Earnings</h2>
          <p className="text-sm text-muted-foreground">Your delivery revenue breakdown</p>
        </div>
        {growth != null && (
          <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${growth >= 0 ? "bg-primary-soft text-accent-foreground" : "bg-destructive/10 text-destructive"}`}>
            {growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {growth >= 0 ? "+" : ""}{growth.toFixed(1)}% this month
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="This month" value={ETB(thisMonth.earnings)} sub={`${thisMonth.deliveries} deliveries`} />
        <Metric label="Total earned" value={ETB(t.payouts)} sub="All time" />
        <Metric label="Completed trips" value={String(t.deliveries)} sub="Delivered orders" />
        <Metric label="Avg. per trip" value={ETB(t.deliveries ? t.payouts / t.deliveries : 0)} sub="Per delivery" />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground">Monthly earnings</h3>
        <ChartContainer config={config} className="mt-3 aspect-[16/7] w-full">
          <BarChart data={series} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => ETB(Number(v))} />} />
            <Bar dataKey="earnings" fill="var(--color-earnings)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
