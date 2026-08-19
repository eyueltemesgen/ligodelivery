// Shared financial aggregation helpers for the rider and admin dashboards.

export type FinanceOrder = {
  total: number | string | null;
  subtotal?: number | string | null;
  delivery_fee?: number | string | null;
  status: string;
  created_at: string;
  rider_id?: string | null;
};

const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;

export const isRevenueOrder = (o: FinanceOrder) => o.status === "delivered";

export type MonthlyPoint = {
  key: string; // YYYY-MM
  label: string; // e.g. "Aug"
  revenue: number;
  payouts: number;
  earnings: number;
  deliveries: number;
};

// Build a continuous series of the last `months` calendar months (oldest → newest).
export function monthlySeries(orders: FinanceOrder[], months = 6): MonthlyPoint[] {
  const now = new Date();
  const buckets: MonthlyPoint[] = [];
  const index = new Map<string, MonthlyPoint>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const point: MonthlyPoint = {
      key,
      label: d.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
      payouts: 0,
      earnings: 0,
      deliveries: 0,
    };
    buckets.push(point);
    index.set(key, point);
  }

  for (const o of orders) {
    if (!isRevenueOrder(o)) continue;
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const point = index.get(key);
    if (!point) continue;
    const fee = num(o.delivery_fee);
    point.revenue += num(o.total);
    point.payouts += fee;
    point.earnings += fee;
    point.deliveries += 1;
  }

  return buckets;
}

export type FinanceTotals = {
  revenue: number;
  payouts: number;
  net: number;
  deliveries: number;
  avgOrder: number;
};

export function totals(orders: FinanceOrder[]): FinanceTotals {
  const delivered = orders.filter(isRevenueOrder);
  const revenue = delivered.reduce((s, o) => s + num(o.total), 0);
  const payouts = delivered.reduce((s, o) => s + num(o.delivery_fee), 0);
  const deliveries = delivered.length;
  return {
    revenue,
    payouts,
    net: revenue - payouts,
    deliveries,
    avgOrder: deliveries ? revenue / deliveries : 0,
  };
}

// Percentage growth between the two most recent months of a series.
export function growthPercent(series: MonthlyPoint[], field: keyof Pick<MonthlyPoint, "revenue" | "earnings" | "deliveries">): number | null {
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (!last || !prev) return null;
  const current = last[field];
  const previous = prev[field];
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
