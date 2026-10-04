import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { ETB, formatDate } from "@/lib/format";
import {
  ORDER_STATUSES,
  STATUS_LABEL_KEY,
  statusTone,
  notify,
  type OrderStatus,
} from "@/lib/orders";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";
import { isMissingRpc, supabaseErrorText } from "@/lib/supa-error";
import { PROOF_BUCKET, StorageImage, uploadImage } from "@/lib/media";
import { ShopHoursEditor } from "@/components/ligo/ShopHoursEditor";
import { IdentityAvatar } from "@/components/ligo/IdentityAvatar";
import {
  BANNER_PLACEMENTS,
  CONTENT_FIELDS,
  DEFAULT_CONTENT,
  type SiteContent,
} from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MarketingHub } from "@/components/admin/MarketingHub";
import { SpecialMomentsAdmin } from "@/components/admin/SpecialMomentsAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const OPS_TABS = [
  "orders",
  "payments",
  "payouts",
  "shops",
  "customers",
  "products",
  "categories",
  "special-moments",
  "offers",
  "marketing",
  "banners",
  "content",
  "financials",
  "settings",
  "system",
] as const;
type OpsTab = (typeof OPS_TABS)[number];

export const Route = createFileRoute("/admin/ops")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { tab?: OpsTab } = {};
    if (OPS_TABS.includes(s["tab"] as OpsTab)) out.tab = s["tab"] as OpsTab;
    return out;
  },
  head: () => ({
    meta: [
      { title: translations.en.aop_meta_title },
      {
        name: "description",
        content: translations.en.aop_meta_desc,
      },
      { property: "og:title", content: translations.en.aop_meta_title },
      { property: "og:description", content: translations.en.aop_meta_og_desc },
    ],
  }),
  component: AdminPage,
});

// Access control lives in the /admin layout (AdminGate); this page assumes an admin session.
function AdminPage() {
  const { t } = useLanguage();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <>
      <Stats />
      <Tabs
        value={tab ?? "orders"}
        onValueChange={(v) => void navigate({ search: { tab: v as OpsTab } })}
        className="mt-5 sm:mt-8"
      >
        <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max min-w-full justify-start gap-1">
            <TabsTrigger value="orders" className="min-h-9">
              {t("aop_tab_orders")}
            </TabsTrigger>
            <TabsTrigger value="payments" className="min-h-9">
              {t("aop_tab_payments")}
            </TabsTrigger>
            <TabsTrigger value="payouts" className="min-h-9">
              {t("aop_tab_payouts")}
            </TabsTrigger>
            <TabsTrigger value="customers" className="min-h-9">
              {t("aop_tab_customers")}
            </TabsTrigger>
            <TabsTrigger value="shops" className="min-h-9">
              {t("aop_tab_shops")}
            </TabsTrigger>
            <TabsTrigger value="products" className="min-h-9">
              {t("aop_tab_products")}
            </TabsTrigger>
            <TabsTrigger value="categories" className="min-h-9">
              {t("aop_tab_categories")}
            </TabsTrigger>
            <TabsTrigger value="special-moments" className="min-h-9">
              {t("aop_tab_special_moments")}
            </TabsTrigger>
            <TabsTrigger value="offers" className="min-h-9">
              {t("aop_tab_offers")}
            </TabsTrigger>
            <TabsTrigger value="marketing" className="min-h-9">
              {t("aop_tab_marketing")}
            </TabsTrigger>
            <TabsTrigger value="banners" className="min-h-9">
              {t("aop_tab_banners")}
            </TabsTrigger>
            <TabsTrigger value="content" className="min-h-9">
              {t("aop_tab_content")}
            </TabsTrigger>
            <TabsTrigger value="financials" className="min-h-9">
              {t("aop_tab_financials")}
            </TabsTrigger>
            <TabsTrigger value="settings" className="min-h-9">
              {t("aop_tab_settings")}
            </TabsTrigger>
            <TabsTrigger value="system" className="min-h-9">
              {t("aop_tab_system")}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="orders">
          <OrdersAdmin />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsAdmin />
        </TabsContent>
        <TabsContent value="payouts">
          <PayoutsAdmin />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersAdmin />
        </TabsContent>
        <TabsContent value="shops">
          <ShopsAdmin />
        </TabsContent>
        <TabsContent value="products">
          <ProductsAdmin />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesAdmin />
        </TabsContent>
        <TabsContent value="special-moments">
          <SpecialMomentsAdmin />
        </TabsContent>
        <TabsContent value="offers">
          <OffersAdmin />
        </TabsContent>
        <TabsContent value="marketing">
          <MarketingHub />
        </TabsContent>
        <TabsContent value="banners">
          <BannersAdmin />
        </TabsContent>
        <TabsContent value="content">
          <ContentAdmin />
        </TabsContent>
        <TabsContent value="financials">
          <FinancialsPanel />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsAdmin />
        </TabsContent>
        <TabsContent value="system">
          <SystemAdmin />
        </TabsContent>
      </Tabs>
    </>
  );
}

type PlatformSettings = {
  commission_percent: number;
  base_delivery_fee: number;
  surge_multiplier: number;
  dispatch_paused: boolean;
};

const DEFAULT_PLATFORM: PlatformSettings = {
  commission_percent: 15,
  base_delivery_fee: 50,
  surge_multiplier: 1,
  dispatch_paused: false,
};

function SystemAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "platform")
        .maybeSingle();
      return { ...DEFAULT_PLATFORM, ...((row?.value ?? {}) as Partial<PlatformSettings>) };
    },
  });

  const value = draft ?? data ?? DEFAULT_PLATFORM;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "platform", value: value as never, is_public: true }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft(null);
    void qc.invalidateQueries({ queryKey: ["admin-platform-settings"] });
    void qc.invalidateQueries({ queryKey: ["settings-public"] });
    toast.success(t("aop_settings_saved"));
  };

  return (
    <form
      onSubmit={save}
      className="mt-6 max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"
    >
      <h3 className="font-display text-lg font-bold">{t("aop_system_center")}</h3>
      <div className="space-y-1.5">
        <Label htmlFor="commission">{t("aop_commission_pct")}</Label>
        <Input
          id="commission"
          type="number"
          min={0}
          max={100}
          step="0.5"
          value={value.commission_percent}
          onChange={(e) => setDraft({ ...value, commission_percent: Number(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="base-fee">{t("aop_base_fee")}</Label>
        <Input
          id="base-fee"
          type="number"
          min={0}
          step="1"
          value={value.base_delivery_fee}
          onChange={(e) => setDraft({ ...value, base_delivery_fee: Number(e.target.value) || 0 })}
        />
        <p className="text-xs text-muted-foreground">{t("aop_base_fee_hint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="surge">{t("aop_surge")}</Label>
        <Input
          id="surge"
          type="number"
          min={1}
          max={5}
          step="0.1"
          value={value.surge_multiplier}
          onChange={(e) => setDraft({ ...value, surge_multiplier: Number(e.target.value) || 1 })}
        />
        <p className="text-xs text-muted-foreground">{t("aop_surge_hint")}</p>
      </div>
      <label className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium">
        {t("aop_emergency_pause")}
        <Switch
          checked={value.dispatch_paused}
          onCheckedChange={(v) => setDraft({ ...value, dispatch_paused: v })}
        />
      </label>
      {value.dispatch_paused && (
        <p className="text-xs text-destructive">{t("aop_pause_warning")}</p>
      )}
      <Button type="submit" disabled={saving}>
        {saving ? t("aop_saving") : t("aop_save_platform")}
      </Button>
    </form>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function CustomersAdmin() {
  const { t } = useLanguage();
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const [{ data: profiles }, { data: orders }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone,email,created_at").in("id", ids),
        supabase.from("orders").select("customer_id,total,status").in("customer_id", ids),
      ]);
      return (profiles ?? []).map((p) => {
        const userOrders = (orders ?? []).filter((o) => o.customer_id === p.id);
        return {
          ...p,
          orderCount: userOrders.length,
          spend: userOrders
            .filter((o) => o.status === "delivered")
            .reduce((s, o) => s + Number(o.total), 0),
        };
      });
    },
  });

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card shadow-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">{t("aop_customer")}</th>
            <th className="px-4 py-3">{t("aop_contact")}</th>
            <th className="px-4 py-3">{t("aop_joined")}</th>
            <th className="px-4 py-3 text-right">{t("aop_tab_orders")}</th>
            <th className="px-4 py-3 text-right">{t("aop_lifetime_spend")}</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium">{c.full_name || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.phone || c.email || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
              <td className="px-4 py-3 text-right">{c.orderCount}</td>
              <td className="px-4 py-3 text-right font-semibold">{ETB(c.spend)}</td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                {t("aop_no_customers")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FinancialsPanel() {
  const { t } = useLanguage();
  const { data } = useQuery({
    queryKey: ["admin-financials"],
    queryFn: async () => {
      const [{ data: orders }, { data: payouts }, { data: platformRow }] = await Promise.all([
        supabase.from("orders").select("status,total,delivery_fee,payment_status,payment_method"),
        supabase.from("payout_requests").select("amount,status"),
        supabase.from("settings").select("value").eq("key", "platform").maybeSingle(),
      ]);
      const commissionPct = Number(
        (platformRow?.value as { commission_percent?: number } | null)?.commission_percent ?? 15,
      );
      const delivered = (orders ?? []).filter((o) => o.status === "delivered");
      const gross = delivered.reduce((s, o) => s + Number(o.total), 0);
      const deliveryFees = delivered.reduce((s, o) => s + Number(o.delivery_fee), 0);
      const commission = (gross - deliveryFees) * (commissionPct / 100);
      const merchantPayouts = gross - deliveryFees - commission;
      const paidOut = (payouts ?? [])
        .filter((p) => p.status === "paid")
        .reduce((s, p) => s + Number(p.amount), 0);
      const requested = (payouts ?? [])
        .filter((p) => p.status === "pending")
        .reduce((s, p) => s + Number(p.amount), 0);
      const byMethod = Object.entries(
        (orders ?? []).reduce<Record<string, number>>((acc, o) => {
          acc[o.payment_method] = (acc[o.payment_method] ?? 0) + Number(o.total);
          return acc;
        }, {}),
      );
      return { gross, deliveryFees, commission, merchantPayouts, paidOut, requested, byMethod };
    },
  });

  if (!data) return <p className="mt-6 text-sm text-muted-foreground">{t("aop_loading")}</p>;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card label={t("aop_gross_revenue")} value={ETB(data.gross)} />
        <Card label={t("aop_platform_commission")} value={ETB(data.commission)} />
        <Card label={t("aop_delivery_fees")} value={ETB(data.deliveryFees)} />
        <Card label={t("aop_merchant_payouts_value")} value={ETB(data.merchantPayouts)} />
        <Card label={t("aop_rider_cashouts_paid")} value={ETB(data.paidOut)} />
        <Card label={t("aop_cashout_pending")} value={ETB(data.requested)} />
      </div>
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h3 className="font-display font-bold">{t("aop_volume_by_gateway")}</h3>
        <ul className="mt-3 space-y-1.5 text-sm">
          {data.byMethod.map(([method, total]) => (
            <li
              key={method}
              className="flex justify-between border-b border-border pb-1.5 last:border-0"
            >
              <span className="uppercase text-muted-foreground">{method}</span>
              <span className="font-semibold">{ETB(total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stats() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [orders, shops, products, proofs, riders] = await Promise.all([
        supabase.from("orders").select("total,status,rider_id"),
        supabase.from("shops").select("id"),
        supabase.from("products").select("id"),
        supabase.from("payment_proofs").select("id,status"),
        supabase.from("riders").select("id,is_online,is_approved"),
      ]);
      const list = orders.data ?? [];
      const approvedRiders = (riders.data ?? []).filter((r) => r.is_approved);
      const onTrip = new Set(
        list
          .filter((o) =>
            ["accepted", "arrived_at_merchant", "picked_up", "on_the_way"].includes(o.status),
          )
          .map((o) => o.rider_id)
          .filter(Boolean),
      );
      return {
        orders: list.length,
        revenue: list
          .filter((o) => o.status === "delivered")
          .reduce((s, o) => s + Number(o.total), 0),
        active: list.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
        shops: shops.data?.length ?? 0,
        products: products.data?.length ?? 0,
        pendingProofs: (proofs.data ?? []).filter((p) => p.status === "pending").length,
        ridersOnline: approvedRiders.filter((r) => r.is_online).length,
        ridersOnTrip: onTrip.size,
        ridersTotal: approvedRiders.length,
      };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-stats-riders-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "riders" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin-stats"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-7">
      <Card label={t("aop_orders")} value={data?.orders ?? 0} />
      <Card label={t("aop_active")} value={data?.active ?? 0} />
      <Card label={t("aop_revenue")} value={ETB(data?.revenue ?? 0)} />
      <Card label={t("aop_shops")} value={data?.shops ?? 0} />
      <Card label={t("aop_products")} value={data?.products ?? 0} />
      <Card label={t("aop_pending_receipts")} value={data?.pendingProofs ?? 0} />
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("aop_fleet")}</p>
        <p className="mt-1 font-display text-2xl font-extrabold">
          {data?.ridersOnline ?? 0}
          <span className="text-sm font-semibold text-muted-foreground">
            /{data?.ridersTotal ?? 0}
          </span>
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              (data?.ridersOnline ?? 0) > 0 ? "bg-primary" : "bg-muted-foreground/40"
            }`}
          />
          {t("aop_fleet_status", {
            online: data?.ridersOnline ?? 0,
            onTrip: data?.ridersOnTrip ?? 0,
          })}
        </p>
      </div>
    </div>
  );
}

function OrdersAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () =>
      (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ??
      [],
  });
  const { data: riders = [] } = useQuery({
    queryKey: ["admin-riders"],
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("id,is_approved,is_online");
      const ids = (data ?? []).map((r) => r.id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id,full_name,phone").in("id", ids)
        : { data: [] };
      return (data ?? []).map((r) => ({
        ...r,
        name: profiles?.find((p) => p.id === r.id)?.full_name || t("aop_rider"),
        phone: profiles?.find((p) => p.id === r.id)?.phone ?? "",
      }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-orders-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const update = async (
    id: string,
    patch: Record<string, unknown>,
    customerId: string,
    code: string,
    message: string,
  ) => {
    const { error } = await supabase
      .from("orders")
      .update(patch as never)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notify(customerId, t("aop_notify_order_title", { code }), message, "order", id);
    void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    toast.success(t("aop_order_updated"));
  };

  const approveDispatch = async (id: string, customerId: string, code: string) => {
    const { error } = await dispatchOrder(id);
    if (error) {
      toast.error(supabaseErrorText(t, error));
      return;
    }
    await notify(
      customerId,
      t("aop_notify_order_confirmed", { code }),
      t("aop_notify_payment_verified"),
      "order",
      id,
    );
    void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    toast.success(t("aop_order_dispatched"));
  };

  return (
    <div className="mt-6 space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display font-bold">{o.order_code}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(o.created_at)} · {o.customer_name} · {o.customer_phone}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(o.status)}`}
            >
              {STATUS_LABEL_KEY[o.status as OrderStatus]
                ? t(STATUS_LABEL_KEY[o.status as OrderStatus])
                : o.status}
            </span>
          </div>
          <p className="mt-2 text-sm">{o.delivery_address}</p>
          <p className="text-sm text-muted-foreground">
            {ETB(o.total)} · {o.payment_method} · {o.payment_status}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {DISPATCHABLE_STATUSES.includes(o.status) && (
              <Button
                size="sm"
                onClick={() => void approveDispatch(o.id, o.customer_id, o.order_code)}
              >
                {t("aop_approve_dispatch")}
              </Button>
            )}
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={o.status}
              onChange={(e) =>
                void update(
                  o.id,
                  { status: e.target.value },
                  o.customer_id,
                  o.order_code,
                  STATUS_LABEL_KEY[e.target.value as OrderStatus]
                    ? t(STATUS_LABEL_KEY[e.target.value as OrderStatus])
                    : e.target.value,
                )
              }
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(STATUS_LABEL_KEY[s])}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={o.rider_id ?? ""}
              onChange={(e) =>
                void update(
                  o.id,
                  {
                    rider_id: e.target.value || null,
                    status: e.target.value ? "rider_assigned" : o.status,
                  },
                  o.customer_id,
                  o.order_code,
                  t("aop_notify_rider_assigned"),
                )
              }
            >
              <option value="">{t("aop_assign_rider")}</option>
              {riders
                .filter((r) => r.is_approved)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.is_online ? t("aop_online_suffix") : ""}
                  </option>
                ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void update(
                  o.id,
                  { payment_status: "paid" },
                  o.customer_id,
                  o.order_code,
                  t("aop_notify_payment_confirmed"),
                )
              }
            >
              Mark paid
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const DISPATCHABLE_STATUSES = ["pending_payment", "pending", "payment_verification"];

/**
 * Dispatch via the approve_and_dispatch RPC; if the function is missing from
 * the live project (404/PGRST202), fall back to a direct status update so
 * admin dispatch never blocks.
 */
async function dispatchOrder(orderId: string) {
  const { error } = await supabase.rpc("approve_and_dispatch", { _order_id: orderId });
  if (!error) return { error: null };
  if (isMissingRpc(error)) {
    const { error: fallbackError } = await supabase
      .from("orders")
      .update({ status: "dispatched", dispatched_at: new Date().toISOString(), rider_id: null })
      .eq("id", orderId);
    return { error: fallbackError };
  }
  return { error };
}

function PaymentsAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: proofs = [] } = useQuery({
    queryKey: ["admin-proofs"],
    queryFn: async () =>
      (await supabase.from("payment_proofs").select("*").order("created_at", { ascending: false }))
        .data ?? [],
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-proofs-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_proofs" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin-proofs"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const review = async (
    id: string,
    orderId: string,
    userId: string,
    status: "approved" | "rejected",
  ) => {
    if (status === "approved") {
      const { error: dispatchError } = await dispatchOrder(orderId);
      if (dispatchError) {
        toast.error(supabaseErrorText(t, dispatchError));
        return;
      }
    }
    const { error } = await supabase.from("payment_proofs").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notify(
      userId,
      t("aop_notify_payment", {
        status: status === "approved" ? t("aop_approved") : t("aop_rejected"),
      }),
      status === "approved"
        ? t("aop_notify_payment_approved_body")
        : t("aop_notify_payment_rejected_body"),
      "payment",
      orderId,
    );
    void qc.invalidateQueries({ queryKey: ["admin-proofs"] });
    void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    toast.success(
      status === "approved" ? t("aop_payment_approved_dispatch") : t("aop_receipt_rejected"),
    );
  };

  return (
    <div className="mt-6 space-y-3">
      {proofs.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("aop_no_receipts")}</p>
      )}
      {proofs.map((p) => (
        <div
          key={p.id}
          className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <StorageImage
            path={p.image_url}
            alt={t("aop_receipt")}
            bucket={PROOF_BUCKET}
            className="h-24 w-24 rounded-lg object-cover"
          />
          <div className="flex-1">
            <p className="font-semibold uppercase">
              {p.method} · {ETB(p.amount ?? 0)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("aop_ref")} {p.reference || "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(p.created_at)} · {p.status}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void review(p.id, p.order_id, p.user_id, "approved")}>
              Approve &amp; Dispatch
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void review(p.id, p.order_id, p.user_id, "rejected")}
            >
              {t("aop_reject")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function useImageUpload(folder: string) {
  return async (file: File | null | undefined) => (file ? uploadImage(file, folder) : null);
}

export function PayoutsAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: payouts = [] } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payout_requests")
        .select("*")
        .order("created_at", { ascending: false });
      const ids = [...new Set((data ?? []).map((p) => p.rider_id))];
      const [{ data: profiles }, { data: riderRows }] = ids.length
        ? await Promise.all([
            supabase.from("profiles").select("id,full_name,phone,avatar_url").in("id", ids),
            supabase
              .from("riders")
              .select("id,payout_method,payout_account,payout_account_name")
              .in("id", ids),
          ])
        : [{ data: [] }, { data: [] }];
      return (data ?? []).map((p) => {
        const riderRow = (riderRows ?? []).find((x) => x.id === p.rider_id);
        const riderProfile = profiles?.find((x) => x.id === p.rider_id);
        return {
          ...p,
          riderName: riderProfile?.full_name || t("aop_rider"),
          riderPhone: riderProfile?.phone ?? "",
          riderAvatar: riderProfile?.avatar_url ?? null,
          payoutDetails: riderRow
            ? `${riderRow.payout_method === "telebirr" ? t("ar_telebirr") : t("aop_bank")}: ${riderRow.payout_account ?? "—"} (${riderRow.payout_account_name ?? "—"})`
            : "",
        };
      });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-payouts-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payout_requests" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin-payouts"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const process = async (
    id: string,
    riderId: string,
    amount: number,
    status: "paid" | "rejected",
  ) => {
    const { error } = await supabase
      .from("payout_requests")
      .update({ status, processed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending");
    if (error) {
      toast.error(error.message);
      return;
    }
    if (status === "paid") {
      await supabase.from("rider_earnings").update({ status: "paid" }).eq("payout_request_id", id);
    } else {
      await supabase
        .from("rider_earnings")
        .update({ status: "pending", payout_request_id: null })
        .eq("payout_request_id", id);
    }
    await notify(
      riderId,
      status === "paid" ? t("aop_notify_payout_sent") : t("aop_notify_payout_rejected"),
      status === "paid"
        ? t("aop_notify_payout_paid_body", { amount: ETB(amount) })
        : t("aop_notify_payout_rejected_body"),
      "payout",
    );
    void qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    toast.success(status === "paid" ? t("aop_payout_paid") : t("aop_payout_rejected"));
  };

  return (
    <div className="mt-6 space-y-3">
      {payouts.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("aop_no_payouts")}</p>
      )}
      {payouts.map((p) => (
        <div
          key={p.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-3">
            <IdentityAvatar path={p.riderAvatar} name={p.riderName} className="h-9 w-9 text-xs" />
            <div>
              <p className="font-semibold">
                {p.riderName} · {ETB(p.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(p.created_at)} · {p.riderPhone}
                {p.payoutDetails ? ` · ${p.payoutDetails}` : ""}
                {p.note ? ` · ${p.note}` : ""}
              </p>
            </div>
          </div>
          {p.status === "pending" ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void process(p.id, p.rider_id, Number(p.amount), "paid")}
              >
                Mark paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void process(p.id, p.rider_id, Number(p.amount), "rejected")}
              >
                {t("aop_reject")}
              </Button>
            </div>
          ) : (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${p.status === "paid" ? "bg-primary-soft text-accent-foreground" : "bg-destructive/10 text-destructive"}`}
            >
              {p.status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function CategoriesAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const upload = useImageUpload("categories");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const image = await upload(file);
      const { error } = await supabase.from("categories").insert({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        image_url: image,
        sort_order: rows.length,
      });
      if (error) throw error;
      setName("");
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success(t("aop_category_added"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aop_failed"));
    }
  };

  const toggle = async (id: string, value: boolean) => {
    await supabase.from("categories").update({ is_active: value }).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
      <form
        onSubmit={create}
        className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card"
      >
        <h3 className="font-display font-bold">{t("aop_new_category")}</h3>
        <Input
          placeholder={t("aop_name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="submit">{t("aop_add_category")}</Button>
      </form>
      <ul className="space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <RowEditor
                table="categories"
                id={c.id}
                name={c.name}
                imagePath={c.image_url}
                folder="categories"
                invalidateKey="admin-categories"
              />
              <Switch checked={c.is_active} onCheckedChange={(v) => void toggle(c.id, v)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShopsAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const upload = useImageUpload("shops");
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    category_id: "",
    delivery_fee: "50",
    delivery_time_min: "30",
  });
  const [file, setFile] = useState<File | null>(null);
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => (await supabase.from("shops").select("*").order("name")).data ?? [],
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const image = await upload(file);
      const { error } = await supabase.from("shops").insert({
        name: form.name,
        description: form.description,
        address: form.address,
        phone: form.phone,
        category_id: form.category_id || null,
        delivery_fee: Number(form.delivery_fee),
        delivery_time_min: Number(form.delivery_time_min),
        image_url: image,
        cover_url: image,
      });
      if (error) throw error;
      setForm({
        name: "",
        description: "",
        address: "",
        phone: "",
        category_id: "",
        delivery_fee: "50",
        delivery_time_min: "30",
      });
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-shops"] });
      toast.success(t("aop_shop_created"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const toggle = async (id: string, patch: Record<string, unknown>) => {
    await supabase
      .from("shops")
      .update(patch as never)
      .eq("id", id);
    void qc.invalidateQueries({ queryKey: ["admin-shops"] });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
      <form
        onSubmit={create}
        className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card"
      >
        <h3 className="font-display font-bold">{t("aop_new_shop")}</h3>
        <Input
          placeholder={t("aop_shop_name")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Textarea
          placeholder={t("aop_description")}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Input
          placeholder={t("aop_address")}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <Input
          placeholder={t("aop_phone")}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
        >
          <option value="">{t("aop_category_placeholder")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder={t("aop_delivery_fee")}
            value={form.delivery_fee}
            onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })}
          />
          <Input
            type="number"
            placeholder={t("aop_minutes")}
            value={form.delivery_time_min}
            onChange={(e) => setForm({ ...form, delivery_time_min: e.target.value })}
          />
        </div>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="submit">{t("aop_create_shop")}</Button>
      </form>
      <ul className="space-y-2">
        {rows.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <RowEditor
                  table="shops"
                  id={s.id}
                  name={s.name}
                  imagePath={s.image_url}
                  folder="shops"
                  invalidateKey="admin-shops"
                  alsoSetCover
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.address} · {ETB(s.delivery_fee)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  {t("aop_online")}
                  <Switch
                    checked={s.is_online}
                    onCheckedChange={(v) => void toggle(s.id, { is_online: v })}
                  />
                </label>
                <label className="flex items-center gap-2">
                  {t("aop_featured")}
                  <Switch
                    checked={s.is_featured}
                    onCheckedChange={(v) => void toggle(s.id, { is_featured: v })}
                  />
                </label>
                <label className="flex items-center gap-2">
                  {t("aop_active")}
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => void toggle(s.id, { is_active: v })}
                  />
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(`${window.location.origin}/shops/${s.id}`);
                    toast.success(t("aop_shop_link_copied"));
                  }}
                >
                  {t("aop_copy_promo_link")}
                </Button>
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                {t("aop_opening_hours")}
              </summary>
              <div className="mt-2">
                <ShopHoursEditor
                  shopId={s.id}
                  fallbackOpen={s.opens_at.slice(0, 5)}
                  fallbackClose={s.closes_at.slice(0, 5)}
                />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductsAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const upload = useImageUpload("products");
  const [form, setForm] = useState({
    shop_id: "",
    name: "",
    description: "",
    price: "",
    discount_percent: "0",
  });
  const [file, setFile] = useState<File | null>(null);
  const { data: shops = [] } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => (await supabase.from("shops").select("*").order("name")).data ?? [],
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200)
      ).data ?? [],
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const image = await upload(file);
      const { error } = await supabase.from("products").insert({
        shop_id: form.shop_id,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        discount_percent: Number(form.discount_percent),
        image_url: image,
      });
      if (error) throw error;
      setForm({
        shop_id: form.shop_id,
        name: "",
        description: "",
        price: "",
        discount_percent: "0",
      });
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(t("aop_product_added"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const toggle = async (id: string, patch: Record<string, unknown>) => {
    await supabase
      .from("products")
      .update(patch as never)
      .eq("id", id);
    void qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
      <form
        onSubmit={create}
        className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card"
      >
        <h3 className="font-display font-bold">{t("aop_new_product")}</h3>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={form.shop_id}
          onChange={(e) => setForm({ ...form, shop_id: e.target.value })}
          required
        >
          <option value="">{t("aop_select_shop")}</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input
          placeholder={t("aop_product_name")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Textarea
          placeholder={t("aop_description")}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            step="0.01"
            placeholder={t("aop_price_etb")}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <Input
            type="number"
            placeholder={t("aop_discount_pct")}
            value={form.discount_percent}
            onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
          />
        </div>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="submit">{t("aop_add_product")}</Button>
      </form>
      <ul className="space-y-2">
        {rows.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <RowEditor
                table="products"
                id={p.id}
                name={p.name}
                imagePath={p.image_url}
                folder="products"
                invalidateKey="admin-products"
                price={Number(p.price)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {shops.find((s) => s.id === p.shop_id)?.name}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                {t("aop_popular")}
                <Switch
                  checked={p.is_popular}
                  onCheckedChange={(v) => void toggle(p.id, { is_popular: v })}
                />
              </label>
              <label className="flex items-center gap-2">
                {t("aop_in_stock")}
                <Switch
                  checked={p.in_stock}
                  onCheckedChange={(v) => void toggle(p.id, { in_stock: v })}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OffersAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const upload = useImageUpload("offers");
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount_type: "percent",
    discount_value: "10",
  });
  const [file, setFile] = useState<File | null>(null);
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () =>
      (await supabase.from("offers").select("*").order("created_at", { ascending: false })).data ??
      [],
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const image = await upload(file);
      const { error } = await supabase.from("offers").insert({
        title: form.title,
        description: form.description,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        image_url: image,
      });
      if (error) throw error;
      setForm({ title: "", description: "", discount_type: "percent", discount_value: "10" });
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-offers"] });
      toast.success(t("aop_offer_created"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
      <form
        onSubmit={create}
        className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card"
      >
        <h3 className="font-display font-bold">{t("aop_new_offer")}</h3>
        <Input
          placeholder={t("aop_title")}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <Textarea
          placeholder={t("aop_description")}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={form.discount_type}
            onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
          >
            <option value="percent">{t("aop_percent")}</option>
            <option value="amount">{t("aop_amount")}</option>
          </select>
          <Input
            type="number"
            value={form.discount_value}
            onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
          />
        </div>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="submit">{t("aop_create_offer")}</Button>
      </form>
      <ul className="space-y-2">
        {rows.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <RowEditor
                table="offers"
                id={o.id}
                name={o.title}
                nameColumn="title"
                imagePath={o.image_url}
                folder="offers"
                invalidateKey="admin-offers"
              />
            </div>
            <Switch
              checked={o.is_active}
              onCheckedChange={async (v) => {
                await supabase.from("offers").update({ is_active: v }).eq("id", o.id);
                void qc.invalidateQueries({ queryKey: ["admin-offers"] });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

const PAYMENT_KEYS: { key: string; labelKey: TranslationKey }[] = [
  { key: "payment_telebirr", labelKey: "pay_telebirr" },
  { key: "payment_cbe", labelKey: "pay_cbe" },
  { key: "payment_boa", labelKey: "pay_boa" },
];

function SettingsAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: settings = {} } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("key,value");
      const map: Record<string, Record<string, string>> = {};
      for (const row of data ?? []) map[row.key] = row.value as Record<string, string>;
      return map;
    },
  });

  const save = async (key: string, value: Record<string, string>) => {
    const { error } = await supabase
      .from("settings")
      .upsert({ key, value, is_public: false }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-settings"] });
    toast.success(t("aop_saved"));
  };

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {PAYMENT_KEYS.map((p) => (
        <PaymentSetting
          key={p.key}
          label={t(p.labelKey)}
          value={(settings[p.key] ?? {}) as Record<string, string>}
          onSave={(v) => void save(p.key, v)}
        />
      ))}
    </div>
  );
}

function PaymentSetting({
  label,
  value,
  onSave,
}: {
  label: string;
  value: Record<string, string>;
  onSave: (v: Record<string, string>) => void;
}) {
  const { t } = useLanguage();
  const [accountName, setAccountName] = useState(value["account_name"] ?? "");
  const [accountNumber, setAccountNumber] = useState(value["account_number"] ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ account_name: accountName, account_number: accountNumber });
      }}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card"
    >
      <h3 className="font-display font-bold">{label}</h3>
      <div className="space-y-1.5">
        <Label>{t("aop_account_name")}</Label>
        <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>{t("aop_account_number")}</Label>
        <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
      </div>
      <Button type="submit" size="sm">
        {t("aop_save")}
      </Button>
    </form>
  );
}

function RowEditor({
  table,
  id,
  name,
  nameColumn = "name",
  imagePath,
  folder,
  invalidateKey,
  price,
  alsoSetCover,
}: {
  table: "categories" | "shops" | "products" | "offers";
  id: string;
  name: string;
  nameColumn?: string;
  imagePath: string | null;
  folder: string;
  invalidateKey: string;
  price?: number;
  alsoSetCover?: boolean;
}) {
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();
  const [value, setValue] = useState(name);
  const [priceValue, setPriceValue] = useState(price != null ? String(price) : "");
  const [saving, setSaving] = useState(false);

  const save = async (file?: File | null) => {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = { [nameColumn]: value.trim().slice(0, 120) };
      if (price != null && priceValue !== "") patch["price"] = Number(priceValue);
      if (file) {
        const path = await uploadImage(file, folder);
        patch["image_url"] = path;
        if (alsoSetCover) patch["cover_url"] = path;
      }
      const { error } = await supabase
        .from(table)
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: [invalidateKey] });
      toast.success(t("aop_saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aop_failed_save"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t("aop_delete_confirm", { name }))) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) {
        const { error: deactivateError } = await supabase
          .from(table)
          .update({ is_active: false } as never)
          .eq("id", id);
        if (deactivateError) throw error;
        toast.success(t("aop_in_use_hidden"));
      } else {
        toast.success(t("aop_deleted"));
      }
      void qc.invalidateQueries({ queryKey: [invalidateKey] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aop_failed_delete"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StorageImage path={imagePath} alt={name} className="h-12 w-12 rounded-md object-cover" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={120}
        className="h-9 w-44"
      />
      {price != null && (
        <Input
          type="number"
          step="0.01"
          value={priceValue}
          onChange={(e) => setPriceValue(e.target.value)}
          className="h-9 w-28"
        />
      )}
      <Input
        type="file"
        accept="image/*"
        className="h-9 w-44 text-xs"
        onChange={(e) => void save(e.target.files?.[0] ?? null)}
      />
      <Button size="sm" variant="outline" disabled={saving} onClick={() => void save(null)}>
        Save
      </Button>
      <Button size="sm" variant="destructive" disabled={deleting} onClick={() => void remove()}>
        {t("aop_delete")}
      </Button>
    </div>
  );
}

function BannersAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    cta_label: "",
    link_url: "",
    placement: "home_top",
    sort_order: "0",
  });
  const [file, setFile] = useState<File | null>(null);
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () =>
      (await supabase.from("banners").select("*").order("placement").order("sort_order")).data ??
      [],
  });
  const { data: bannerShops = [] } = useQuery({
    queryKey: ["admin-banner-shops"],
    queryFn: async () => (await supabase.from("shops").select("id,name").order("name")).data ?? [],
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const image = file ? await uploadImage(file, "banners") : null;
      const { error } = await supabase.from("banners").insert({
        title: form.title.trim().slice(0, 120),
        subtitle: form.subtitle.trim().slice(0, 300) || null,
        cta_label: form.cta_label.trim().slice(0, 60) || null,
        link_url: form.link_url.trim().slice(0, 500) || null,
        placement: form.placement,
        sort_order: Number(form.sort_order) || 0,
        image_url: image,
      });
      if (error) throw error;
      setForm({
        title: "",
        subtitle: "",
        cta_label: "",
        link_url: "",
        placement: form.placement,
        sort_order: "0",
      });
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success(t("aop_banner_created"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const patch = async (id: string, value: Record<string, unknown>) => {
    const { error } = await supabase
      .from("banners")
      .update(value as never)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-banners"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-banners"] });
    toast.success(t("aop_banner_deleted"));
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
      <form
        onSubmit={create}
        className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card"
      >
        <h3 className="font-display font-bold">{t("aop_new_banner")}</h3>
        <Input
          placeholder={t("aop_title")}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <Textarea
          placeholder={t("aop_subtitle")}
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
        />
        <Input
          placeholder={t("aop_button_label")}
          value={form.cta_label}
          onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
        />
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value=""
          onChange={(e) => {
            const s = bannerShops.find((x) => x.id === e.target.value);
            if (!s) return;
            setForm({
              ...form,
              link_url: `/shops/${s.id}`,
              title: form.title || s.name,
              cta_label: form.cta_label || t("aop_order_now"),
            });
          }}
        >
          <option value="">{t("aop_promote_shop")}</option>
          {bannerShops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Input
          placeholder={t("aop_link_placeholder")}
          value={form.link_url}
          onChange={(e) => setForm({ ...form, link_url: e.target.value })}
        />
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={form.placement}
          onChange={(e) => setForm({ ...form, placement: e.target.value })}
        >
          {BANNER_PLACEMENTS.map((p) => (
            <option key={p.value} value={p.value}>
              {t(p.labelKey)}
            </option>
          ))}
        </select>
        <Input
          type="number"
          placeholder={t("aop_order")}
          value={form.sort_order}
          onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
        />
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button type="submit">{t("aop_create_banner")}</Button>
      </form>
      <ul className="space-y-2">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("aop_no_banners")}</p>
        )}
        {rows.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <StorageImage
                path={b.image_url}
                alt={b.title}
                width={200}
                height={120}
                className="h-12 w-20 rounded-md object-cover"
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{b.title}</p>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const p = BANNER_PLACEMENTS.find((x) => x.value === b.placement);
                    return p ? t(p.labelKey) : b.placement;
                  })()}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={b.placement}
                onChange={(e) => void patch(b.id, { placement: e.target.value })}
              >
                {BANNER_PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                defaultValue={b.sort_order}
                className="h-9 w-20"
                onBlur={(e) => void patch(b.id, { sort_order: Number(e.target.value) || 0 })}
              />
              <label className="flex items-center gap-2">
                Active
                <Switch
                  checked={b.is_active}
                  onCheckedChange={(v) => void patch(b.id, { is_active: v })}
                />
              </label>
              <Button size="sm" variant="outline" onClick={() => void remove(b.id)}>
                {t("aop_delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-site-content"],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "site_content")
        .maybeSingle();
      return { ...DEFAULT_CONTENT, ...((row?.value ?? {}) as Partial<SiteContent>) };
    },
  });
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const value = draft ?? data ?? DEFAULT_CONTENT;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean: Record<string, string> = Object.fromEntries(
      CONTENT_FIELDS.map((f) => [
        f.key,
        String(value[f.key] ?? "")
          .trim()
          .slice(0, 500),
      ]),
    );
    clean["logo_url"] = value.logo_url ?? "";
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "site_content", value: clean, is_public: true }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-site-content"] });
    void qc.invalidateQueries({ queryKey: ["site-content"] });
    toast.success(t("aop_site_content_saved"));
  };

  const uploadLogo = async (file?: File | null) => {
    if (!file) return;
    try {
      const path = await uploadImage(file, "branding");
      const next = { ...value, logo_url: path };
      setDraft(next);
      const { error } = await supabase
        .from("settings")
        .upsert(
          { key: "site_content", value: next as never, is_public: true },
          { onConflict: "key" },
        );
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: ["admin-site-content"] });
      void qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success(t("aop_logo_updated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aop_failed_logo"));
    }
  };

  return (
    <form onSubmit={save} className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <StorageImage
          path={value.logo_url || null}
          alt={t("aop_platform_logo")}
          width={160}
          height={160}
          className="h-14 w-14 rounded-lg object-cover"
        />
        <div className="space-y-1.5">
          <Label>{t("aop_platform_logo")}</Label>
          <Input
            type="file"
            accept="image/*"
            className="w-64"
            onChange={(e) => void uploadLogo(e.target.files?.[0] ?? null)}
          />
        </div>
        {value.logo_url && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDraft({ ...value, logo_url: "" })}
          >
            {t("aop_remove_logo")}
          </Button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CONTENT_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{t(f.labelKey)}</Label>
            {f.long ? (
              <Textarea
                value={value[f.key] ?? ""}
                onChange={(e) => setDraft({ ...value, [f.key]: e.target.value })}
              />
            ) : (
              <Input
                value={value[f.key] ?? ""}
                onChange={(e) => setDraft({ ...value, [f.key]: e.target.value })}
                maxLength={200}
              />
            )}
          </div>
        ))}
      </div>
      <Button type="submit">{t("aop_save_all_text")}</Button>
    </form>
  );
}
