import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bike,
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

export const Route = createFileRoute("/admin/")({
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
  const { data } = useQuery({
    queryKey: ["admin-dashboard"],
    refetchInterval: 30000,
    queryFn: async () => {
      const today = startOfToday();
      const yesterday = new Date(today.getTime() - 86400000);
      const weekAgo = new Date(today.getTime() - 7 * 86400000);

      const [orders, riders, shops, customers, platformRow] = await Promise.all([
        supabase.from("orders").select("id,status,total,delivery_fee,created_at,rider_id"),
        supabase.from("riders").select("id,is_online,is_approved"),
        supabase.from("shops").select("id,is_active,is_online"),
        supabase.from("profiles").select("id,created_at"),
        supabase.from("settings").select("value").eq("key", "platform").maybeSingle(),
      ]);

      const all = orders.data ?? [];
      const todayOrders = all.filter((o) => new Date(o.created_at) >= today);
      const yesterdayOrders = all.filter(
        (o) => new Date(o.created_at) >= yesterday && new Date(o.created_at) < today,
      );
      const todayRevenue = todayOrders
        .filter((o) => o.status === "delivered")
        .reduce((s, o) => s + Number(o.total), 0);
      const yesterdayRevenue = yesterdayOrders
        .filter((o) => o.status === "delivered")
        .reduce((s, o) => s + Number(o.total), 0);

      const commissionPct = Number(
        (platformRow.data?.value as { commission_percent?: number } | null)?.commission_percent ??
          15,
      );
      const delivered = all.filter((o) => o.status === "delivered");
      const deliveryFees = delivered.reduce((s, o) => s + Number(o.delivery_fee), 0);
      const gross = delivered.reduce((s, o) => s + Number(o.total), 0);
      const commission = (gross - deliveryFees) * (commissionPct / 100);
      const merchantPayouts = gross - deliveryFees - commission;

      const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: 0 }));
      for (const o of all.filter((o) => new Date(o.created_at) >= weekAgo)) {
        hourly[new Date(o.created_at).getHours()]!.orders += 1;
      }

      const activeRiders = (riders.data ?? []).filter((r) => r.is_approved && r.is_online);
      const onDelivery = new Set(
        all
          .filter((o) =>
            ["accepted", "arrived_at_merchant", "picked_up", "on_the_way"].includes(o.status),
          )
          .map((o) => o.rider_id),
      );

      return {
        todayRevenue,
        yesterdayRevenue,
        todayOrders: todayOrders.length,
        yesterdayOrders: yesterdayOrders.length,
        ridersOnline: activeRiders.length,
        ridersOnDelivery: onDelivery.size,
        activeMerchants: (shops.data ?? []).filter((s) => s.is_active && s.is_online).length,
        totalMerchants: (shops.data ?? []).length,
        customersToday: (customers.data ?? []).filter((c) => new Date(c.created_at) >= today)
          .length,
        customersYesterday: (customers.data ?? []).filter(
          (c) => new Date(c.created_at) >= yesterday && new Date(c.created_at) < today,
        ).length,
        pendingOrders: all.filter((o) =>
          ["pending_payment", "pending", "payment_verification"].includes(o.status),
        ).length,
        completedToday: todayOrders.filter((o) => o.status === "delivered").length,
        completedYesterday: yesterdayOrders.filter((o) => o.status === "delivered").length,
        cancelled: all.filter((o) => o.status === "cancelled").length,
        hourly,
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Wallet}
          label="Today's Revenue"
          value={ETB(data?.todayRevenue ?? 0)}
          delta={delta(data?.todayRevenue ?? 0, data?.yesterdayRevenue ?? 0)}
          deltaLabel="vs yesterday"
        />
        <Kpi
          icon={ShoppingBag}
          label="Today's Orders"
          value={String(data?.todayOrders ?? 0)}
          delta={delta(data?.todayOrders ?? 0, data?.yesterdayOrders ?? 0)}
          deltaLabel="vs yesterday"
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
          value={String(data?.customersToday ?? 0)}
          delta={delta(data?.customersToday ?? 0, data?.customersYesterday ?? 0)}
          deltaLabel="vs yesterday"
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
          value={String(data?.completedToday ?? 0)}
          delta={delta(data?.completedToday ?? 0, data?.completedYesterday ?? 0)}
          deltaLabel="vs yesterday"
        />
        <Kpi icon={XCircle} label="Cancelled / Refunded" value={String(data?.cancelled ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">Hourly order volume (last 7 days)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.hourly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Bar dataKey="orders" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">
            Revenue distribution (all delivered orders)
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
