import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BellRing,
  Clock,
  LineChart,
  Megaphone,
  PackageCheck,
  Plus,
  ShieldAlert,
  Store,
  Trash2,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isShopOpenNow } from "@/lib/hours";
import { categoriesQuery, type Product, type Shop } from "@/lib/queries";
import { ETB } from "@/lib/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { playPing } from "@/lib/audio";
import { uploadImage } from "@/lib/media";
import {
  MERCHANT_NEXT_STATUS,
  MERCHANT_STATUS_LABEL,
  PROMOTION_LABEL,
  merchantProfileQuery,
  type MerchantOrder,
  type MerchantPayout,
  type MerchantPromotion,
} from "@/lib/merchant";
import { ShopHoursEditor } from "@/components/ligo/ShopHoursEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "Merchant dashboard — Ligo Delivery" },
      {
        name: "description",
        content:
          "Manage your Ligo shop: live orders, products, opening hours, promotions and earnings.",
      },
      { property: "og:title", content: "Merchant dashboard — Ligo Delivery" },
      { property: "og:description", content: "Run your Ligo store from one dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MerchantPage,
});

function MerchantPage() {
  const { user, loading, isAdmin } = useAuth();
  const { data: merchant, isLoading } = useQuery(merchantProfileQuery(user?.id));

  if (loading || isLoading)
    return <div className="container-ligo py-16 text-muted-foreground">Loading…</div>;

  if (!user)
    return (
      <Notice
        icon={ShieldAlert}
        title="Sign in to your merchant account"
        action={
          <Button asChild>
            <Link to="/merchant/login">Merchant sign-in</Link>
          </Button>
        }
      />
    );

  if (!merchant && !isAdmin)
    return (
      <Notice
        icon={Store}
        title="You don't have a merchant account yet"
        body="Register your shop and the Ligo team will review it."
        action={
          <Button asChild>
            <Link to="/merchant/join">Become a merchant</Link>
          </Button>
        }
      />
    );

  if (merchant && merchant.status !== "approved" && !isAdmin)
    return (
      <Notice
        icon={Clock}
        title={`Application ${MERCHANT_STATUS_LABEL[merchant.status].toLowerCase()}`}
        body={
          merchant.review_notes ??
          (merchant.status === "rejected"
            ? "Please update your details and submit again."
            : "The Ligo team is reviewing your shop. You'll be notified when it's approved.")
        }
        action={
          merchant.status === "rejected" || merchant.status === "pending" ? (
            <Button asChild variant="outline">
              <Link to="/merchant/join">Update my application</Link>
            </Button>
          ) : undefined
        }
      />
    );

  return <MerchantDashboard />;
}

function Notice({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="container-ligo py-16 text-center">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
        <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">{title}</h1>
        {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

function MerchantDashboard() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: merchant } = useQuery(merchantProfileQuery(user?.id));

  const { data: shops = [] } = useQuery<Shop[]>({
    queryKey: ["merchant-shops", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("shops").select("*").order("name");
      if (!isAdmin) q = q.eq("owner_id", user!.id);
      const { data } = await q;
      return (data ?? []) as Shop[];
    },
  });

  const shopIds = useMemo(() => shops.map((s) => s.id), [shops]);
  const shopKey = shopIds.join(",");

  const { data: orders = [] } = useQuery<MerchantOrder[]>({
    queryKey: ["merchant-orders", shopKey],
    enabled: shopIds.length > 0,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id,order_code,status,payment_method,payment_status,subtotal,delivery_fee,tip,total,commission_amount,merchant_net,customer_name,customer_phone,delivery_address,rider_id,shop_id,created_at",
        )
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false })
        .limit(300);
      return (data ?? []) as MerchantOrder[];
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["merchant-products", shopKey],
    enabled: shopIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .in("shop_id", shopIds)
        .order("name");
      return (data ?? []) as Product[];
    },
  });

  const { data: payouts = [] } = useQuery<MerchantPayout[]>({
    queryKey: ["merchant-payouts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_payouts")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as MerchantPayout[];
    },
  });

  const { data: promotions = [] } = useQuery<MerchantPromotion[]>({
    queryKey: ["merchant-promotions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_promotions")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as MerchantPromotion[];
    },
  });

  // Live order feed with an audible ping for new orders.
  const [lastCount, setLastCount] = useState<number | null>(null);
  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status as string),
  );
  useEffect(() => {
    if (lastCount !== null && activeOrders.length > lastCount) {
      const latest = activeOrders[0];
      if (latest) {
        void playPing();
        toast.success(`New order ${latest.order_code}`, {
          description: `Total ${ETB(latest.total)}`,
        });
      }
    }
    setLastCount(activeOrders.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrders.length]);

  useEffect(() => {
    if (shopIds.length === 0) return;
    const channel = supabase
      .channel("merchant-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void qc.invalidateQueries({ queryKey: ["merchant-orders"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, shopIds.length]);

  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const delivered = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const revenue = delivered.reduce((s, o) => s + Number(o.subtotal), 0);
  const commission = delivered.reduce((s, o) => s + Number(o.commission_amount), 0);
  const net = delivered.reduce((s, o) => s + Number(o.merchant_net), 0);
  const paidOut = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.net_amount), 0);
  const aov = delivered.length ? revenue / delivered.length : 0;

  const bestSellers = useMemo(() => {
    const counts = new Map<string, number>();
    delivered.forEach(() => undefined);
    return counts;
  }, [delivered]);
  void bestSellers;

  const advance = async (orderId: string, next: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["merchant-orders"] });
    toast.success(`Order moved to ${STATUS_LABEL[next]}`);
  };

  const toggleOnline = async (shopId: string, value: boolean) => {
    const { error } = await supabase.from("shops").update({ is_online: value }).eq("id", shopId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["merchant-shops"] });
    toast.success(value ? "Store open — customers can order" : "Store closed for new orders");
  };

  return (
    <div className="container-ligo py-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            {merchant?.business_name ?? shops[0]?.name ?? "Merchant dashboard"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live orders, catalog, promotions and earnings for your store.
          </p>
        </div>
        {shops[0] && (
          <label className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
            <span className="text-sm font-medium">
              {shops[0].is_online ? "🟢 Store open" : "⚫ Store closed"}
            </span>
            <Switch
              checked={shops[0].is_online}
              onCheckedChange={(v) => void toggleOnline(shops[0]!.id, v)}
            />
          </label>
        )}
      </header>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="flex w-full flex-nowrap overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">
            <BellRing className="mr-1.5 h-4 w-4" /> Orders ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="products">
            <PackageCheck className="mr-1.5 h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="promotions">
            <Megaphone className="mr-1.5 h-4 w-4" /> Promote
          </TabsTrigger>
          <TabsTrigger value="earnings">
            <Wallet className="mr-1.5 h-4 w-4" /> Earnings
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Today's orders" value={String(todays.length)} />
            <Stat
              label="Today's sales"
              value={ETB(todays.reduce((s, o) => s + Number(o.total), 0))}
            />
            <Stat label="Active orders" value={String(activeOrders.length)} />
            <Stat label="Completed" value={String(delivered.length)} />
            <Stat label="Cancelled" value={String(cancelled.length)} />
            <Stat label="Products" value={String(products.length)} />
            <Stat label="Average order" value={ETB(aov)} />
            <Stat label="Net earnings" value={ETB(net)} />
          </div>
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <LineChart className="h-4 w-4 text-primary" /> Last 7 days
            </h2>
            <WeeklyBars orders={orders} />
          </section>
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders" className="mt-6 space-y-3">
          {activeOrders.length === 0 ? (
            <Empty text="No active orders right now. New orders appear here instantly." />
          ) : (
            activeOrders.map((o) => {
              const next = MERCHANT_NEXT_STATUS[o.status];
              return (
                <article
                  key={o.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-bold">
                        {o.order_code}
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {o.payment_method} · {o.payment_status}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {o.customer_name ?? "Customer"} · {o.customer_phone ?? "—"} ·{" "}
                        {new Date(o.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {o.delivery_address && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {o.delivery_address}
                        </p>
                      )}
                      <OrderLines orderId={o.id} />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-display text-lg font-bold">{ETB(o.total)}</span>
                      {next ? (
                        <Button size="sm" onClick={() => void advance(o.id, next.to)}>
                          {next.label}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Waiting on the rider / Ligo team
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </TabsContent>

        {/* PRODUCTS */}
        <TabsContent value="products" className="mt-6 space-y-3">
          <ProductManager shopId={shops[0]?.id} products={products} />
        </TabsContent>

        {/* SHOP */}
        <TabsContent value="shop" className="mt-6 space-y-6">
          {shops.map((s) => (
            <ShopEditor key={s.id} shop={s} />
          ))}
          {shops.length === 0 && <Empty text="No shop is linked to your account yet." />}
        </TabsContent>

        {/* PROMOTIONS */}
        <TabsContent value="promotions" className="mt-6 space-y-4">
          <PromotionPanel
            merchantId={user!.id}
            shopId={shops[0]?.id ?? null}
            products={products}
            promotions={promotions}
          />
        </TabsContent>

        {/* EARNINGS */}
        <TabsContent value="earnings" className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total sales (delivered)" value={ETB(revenue)} />
            <Stat
              label={`Ligo commission (${Number(merchant?.commission_percent ?? 10)}%)`}
              value={ETB(commission)}
            />
            <Stat label="Your net amount" value={ETB(net)} />
            <Stat label="Paid out" value={ETB(paidOut)} />
          </div>
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Payout history</h2>
            {payouts.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No payouts recorded yet. Ligo settles merchant balances manually.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2">Date</th>
                      <th>Gross</th>
                      <th>Commission</th>
                      <th>Net</th>
                      <th>Status</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td>{ETB(p.gross_amount)}</td>
                        <td>{ETB(p.commission_amount)}</td>
                        <td className="font-semibold">{ETB(p.net_amount)}</td>
                        <td className="capitalize">{p.status}</td>
                        <td>{p.reference ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function WeeklyBars({ orders }: { orders: MerchantOrder[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const total = orders
      .filter((o) => new Date(o.created_at).toDateString() === key)
      .reduce((s, o) => s + Number(o.total), 0);
    return { label: d.toLocaleDateString([], { weekday: "short" }), total };
  });
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <div className="mt-4 flex h-32 items-end gap-2">
      {days.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-primary/80"
            style={{ height: `${(d.total / max) * 100}%`, minHeight: 3 }}
            title={ETB(d.total)}
          />
          <span className="text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function OrderLines({ orderId }: { orderId: string }) {
  const { data: items = [] } = useQuery({
    queryKey: ["merchant-order-items", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("id,product_name,quantity,unit_price")
        .eq("order_id", orderId);
      return (data ?? []) as {
        id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
      }[];
    },
  });
  if (items.length === 0) return null;
  return (
    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.id}>
          {i.quantity} × {i.product_name} — {ETB(i.unit_price * i.quantity)}
        </li>
      ))}
    </ul>
  );
}

type ProductDraft = {
  id?: string;
  name: string;
  description: string;
  price: string;
  discount_percent: string;
  category_id: string;
  in_stock: boolean;
  is_active: boolean;
};

const emptyDraft: ProductDraft = {
  name: "",
  description: "",
  price: "",
  discount_percent: "0",
  category_id: "",
  in_stock: true,
  is_active: true,
};

function ProductManager({ shopId, products }: { shopId: string | undefined; products: Product[] }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!shopId) return <Empty text="No shop linked yet — products appear once your shop is live." />;

  const openNew = () => {
    setDraft(emptyDraft);
    setImage(null);
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setDraft({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      discount_percent: String(p.discount_percent),
      category_id: p.category_id ?? "",
      in_stock: p.in_stock,
      is_active: true,
    });
    setImage(null);
    setOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setBusy(true);
    try {
      const imagePath = image ? await uploadImage(image, `merchants/${user!.id}`) : undefined;
      const payload = {
        shop_id: shopId,
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        price,
        discount_percent: Number(draft.discount_percent) || 0,
        category_id: draft.category_id || null,
        in_stock: draft.in_stock,
        ...(imagePath ? { image_url: imagePath } : {}),
      };
      const { error } = draft.id
        ? await supabase.from("products").update(payload).eq("id", draft.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
      toast.success(draft.id ? "Product updated" : "Product added");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["merchant-products"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the product");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product deleted");
    void qc.invalidateQueries({ queryKey: ["merchant-products"] });
  };

  const setStock = async (id: string, inStock: boolean) => {
    const { error } = await supabase.from("products").update({ in_stock: inStock }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["merchant-products"] });
  };

  return (
    <>
      <div className="flex justify-between gap-3">
        <p className="text-sm text-muted-foreground">{products.length} products</p>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" /> Add product
        </Button>
      </div>

      {products.length === 0 ? (
        <Empty text="No products yet — add your first item so customers can order." />
      ) : (
        products.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <button
              type="button"
              onClick={() => openEdit(p)}
              className="min-w-0 flex-1 text-left"
              aria-label={`Edit ${p.name}`}
            >
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {ETB(p.price)}
                {p.discount_percent > 0 && ` · ${p.discount_percent}% off`}
              </p>
            </button>
            <label className="flex items-center gap-2 text-sm">
              <span className={p.in_stock ? "text-primary" : "text-muted-foreground"}>
                {p.in_stock ? "In stock" : "Out of stock"}
              </span>
              <Switch checked={p.in_stock} onCheckedChange={(v) => void setStock(p.id, v)} />
            </label>
            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
              Edit
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete ${p.name}`}
              onClick={() => void remove(p.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Price (ETB)</Label>
                <Input
                  inputMode="decimal"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input
                  inputMode="numeric"
                  value={draft.discount_percent}
                  onChange={(e) => setDraft({ ...draft, discount_percent: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={draft.category_id}
                onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Product image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={draft.in_stock}
                onCheckedChange={(v) => setDraft({ ...draft, in_stock: v })}
              />
              Available for ordering
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : "Save product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShopEditor({ shop }: { shop: Shop }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState(shop.name);
  const [description, setDescription] = useState(shop.description ?? "");
  const [phone, setPhone] = useState(shop.phone ?? "");
  const [address, setAddress] = useState(shop.address ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("shops")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      })
      .eq("id", shop.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Shop details saved");
    void qc.invalidateQueries({ queryKey: ["merchant-shops"] });
  };

  const uploadShopImage = async (file: File, field: "image_url" | "cover_url") => {
    try {
      const path = await uploadImage(file, `merchants/${user!.id}`);
      const { error } = await supabase
        .from("shops")
        .update({ [field]: path })
        .eq("id", shop.id);
      if (error) throw error;
      toast.success("Image updated");
      void qc.invalidateQueries({ queryKey: ["merchant-shops"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the image");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{shop.name}</h2>
          <p className="text-sm text-muted-foreground">
            {isShopOpenNow(shop) ? "Open for orders right now" : "Currently closed for orders"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Shop name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadShopImage(f, "image_url");
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cover image</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadShopImage(f, "cover_url");
            }}
          />
        </div>
      </div>
      <Button className="mt-4" onClick={() => void save()} disabled={busy}>
        {busy ? "Saving…" : "Save shop details"}
      </Button>

      <h3 className="mt-6 font-display text-base font-bold">Weekly opening hours</h3>
      <div className="mt-3">
        <ShopHoursEditor
          shopId={shop.id}
          fallbackOpen={shop.opens_at.slice(0, 5)}
          fallbackClose={shop.closes_at.slice(0, 5)}
        />
      </div>
    </section>
  );
}

function PromotionPanel({
  merchantId,
  shopId,
  products,
  promotions,
}: {
  merchantId: string;
  shopId: string | null;
  products: Product[];
  promotions: MerchantPromotion[];
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<MerchantPromotion["kind"]>("featured_shop");
  const [productId, setProductId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setBusy(true);
    const { error } = await supabase.from("merchant_promotions").insert({
      merchant_id: merchantId,
      shop_id: shopId,
      product_id: kind === "featured_product" ? productId || null : null,
      kind,
      message: message.trim() || null,
      status: "pending",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessage("");
    toast.success("Promotion request sent to the Ligo team");
    void qc.invalidateQueries({ queryKey: ["merchant-promotions"] });
  };

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Promote your business</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Request premium placement on Ligo. The Ligo team reviews each request and sets the price.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Promotion type</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as MerchantPromotion["kind"])}
            >
              {Object.entries(PROMOTION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          {kind === "featured_product" && (
            <div className="space-y-1.5">
              <Label>Product</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Message to the Ligo team (optional)</Label>
            <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <Button className="mt-4" onClick={() => void request()} disabled={busy}>
          {busy ? "Sending…" : "Send promotion request"}
        </Button>
      </section>

      {promotions.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Your requests</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {promotions.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2">
                <span>{PROMOTION_LABEL[p.kind]}</span>
                <span className="capitalize text-muted-foreground">
                  {p.status}
                  {p.price != null && ` · ${ETB(p.price)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
