import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ETB, formatDate } from "@/lib/format";
import { ORDER_STATUSES, STATUS_LABEL, statusTone, notify, type OrderStatus } from "@/lib/orders";
import { PROOF_BUCKET, StorageImage, uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Ligo Delivery" },
      { name: "description", content: "Manage Ligo orders, payments, riders, shops, products and offers." },
      { property: "og:title", content: "Admin dashboard — Ligo Delivery" },
      { property: "og:description", content: "Operations console for Ligo Delivery." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  if (loading) return <div className="container-ligo py-16 text-muted-foreground">Loading…</div>;
  if (!user)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sign in as an admin</h1>
        <Button asChild className="mt-6"><Link to="/auth" search={{ mode: "login", role: "customer" }}>Sign in</Link></Button>
      </div>
    );
  if (!isAdmin) return <div className="container-ligo py-16 text-center font-display text-xl font-bold">Admins only.</div>;

  return (
    <div className="container-ligo py-10">
      <h1 className="font-display text-3xl font-extrabold">Admin dashboard</h1>
      <Stats />
      <Tabs defaultValue="orders" className="mt-8">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="riders">Riders</TabsTrigger>
          <TabsTrigger value="shops">Shops</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><OrdersAdmin /></TabsContent>
        <TabsContent value="payments"><PaymentsAdmin /></TabsContent>
        <TabsContent value="riders"><RidersAdmin /></TabsContent>
        <TabsContent value="shops"><ShopsAdmin /></TabsContent>
        <TabsContent value="products"><ProductsAdmin /></TabsContent>
        <TabsContent value="categories"><CategoriesAdmin /></TabsContent>
        <TabsContent value="offers"><OffersAdmin /></TabsContent>
        <TabsContent value="settings"><SettingsAdmin /></TabsContent>
      </Tabs>
    </div>
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

function Stats() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [orders, shops, products, proofs] = await Promise.all([
        supabase.from("orders").select("total,status"),
        supabase.from("shops").select("id"),
        supabase.from("products").select("id"),
        supabase.from("payment_proofs").select("id,status"),
      ]);
      const list = orders.data ?? [];
      return {
        orders: list.length,
        revenue: list.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0),
        active: list.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
        shops: shops.data?.length ?? 0,
        products: products.data?.length ?? 0,
        pendingProofs: (proofs.data ?? []).filter((p) => p.status === "pending").length,
      };
    },
  });
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <Card label="Orders" value={data?.orders ?? 0} />
      <Card label="Active" value={data?.active ?? 0} />
      <Card label="Revenue" value={ETB(data?.revenue ?? 0)} />
      <Card label="Shops" value={data?.shops ?? 0} />
      <Card label="Products" value={data?.products ?? 0} />
      <Card label="Pending receipts" value={data?.pendingProofs ?? 0} />
    </div>
  );
}

function OrdersAdmin() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
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
        name: profiles?.find((p) => p.id === r.id)?.full_name || "Rider",
        phone: profiles?.find((p) => p.id === r.id)?.phone ?? "",
      }));
    },
  });

  const update = async (id: string, patch: Record<string, unknown>, customerId: string, code: string, message: string) => {
    const { error } = await supabase.from("orders").update(patch as never).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notify(customerId, `Order ${code}`, message, "order", id);
    void qc.invalidateQueries({ queryKey: ["admin-orders"] });
    toast.success("Order updated");
  };

  return (
    <div className="mt-6 space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display font-bold">{o.order_code}</p>
              <p className="text-xs text-muted-foreground">{formatDate(o.created_at)} · {o.customer_name} · {o.customer_phone}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(o.status)}`}>
              {STATUS_LABEL[o.status as OrderStatus] ?? o.status}
            </span>
          </div>
          <p className="mt-2 text-sm">{o.delivery_address}</p>
          <p className="text-sm text-muted-foreground">{ETB(o.total)} · {o.payment_method} · {o.payment_status}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={o.status}
              onChange={(e) => void update(o.id, { status: e.target.value }, o.customer_id, o.order_code, STATUS_LABEL[e.target.value as OrderStatus] ?? e.target.value)}
            >
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={o.rider_id ?? ""}
              onChange={(e) => void update(o.id, { rider_id: e.target.value || null, status: e.target.value ? "rider_assigned" : o.status }, o.customer_id, o.order_code, "A rider has been assigned to your order.")}
            >
              <option value="">Assign rider…</option>
              {riders.filter((r) => r.is_approved).map((r) => (
                <option key={r.id} value={r.id}>{r.name}{r.is_online ? " (online)" : ""}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => void update(o.id, { payment_status: "paid" }, o.customer_id, o.order_code, "Payment confirmed.")}>
              Mark paid
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsAdmin() {
  const qc = useQueryClient();
  const { data: proofs = [] } = useQuery({
    queryKey: ["admin-proofs"],
    queryFn: async () => (await supabase.from("payment_proofs").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const review = async (id: string, orderId: string, userId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("payment_proofs").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (status === "approved") {
      await supabase.from("orders").update({ payment_status: "paid", status: "confirmed" }).eq("id", orderId);
    }
    await notify(userId, "Payment " + status, status === "approved" ? "Your payment was verified." : "Your receipt was rejected. Please re-submit.", "payment", orderId);
    void qc.invalidateQueries({ queryKey: ["admin-proofs"] });
    toast.success(`Receipt ${status}`);
  };

  return (
    <div className="mt-6 space-y-3">
      {proofs.length === 0 && <p className="text-sm text-muted-foreground">No receipts submitted.</p>}
      {proofs.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <StorageImage path={p.image_url} alt="Receipt" bucket={PROOF_BUCKET} className="h-24 w-24 rounded-lg object-cover" />
          <div className="flex-1">
            <p className="font-semibold uppercase">{p.method} · {ETB(p.amount ?? 0)}</p>
            <p className="text-sm text-muted-foreground">Ref: {p.reference || "—"}</p>
            <p className="text-xs text-muted-foreground">{formatDate(p.created_at)} · {p.status}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void review(p.id, p.order_id, p.user_id, "approved")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => void review(p.id, p.order_id, p.user_id, "rejected")}>Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RidersAdmin() {
  const qc = useQueryClient();
  const { data: riders = [] } = useQuery({
    queryKey: ["admin-riders-full"],
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("*");
      const ids = (data ?? []).map((r) => r.id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id,full_name,phone,email").in("id", ids)
        : { data: [] };
      return (data ?? []).map((r) => ({ ...r, profile: profiles?.find((p) => p.id === r.id) }));
    },
  });

  const approve = async (id: string, value: boolean) => {
    const { error } = await supabase.from("riders").update({ is_approved: value }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notify(id, value ? "Rider approved" : "Rider access paused", value ? "You can now accept deliveries." : "Contact the Ligo team.", "rider");
    void qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
  };

  return (
    <div className="mt-6 space-y-3">
      {riders.length === 0 && <p className="text-sm text-muted-foreground">No rider applications yet.</p>}
      {riders.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-card">
          <div>
            <p className="font-semibold">{r.profile?.full_name || "Rider"}</p>
            <p className="text-sm text-muted-foreground">{r.profile?.phone} · {r.vehicle_type} · ID {r.national_id || "—"}</p>
            <p className="text-xs text-muted-foreground">{r.is_online ? "Online" : "Offline"}</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            Approved
            <Switch checked={r.is_approved} onCheckedChange={(v) => void approve(r.id, v)} />
          </label>
        </div>
      ))}
    </div>
  );
}

function useImageUpload(folder: string) {
  return async (file: File | null | undefined) => (file ? uploadImage(file, folder) : null);
}

function CategoriesAdmin() {
  const qc = useQueryClient();
  const upload = useImageUpload("categories");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const image = await upload(file);
      const { error } = await supabase.from("categories").insert({
        name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), image_url: image, sort_order: rows.length,
      });
      if (error) throw error;
      setName(""); setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const toggle = async (id: string, value: boolean) => {
    await supabase.from("categories").update({ is_active: value }).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["admin-categories"] });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
      <form onSubmit={create} className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="font-display font-bold">New category</h3>
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="submit">Add category</Button>
      </form>
      <ul className="space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <span className="font-medium">{c.name}</span>
            <Switch checked={c.is_active} onCheckedChange={(v) => void toggle(c.id, v)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShopsAdmin() {
  const qc = useQueryClient();
  const upload = useImageUpload("shops");
  const [form, setForm] = useState({ name: "", description: "", address: "", phone: "", category_id: "", delivery_fee: "50", delivery_time_min: "30" });
  const [file, setFile] = useState<File | null>(null);
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => (await supabase.from("shops").select("*").order("name")).data ?? [],
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
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
      setForm({ name: "", description: "", address: "", phone: "", category_id: "", delivery_fee: "50", delivery_time_min: "30" });
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-shops"] });
      toast.success("Shop created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const toggle = async (id: string, patch: Record<string, unknown>) => {
    await supabase.from("shops").update(patch as never).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["admin-shops"] });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="font-display font-bold">New shop</h3>
        <Input placeholder="Shop name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Category…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder="Delivery fee" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} />
          <Input type="number" placeholder="Minutes" value={form.delivery_time_min} onChange={(e) => setForm({ ...form, delivery_time_min: e.target.value })} />
        </div>
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="submit">Create shop</Button>
      </form>
      <ul className="space-y-2">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.address} · {ETB(s.delivery_fee)}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">Featured<Switch checked={s.is_featured} onCheckedChange={(v) => void toggle(s.id, { is_featured: v })} /></label>
              <label className="flex items-center gap-2">Active<Switch checked={s.is_active} onCheckedChange={(v) => void toggle(s.id, { is_active: v })} /></label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductsAdmin() {
  const qc = useQueryClient();
  const upload = useImageUpload("products");
  const [form, setForm] = useState({ shop_id: "", name: "", description: "", price: "", discount_percent: "0" });
  const [file, setFile] = useState<File | null>(null);
  const { data: shops = [] } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => (await supabase.from("shops").select("*").order("name")).data ?? [],
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
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
      setForm({ shop_id: form.shop_id, name: "", description: "", price: "", discount_percent: "0" });
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const toggle = async (id: string, patch: Record<string, unknown>) => {
    await supabase.from("products").update(patch as never).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="font-display font-bold">New product</h3>
        <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.shop_id} onChange={(e) => setForm({ ...form, shop_id: e.target.value })} required>
          <option value="">Select shop…</option>
          {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <Input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" step="0.01" placeholder="Price ETB" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <Input type="number" placeholder="Discount %" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
        </div>
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="submit">Add product</Button>
      </form>
      <ul className="space-y-2">
        {rows.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{ETB(p.price)} · {shops.find((s) => s.id === p.shop_id)?.name}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">Popular<Switch checked={p.is_popular} onCheckedChange={(v) => void toggle(p.id, { is_popular: v })} /></label>
              <label className="flex items-center gap-2">In stock<Switch checked={p.in_stock} onCheckedChange={(v) => void toggle(p.id, { in_stock: v })} /></label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OffersAdmin() {
  const qc = useQueryClient();
  const upload = useImageUpload("offers");
  const [form, setForm] = useState({ title: "", description: "", discount_type: "percent", discount_value: "10" });
  const [file, setFile] = useState<File | null>(null);
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => (await supabase.from("offers").select("*").order("created_at", { ascending: false })).data ?? [],
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
      toast.success("Offer created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={create} className="h-fit space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="font-display font-bold">New offer</h3>
        <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
            <option value="percent">Percent</option>
            <option value="amount">Amount</option>
          </select>
          <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
        </div>
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="submit">Create offer</Button>
      </form>
      <ul className="space-y-2">
        {rows.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <span className="font-medium">{o.title}</span>
            <Switch checked={o.is_active} onCheckedChange={async (v) => {
              await supabase.from("offers").update({ is_active: v }).eq("id", o.id);
              void qc.invalidateQueries({ queryKey: ["admin-offers"] });
            }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const PAYMENT_KEYS = [
  { key: "payment_telebirr", label: "Telebirr" },
  { key: "payment_cbe", label: "CBE" },
  { key: "payment_boa", label: "Bank of Abyssinia" },
];

function SettingsAdmin() {
  const qc = useQueryClient();
  const { data: settings = {} } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("key,value");
      const map: Record<string, any> = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return map;
    },
  });

  const save = async (key: string, value: Record<string, string>) => {
    const { error } = await supabase.from("settings").upsert({ key, value, is_public: false }, { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-settings"] });
    toast.success("Saved");
  };

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {PAYMENT_KEYS.map((p) => (
        <PaymentSetting key={p.key} label={p.label} value={(settings[p.key] ?? {}) as Record<string, string>} onSave={(v) => void save(p.key, v)} />
      ))}
    </div>
  );
}

function PaymentSetting({ label, value, onSave }: { label: string; value: Record<string, string>; onSave: (v: Record<string, string>) => void }) {
  const [accountName, setAccountName] = useState(value['account_name'] ?? "");
  const [accountNumber, setAccountNumber] = useState(value['account_number'] ?? "");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave({ account_name: accountName, account_number: accountNumber }); }}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card"
    >
      <h3 className="font-display font-bold">{label}</h3>
      <div className="space-y-1.5">
        <Label>Account name</Label>
        <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Account number</Label>
        <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
      </div>
      <Button type="submit" size="sm">Save</Button>
    </form>
  );
}
