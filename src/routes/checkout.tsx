import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ETB } from "@/lib/format";
import { closedReason, isShopOpenNow } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { publicSettingsQuery, shopHoursQuery, shopQuery } from "@/lib/queries";

const METHODS = [
  { id: "cash", label: "Cash on delivery" },
  { id: "telebirr", label: "Telebirr" },
  { id: "cbe", label: "CBE Birr" },
  { id: "chapa", label: "Chapa" },
  { id: "boa", label: "Bank of Abyssinia" },
];

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Ligo Delivery Bishoftu" },
      {
        name: "description",
        content: "Confirm your delivery address and payment method to place your Ligo order.",
      },
      { property: "og:title", content: "Checkout — Ligo Delivery" },
      { property: "og:description", content: "Place your Ligo Delivery order in Bishoftu." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, shopId, shopName, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: shop } = useQuery({ ...shopQuery(shopId ?? ""), enabled: !!shopId });
  const { data: hours = [] } = useQuery({ ...shopHoursQuery(shopId ?? ""), enabled: !!shopId });
  const { data: publicSettings } = useQuery(publicSettingsQuery);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);

  const platform = (publicSettings?.["platform"] ?? {}) as {
    base_delivery_fee?: number;
    surge_multiplier?: number;
  };
  const surge = Math.max(Number(platform.surge_multiplier ?? 1), 1);
  const deliveryFee = Math.round(
    Number(shop?.delivery_fee ?? platform.base_delivery_fee ?? 50) * surge,
  );
  const total = subtotal + deliveryFee;
  const shopLoaded = !shopId || !!shop;
  const shopOpen = shopLoaded ? isShopOpenNow(shop ?? {}, hours) : false;

  if (!user)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sign in to place your order</h1>
        <Button asChild className="mt-6">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );

  if (items.length === 0)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Your cart is empty</h1>
        <Button asChild className="mt-6">
          <Link to="/shops">Browse shops</Link>
        </Button>
      </div>
    );

  if (shopLoaded && !shopOpen)
    return (
      <div className="container-ligo py-16 text-center">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-extrabold">
            {shopName} is closed right now
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {closedReason(shop ?? {}, hours)} Checkout is locked until the shop reopens — your cart
            is saved.
          </p>
          <Button asChild className="mt-6">
            <Link to="/shops">Browse open shops</Link>
          </Button>
        </div>
      </div>
    );

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isShopOpenNow(shop ?? {}, hours)) {
      toast.error("This shop is closed right now — checkout is locked.");
      return;
    }
    setBusy(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          shop_id: shopId,
          status: "pending_payment",
          payment_method: method,
          delivery_pin: String(Math.floor(1000 + Math.random() * 9000)),
          payment_status: "unpaid",
          subtotal,
          delivery_fee: deliveryFee,
          total,
          customer_name: name,
          customer_phone: phone,
          delivery_address: address,
          delivery_instructions: instructions,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((i) => ({
          order_id: order.id,
          product_id: i.productId,
          product_name: i.name,
          image_url: i.imagePath,
          unit_price: i.unitPrice,
          quantity: i.quantity,
        })),
      );
      if (itemsError) throw itemsError;

      clear();
      toast.success("Order placed — awaiting payment verification");
      await navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={placeOrder}
      className="container-ligo grid gap-8 py-10 lg:grid-cols-[1fr_340px]"
    >
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-extrabold">Checkout</h1>
        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Delivery details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="n">Full name</Label>
              <Input id="n" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p">Phone</Label>
              <Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a">Delivery address in Bishoftu</Label>
            <Input
              id="a"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="Kebele, landmark, house no."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i">Instructions (optional)</Label>
            <Textarea
              id="i"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Payment method</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`rounded-lg border px-4 py-3 text-left text-sm font-medium ${method === m.id ? "border-primary bg-primary-soft" : "border-border"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {method !== "cash" && (
            <p className="text-xs text-muted-foreground">
              After placing the order you'll see the account details and can upload your payment
              receipt for verification.
            </p>
          )}
        </section>
      </div>

      <aside className="h-fit space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Order summary</h2>
        <p className="text-xs text-muted-foreground">{shopName}</p>
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {i.quantity} × {i.name}
              </span>
              <span>{ETB(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{ETB(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery{surge > 1 ? ` (surge ×${surge})` : ""}</span>
            <span>{ETB(deliveryFee)}</span>
          </div>
          <div className="mt-2 flex justify-between font-display text-base font-bold">
            <span>Total</span>
            <span>{ETB(total)}</span>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Placing order…" : "Place order"}
        </Button>
      </aside>
    </form>
  );
}
