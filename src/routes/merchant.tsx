import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, PackageCheck, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MerchantGate } from "@/components/auth/guards";
import { isShopOpenNow } from "@/lib/hours";
import type { Product, Shop } from "@/lib/queries";
import { ETB } from "@/lib/format";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders";
import { ShopHoursEditor } from "@/components/ligo/ShopHoursEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "Merchant portal — Ligo Delivery" },
      {
        name: "description",
        content: "Manage your shop's orders, catalog, hours and availability on Ligo.",
      },
      { property: "og:title", content: "Merchant portal — Ligo Delivery" },
      { property: "og:description", content: "Run your Ligo store." },
    ],
  }),
  component: MerchantPage,
});

function MerchantPage() {
  return (
    <MerchantGate>
      <MerchantPortal />
    </MerchantGate>
  );
}

type MerchantOrder = {
  id: string;
  order_code: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  tip: number;
  delivery_fee: number;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
};

const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  confirmed: { to: "preparing", label: "Accept & start preparing" },
  preparing: { to: "ready_for_pickup", label: "Mark ready for pickup" },
  pending_payment: { to: "preparing", label: "Accept & start preparing" },
  pending: { to: "preparing", label: "Accept & start preparing" },
  payment_verification: { to: "preparing", label: "Accept & start preparing" },
};

function MerchantPortal() {
  const { user, isMerchant, isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const { data: shops = [] } = useQuery<Shop[]>({
    queryKey: ["merchant-shops", user?.id, isAdmin],
    enabled: !!user && (isMerchant || isAdmin),
    queryFn: async () => {
      let q = supabase.from("shops").select("*").order("name");
      if (!isAdmin) q = q.eq("owner_id", user!.id);
      const { data } = await q;
      return (data ?? []) as Shop[];
    },
  });

  const shopIds = shops.map((s) => s.id);

  // Real-time incoming orders across the merchant's shops.
  const { data: orders = [] } = useQuery<MerchantOrder[]>({
    queryKey: ["merchant-orders", shopIds],
    enabled: shopIds.length > 0,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id,order_code,status,total,subtotal,tip,delivery_fee,customer_name,customer_phone,created_at",
        )
        .in("shop_id", shopIds)
        .not("status", "in", '("delivered","cancelled")')
        .order("created_at", { ascending: false });
      return (data ?? []) as MerchantOrder[];
    },
  });

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

  // Catalog / inventory manager.
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["merchant-products", shopIds],
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

  if (loading || !user || (!isMerchant && !isAdmin)) {
    return <div className="container-ligo py-16 text-muted-foreground">Loading…</div>;
  }

  const toggleOnline = async (shopId: string, value: boolean) => {
    const { error } = await supabase.from("shops").update({ is_online: value }).eq("id", shopId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["merchant-shops"] });
    toast.success(
      value ? "Shop is online — customers can order" : "Shop is offline — checkout is locked",
    );
  };

  const advanceOrder = async (orderId: string, next: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", orderId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["merchant-orders"] });
    toast.success(`Order moved to ${STATUS_LABEL[next]}`);
  };

  const setStock = async (productId: string, inStock: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ in_stock: inStock })
      .eq("id", productId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["merchant-products"] });
  };

  return (
    <div className="container-ligo py-10">
      <h1 className="font-display text-3xl font-extrabold">Merchant portal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage incoming orders, your catalog and store availability.
      </p>

      {shops.length === 0 && (
        <div className="mt-8 max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-card">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No shop linked to your account yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The Ligo team will link your shop after reviewing your registration.
          </p>
        </div>
      )}

      {shops.length > 0 && (
        <Tabs defaultValue="orders" className="mt-8">
          <TabsList>
            <TabsTrigger value="orders">
              <BellRing className="mr-1.5 h-4 w-4" /> Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="catalog">
              <PackageCheck className="mr-1.5 h-4 w-4" /> Catalog
            </TabsTrigger>
            <TabsTrigger value="store">Store settings</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6 space-y-4">
            {orders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No active orders right now. New orders will appear here in real time.
              </p>
            ) : (
              orders.map((o) => {
                const next = NEXT_STATUS[o.status];
                return (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
                  >
                    <div>
                      <p className="font-display font-bold">
                        {o.order_code}{" "}
                        <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {o.customer_name ?? "Customer"} · {o.customer_phone ?? "—"} ·{" "}
                        {new Date(o.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-lg font-bold">{ETB(o.total)}</span>
                      {next && (
                        <Button size="sm" onClick={() => void advanceOrder(o.id, next.to)}>
                          {next.label}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="catalog" className="mt-6 space-y-3">
            {products.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No products yet — the Ligo team can import your menu.
              </p>
            ) : (
              products.map((p) => <CatalogRow key={p.id} product={p} onStockChange={setStock} />)
            )}
          </TabsContent>

          <TabsContent value="store" className="mt-6 space-y-6">
            {shops.map((s) => (
              <section
                key={s.id}
                className="rounded-xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold">{s.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {isShopOpenNow(s)
                        ? "Open for orders right now"
                        : "Currently closed for orders"}
                    </p>
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                    <span className="text-sm font-medium">
                      {s.is_online ? "Online" : "Offline"}
                    </span>
                    <Switch
                      checked={s.is_online}
                      onCheckedChange={(v) => void toggleOnline(s.id, v)}
                    />
                  </label>
                </div>
                <h3 className="mt-5 font-display text-base font-bold">Weekly opening hours</h3>
                <div className="mt-3">
                  <ShopHoursEditor
                    shopId={s.id}
                    fallbackOpen={s.opens_at.slice(0, 5)}
                    fallbackClose={s.closes_at.slice(0, 5)}
                  />
                </div>
              </section>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function CatalogRow({
  product,
  onStockChange,
}: {
  product: Product;
  onStockChange: (id: string, inStock: boolean) => Promise<void>;
}) {
  const qc = useQueryClient();
  const [price, setPrice] = useState(String(product.price));
  const [saving, setSaving] = useState(false);

  const savePrice = async () => {
    const value = Number(price);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid price");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").update({ price: value }).eq("id", product.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Price updated");
    void qc.invalidateQueries({ queryKey: ["merchant-products"] });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        <p className="text-xs text-muted-foreground">{ETB(product.price)}</p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="decimal"
          className="h-8 w-24 text-sm"
          aria-label="Price"
        />
        <Button size="sm" variant="outline" disabled={saving} onClick={() => void savePrice()}>
          Save
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <span className={product.in_stock ? "text-primary" : "text-muted-foreground"}>
          {product.in_stock ? "In stock" : "Out of stock"}
        </span>
        <Switch
          checked={product.in_stock}
          onCheckedChange={(v) => void onStockChange(product.id, v)}
        />
      </label>
    </div>
  );
}
