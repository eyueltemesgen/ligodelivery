import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bike,
  CalendarRange,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Store,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ETB } from "@/lib/format";

type RangeKey = "today" | "7d" | "30d";

const RANGES: { key: RangeKey; label: string; days: number; prevLabel: string }[] = [
  { key: "today", label: "Today", days: 1, prevLabel: "vs yesterday" },
  { key: "7d", label: "Last 7 days", days: 7, prevLabel: "vs prior 7 days" },
  { key: "30d", label: "Last 30 days", days: 30, prevLabel: "vs prior 30 days" },
];

export const Route = createFileRoute("/admin/")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { range?: RangeKey } = {};
    if (RANGES.some((r) => r.key === s["range"])) out.range = s["range"] as RangeKey;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Ligo Admin" },
      {
        name: "description",
        content: "LIGO operations dashboard: revenue, orders, riders and merchants.",
      },
      { property: "og:title", content: "Dashboard — Ligo Admin" },
      { property: "og:description", content: "LIGO operations dashboard." },
    ],
  }),
  component: AdminDashboard,
});

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function AdminDashboard() {
  const { range = "today" } = Route.useSearch();
  const navigate = useNavigate();
  const rangeDef = RANGES.find((r) => r.key === range) ?? RANGES[0]!;

  const { data } = useQuery({
    queryKey: ["admin-dashboard", range],
    refetchInterval: 30000,
    queryFn: async () => {
      const today = startOfToday();
      const windowStart = new Date(today.getTime() - (rangeDef.days - 1) * 86400000);
      const prevStart = new Date(windowStart.getTime() - rangeDef.days * 86400000);

      const [orders, riders, shops, customers, platformRow] = await Promise.all([
        supabase
          .from("orders")
          .select("id,status,total,delivery_fee,created_at,rider_id")
          .gte("created_at", prevStart.toISOString()),
        supabase.from("riders").select("id,is_online,is_approved"),
        supabase.from("shops").select("id,is_active,is_online"),
        supabase
          .from("profiles")
          .select("id,created_at")
          .gte("created_at", prevStart.toISOString()),
        supabase.from("settings").select("value").eq("key", "platform").maybeSingle(),
      ]);

      const all = orders.data ?? [];
      const inWindow = all.filter((o) => new Date(o.created_at) >= windowStart);
      const inPrev = all.filter(
        (o) => new Date(o.created_at) >= prevStart && new Date(o.created_at) < windowStart,
      );

      const revenueOf = (rows: typeof all) =>
        rows.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0);
      const completedOf = (rows: typeof all) => rows.filter((o) => o.status === "delivered").length;

      const commissionPct = Number(
        (platformRow.data?.value as { commission_percent?: number } | null)?.commission_percent ??
          15,
      );
      const delivered = inWindow.filter((o) => o.status === "delivered");
      const deliveryFees = delivered.reduce((s, o) => s + Number(o.delivery_fee), 0);
      const gross = delivered.reduce((s, o) => s + Number(o.total), 0);
      const commission = (gross - deliveryFees) * (commissionPct / 100);
      const merchantPayouts = gross - deliveryFees - commission;

      // Volume chart: hourly buckets within today, daily buckets for longer ranges
      const volume =
        rangeDef.days === 1
          ? Array.from({ length: 24 }, (_, h) => ({
              label: `${h}:00`,
              orders: inWindow.filter((o) => new Date(o.created_at).getHours() === h).length,
            }))
          : Array.from({ length: rangeDef.days }, (_, i) => {
              const dayStart = new Date(windowStart.getTime() + i * 86400000);
              const dayEnd = new Date(dayStart.getTime() + 86400000);
              return {
                label: dayStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
                orders: inWindow.filter((o) => {
                  const t = new Date(o.created_at);
                  return t >= dayStart && t < dayEnd;
                }).length,
              };
            });

      const activeRiders = (riders.data ?? []).filter((r) => r.is_approved && r.is_online);
      const onDelivery = new Set(
        all
          .filter((o) =>
            ["accepted", "arrived_at_merchant", "picked_up", "on_the_way"].includes(o.status),
          )
          .map((o) => o.rider_id),
      );

      const customersAll = customers.data ?? [];

      return {
        revenue: revenueOf(inWindow),
        prevRevenue: revenueOf(inPrev),
        ordersCount: inWindow.length,
        prevOrdersCount: inPrev.length,
        ridersOnline: activeRiders.length,
        ridersOnDelivery: onDelivery.size,
        activeMerchants: (shops.data ?? []).filter((s) => s.is_active && s.is_online).length,
        totalMerchants: (shops.data ?? []).length,
        customersJoined: customersAll.filter((c) => new Date(c.created_at) >= windowStart).length,
        prevCustomersJoined: customersAll.filter(
          (c) => new Date(c.created_at) >= prevStart && new Date(c.created_at) < windowStart,
        ).length,
        pendingOrders: all.filter((o) =>
          ["pending_payment", "pending", "payment_verification"].includes(o.status),
        ).length,
        completed: completedOf(inWindow),
        prevCompleted: completedOf(inPrev),
        cancelled: inWindow.filter((o) => o.status === "cancelled").length,
        prevCancelled: inPrev.filter((o) => o.status === "cancelled").length,
        volume,
        revenueSplit: [
          { name: "Platform commission", value: Math.round(commission) },
          { name: "Delivery fees", value: Math.round(deliveryFees) },
          { name: "Merchant payouts", value: Math.round(merchantPayouts) },
        ],
      };
    },
  });

  const delta = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold">Dashboard · {rangeDef.label}</h1>
        <div
          className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-card"
          role="group"
          aria-label="Date range filter"
        >
          <CalendarRange className="ml-1 h-4 w-4 text-muted-foreground" />
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() =>
                void navigate({
                  to: "/admin",
                  search: r.key === "today" ? {} : { range: r.key },
                  replace: true,
                })
              }
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                range === r.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Wallet}
          label="Revenue"
          value={ETB(data?.revenue ?? 0)}
          delta={delta(data?.revenue ?? 0, data?.prevRevenue ?? 0)}
          deltaLabel={rangeDef.prevLabel}
        />
        <Kpi
          icon={ShoppingBag}
          label="Orders"
          value={String(data?.ordersCount ?? 0)}
          delta={delta(data?.ordersCount ?? 0, data?.prevOrdersCount ?? 0)}
          deltaLabel={rangeDef.prevLabel}
        />
        <Kpi
          icon={Bike}
          label="Active Riders"
          value={`${data?.ridersOnline ?? 0} online · ${data?.ridersOnDelivery ?? 0} on delivery`}
        />
        <Kpi
          icon={Store}
          label="Active Merchants"
          value={`${data?.activeMerchants ?? 0} / ${data?.totalMerchants ?? 0}`}
        />
        <Kpi
          icon={Users}
          label="Customers Joined"
          value={String(data?.customersJoined ?? 0)}
          delta={delta(data?.customersJoined ?? 0, data?.prevCustomersJoined ?? 0)}
          deltaLabel={rangeDef.prevLabel}
        />
        <Kpi
          icon={Clock}
          label="Pending Orders"
          value={String(data?.pendingOrders ?? 0)}
          hint="Awaiting approval / dispatch"
        />
        <Kpi
          icon={CheckCircle2}
          label="Completed Deliveries"
          value={String(data?.completed ?? 0)}
          delta={delta(data?.completed ?? 0, data?.prevCompleted ?? 0)}
          deltaLabel={rangeDef.prevLabel}
        />
        <Kpi
          icon={XCircle}
          label="Cancelled / Refunded"
          value={String(data?.cancelled ?? 0)}
          delta={delta(data?.cancelled ?? 0, data?.prevCancelled ?? 0)}
          deltaLabel={rangeDef.prevLabel}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">
            {rangeDef.days === 1
              ? "Hourly order volume vs capacity (today)"
              : `Daily order volume (${rangeDef.label.toLowerCase()})`}
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.volume ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  interval={rangeDef.days === 30 ? 4 : 3}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Bar dataKey="orders" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">
            Revenue distribution ({rangeDef.label.toLowerCase()})
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.revenueSplit ?? []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {(data?.revenueSplit ?? []).map((_, i) => (
                    <Cell key={i} fill={["#059669", "#0ea5e9", "#f59e0b"][i % 3]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => ETB(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  deltaLabel,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 font-display text-xl font-extrabold lg:text-2xl">{value}</p>
      {delta != null && (
        <p
          className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            delta >= 0 ? "text-primary" : "text-destructive"
          }`}
        >
          {delta >= 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {Math.abs(delta)}% {deltaLabel}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
