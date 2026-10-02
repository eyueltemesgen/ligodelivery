import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Megaphone, Star, Tag, Ticket, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { ETB } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type CouponForm = {
  code: string;
  discount_type: "percent" | "fixed" | "free_delivery";
  discount_value: string;
  min_order_amount: string;
  max_discount: string;
  usage_limit: string;
  expires_at: string;
};
const EMPTY: CouponForm = {
  code: "",
  discount_type: "percent",
  discount_value: "10",
  min_order_amount: "0",
  max_discount: "",
  usage_limit: "",
  expires_at: "",
};

function randomCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "LIGO" + Array.from({ length: 5 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

export function MarketingHub() {
  const qc = useQueryClient();
  const { data: shops = [] } = useQuery({
    queryKey: ["mkt-shops"],
    queryFn: async () =>
      (await supabase.from("shops").select("id,name,is_featured,is_active").order("name")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["mkt-products"],
    queryFn: async () =>
      (
        await supabase
          .from("products")
          .select("id,name,price,discount_percent,is_featured,is_popular,shops(name)")
          .order("name")
      ).data ?? [],
  });
  const { data: coupons = [] } = useQuery({
    queryKey: ["mkt-coupons"],
    queryFn: async () =>
      (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: bannerCount = 0 } = useQuery({
    queryKey: ["mkt-banner-count"],
    queryFn: async () =>
      (await supabase.from("banners").select("id", { count: "exact", head: true }).eq("is_active", true))
        .count ?? 0,
  });

  const [form, setForm] = useState<CouponForm>(EMPTY);
  const [productSearch, setProductSearch] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["mkt-shops"] });
    qc.invalidateQueries({ queryKey: ["mkt-products"] });
    qc.invalidateQueries({ queryKey: ["mkt-coupons"] });
    qc.invalidateQueries({ queryKey: ["shops"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };
  const run = async (p: PromiseLike<{ error: unknown }>, ok?: string) => {
    const { error } = await p;
    if (error) toast.error(supabaseErrorMessage(error));
    else {
      if (ok) toast.success(ok);
      refresh();
    }
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error("Enter a code");
      return;
    }
    await run(
      supabase.from("coupons").insert({
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value || 0),
        min_order_amount: Number(form.min_order_amount || 0),
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      }),
      "Promo code created",
    );
    setForm(EMPTY);
  };

  const featuredShops = shops.filter((s) => s.is_featured).length;
  const deals = products.filter((p) => p.discount_percent > 0).length;
  const redeemed = coupons.reduce((n, c) => n + c.used_count, 0);
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Megaphone, label: "Active banners", v: bannerCount },
          { icon: Star, label: "Featured shops", v: featuredShops },
          { icon: Tag, label: "Products on deal", v: deals },
          { icon: Ticket, label: "Codes redeemed", v: redeemed },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-display text-2xl font-extrabold">{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Ad banners</h2>
          <Button asChild size="sm">
            <Link to="/admin/ops" search={{ tab: "banners" }}>
              Manage banners
            </Link>
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Create banners linked to any shop, choose where they show, and switch them on or off.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-display text-lg font-bold">Featured shops</h2>
        <p className="text-sm text-muted-foreground">
          Featured shops get a badge and appear first on the home and shops pages.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {shops.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <span className="truncate text-sm font-medium">{s.name}</span>
              <Switch
                checked={s.is_featured}
                onCheckedChange={(v) =>
                  run(supabase.from("shops").update({ is_featured: v }).eq("id", s.id))
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Product deals</h2>
          <Input
            className="h-9 max-w-xs"
            placeholder="Search products…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>
        <div className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">
          {filtered.map((p) => {
            const sale = Math.round(Number(p.price) * (100 - p.discount_percent) / 100);
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(p.shops as { name: string } | null)?.name} ·{" "}
                    {p.discount_percent > 0 ? (
                      <>
                        <span className="line-through">{ETB(Number(p.price))}</span>{" "}
                        <span className="font-semibold text-primary">{ETB(sale)}</span>
                      </>
                    ) : (
                      ETB(Number(p.price))
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={90}
                    defaultValue={p.discount_percent}
                    className="h-8 w-16"
                    onBlur={(e) => {
                      const v = Math.min(Math.max(Number(e.target.value || 0), 0), 90);
                      if (v !== p.discount_percent)
                        run(
                          supabase.from("products").update({ discount_percent: v }).eq("id", p.id),
                          "Deal updated",
                        );
                    }}
                  />
                  <span className="text-xs text-muted-foreground">% off</span>
                </div>
                <label className="flex items-center gap-1 text-xs">
                  <Switch
                    checked={p.is_featured}
                    onCheckedChange={(v) =>
                      run(supabase.from("products").update({ is_featured: v }).eq("id", p.id))
                    }
                  />
                  Deal of the day
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <Switch
                    checked={p.is_popular}
                    onCheckedChange={(v) =>
                      run(supabase.from("products").update({ is_popular: v }).eq("id", p.id))
                    }
                  />
                  Trending
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-display text-lg font-bold">Promo codes</h2>
        <form onSubmit={createCoupon} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label>Code</Label>
            <div className="flex gap-1">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="LIGO10"
              />
              <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: randomCode() })}>
                Auto
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.discount_type}
              onChange={(e) =>
                setForm({ ...form, discount_type: e.target.value as CouponForm["discount_type"] })
              }
            >
              <option value="percent">% off</option>
              <option value="fixed">Fixed ETB off</option>
              <option value="free_delivery">Free delivery</option>
            </select>
          </div>
          {form.discount_type !== "free_delivery" && (
            <div className="space-y-1">
              <Label>{form.discount_type === "percent" ? "Percent" : "Amount (ETB)"}</Label>
              <Input type="number" min={0} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Min order (ETB)</Label>
            <Input type="number" min={0} value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Max discount (optional)</Label>
            <Input type="number" min={0} value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Usage limit (optional)</Label>
            <Input type="number" min={1} value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Expires (optional)</Label>
            <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Create code</Button>
          </div>
        </form>

        <ul className="mt-4 space-y-2">
          {coupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2">
              <span className="font-mono text-sm font-bold">{c.code}</span>
              <span className="text-xs text-muted-foreground">
                {c.discount_type === "percent"
                  ? `${c.discount_value}% off`
                  : c.discount_type === "fixed"
                    ? `${ETB(Number(c.discount_value))} off`
                    : "Free delivery"}
                {Number(c.min_order_amount) > 0 && ` · min ${ETB(Number(c.min_order_amount))}`}
                {` · used ${c.used_count}${c.usage_limit ? `/${c.usage_limit}` : ""}`}
                {c.expires_at && ` · until ${new Date(c.expires_at).toLocaleDateString()}`}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Switch
                  checked={c.is_active}
                  onCheckedChange={(v) => run(supabase.from("coupons").update({ is_active: v }).eq("id", c.id))}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete code"
                  onClick={() => {
                    if (confirm(`Delete ${c.code}?`))
                      run(supabase.from("coupons").delete().eq("id", c.id), "Code deleted");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {coupons.length === 0 && <p className="text-sm text-muted-foreground">No promo codes yet.</p>}
        </ul>
      </section>
    </div>
  );
}
