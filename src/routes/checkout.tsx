import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { ETB } from "@/lib/format";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { closedReason, isShopOpenNow } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { publicSettingsQuery, shopHoursQuery, shopQuery } from "@/lib/queries";

const METHODS = [
  { id: "cash", label: "Cash on delivery" },
  { id: "mobile_money", label: "Mobile Money" },
  { id: "telebirr", label: "Telebirr" },
  { id: "cbe", label: "CBE Birr" },
  { id: "chapa", label: "Chapa" },
  { id: "boa", label: "Bank of Abyssinia" },
];

const TIP_PRESETS = [0, 10, 20, 30, 50];

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
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [method, setMethod] = useState("cash");
  const [tip, setTip] = useState(0);
  const [busy, setBusy] = useState(false);

  const platform = (publicSettings?.["platform"] ?? {}) as {
    base_delivery_fee?: number;
    surge_multiplier?: number;
  };
  const surge = Math.max(Number(platform.surge_multiplier ?? 1), 1);
  const deliveryFee = Math.round(
    Number(shop?.delivery_fee ?? platform.base_delivery_fee ?? 50) * surge,
  );
  const total = subtotal + deliveryFee + tip;
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
      // Server-side placement: prices, fees and totals are recomputed in the database.
      const { data: orderId, error } = await supabase.rpc("place_order", {
        p_shop_id: shopId!,
        p_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        p_payment_method: method,
        p_customer_name: name.trim() || undefined,
        p_customer_phone: phone.trim() || undefined,
        p_delivery_address: address.trim() || undefined,
        p_delivery_instructions: instructions.trim() || undefined,
        p_tip: tip,
      });
      if (error) throw error;

      clear();
      toast.success("Order placed — awaiting payment verification");
      await navigate({ to: "/orders/$orderId", params: { orderId: orderId as string } });
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canProceed = name.trim() && phone.trim() && address.trim();

  return (
    <form
      onSubmit={placeOrder}
      className="container-ligo grid gap-8 py-10 lg:grid-cols-[1fr_340px]"
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Checkout</h1>
          <ol className="mt-3 flex items-center gap-2 text-xs font-semibold">
            <li className={step === 1 ? "text-primary" : "text-muted-foreground"}>
              1 · Delivery details
            </li>
            <li className="text-muted-foreground">→</li>
            <li className={step === 2 ? "text-primary" : "text-muted-foreground"}>
              2 · Payment & tip
            </li>
          </ol>
        </div>

        {step === 1 && (
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
              <Label htmlFor="i">Rider delivery notes (optional)</Label>
              <Textarea
                id="i"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. call when you arrive, gate code…"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!canProceed}
              onClick={() => setStep(2)}
            >
              Continue to payment
            </Button>
          </section>
        )}

        {step === 2 && (
          <>
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

            <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-display text-lg font-bold">Rider tip</h2>
              <div className="flex flex-wrap gap-2">
                {TIP_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTip(t)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      tip === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    {t === 0 ? "No tip" : ETB(t)}
                  </button>
                ))}
              </div>
            </section>

            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              ← Back to delivery details
            </Button>
          </>
        )}
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
          {tip > 0 && (
            <div className="flex justify-between">
              <span>Rider tip</span>
              <span>{ETB(tip)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between font-display text-base font-bold">
            <span>Total</span>
            <span>{ETB(total)}</span>
          </div>
        </div>
        {step === 2 && (
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Placing order…" : "Place order"}
          </Button>
        )}
      </aside>
    </form>
  );
}
