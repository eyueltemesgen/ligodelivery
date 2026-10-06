import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { AlertTriangle, Copy, Lock, MapPin } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { ETB } from "@/lib/format";
import { supabaseErrorText } from "@/lib/supa-error";
import { closedReasonKey, isShopOpenNow } from "@/lib/hours";
import { addressesQuery, type AddressRow } from "@/lib/account";
import { quoteDeliveryFee, DELIVERY_FAILURE_KEY, formatDistance } from "@/lib/delivery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { publicSettingsQuery, shopHoursQuery, shopQuery } from "@/lib/queries";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";

const METHODS: { id: string; labelKey: TranslationKey; icon: string }[] = [
  { id: "cash", labelKey: "pay_cash", icon: "💵" },
  { id: "telebirr", labelKey: "pay_telebirr", icon: "📱" },
  { id: "cbe", labelKey: "pay_cbe", icon: "🏦" },
];

const TIP_PRESETS = [0, 10, 20, 30, 50];

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: translations.en.meta_checkout_title },
      {
        name: "description",
        content: translations.en.meta_checkout_desc,
      },
      { property: "og:title", content: translations.en.meta_checkout_title },
      { property: "og:description", content: translations.en.meta_checkout_og_desc },
    ],
  }),
  component: CheckoutPage,
});

type FeeState =
  | { status: "loading" }
  | { status: "ready"; distance: number; fee: number; rule: string }
  | { status: "error"; reason: TranslationKey };

function CheckoutPage() {
  const { items, subtotal, shopId, shopName, clear } = useCart();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: shop } = useQuery({ ...shopQuery(shopId ?? ""), enabled: !!shopId });
  const { data: hours = [] } = useQuery({ ...shopHoursQuery(shopId ?? ""), enabled: !!shopId });
  const { data: publicSettings } = useQuery(publicSettingsQuery);
  const { data: savedAddresses = [] } = useQuery(addressesQuery(user?.id));
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [method, setMethod] = useState("cash");
  const [tip, setTip] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fee, setFee] = useState<FeeState>({ status: "loading" });
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Prefill from the customer's default saved address once it loads.
  useEffect(() => {
    if (selectedAddressId || savedAddresses.length === 0) return;
    const def = savedAddresses.find((a) => a.is_default) ?? savedAddresses[0];
    if (!def) return;
    applyAddress(def);
  }, [savedAddresses, selectedAddressId]);

  const applyAddress = (a: AddressRow) => {
    setSelectedAddressId(a.id);
    setAddress([a.address, a.area, a.city].filter(Boolean).join(", "));
    setInstructions(a.instructions ?? "");
    setLat(a.lat);
    setLng(a.lng);
    if (a.full_name) setName(a.full_name);
    if (a.phone) setPhone(a.phone);
  };

  const chooseAddress = (a: AddressRow) => applyAddress(a);

  const platform = (publicSettings?.["platform"] ?? {}) as {
    base_delivery_fee?: number;
    surge_multiplier?: number;
  };
  const surge = Math.max(Number(platform.surge_multiplier ?? 1), 1);
  const flatFallback = Math.round(
    Number(shop?.delivery_fee ?? platform.base_delivery_fee ?? 50) * surge,
  );

  // Recalculate the delivery fee whenever the destination changes. The number
  // always comes from the server; the client never invents a fee.
  useEffect(() => {
    let cancelled = false;
    if (!shopId) return;
    setFee({ status: "loading" });
    void quoteDeliveryFee(shopId, lat, lng).then((q) => {
      if (cancelled) return;
      if (q.ok) {
        setFee({ status: "ready", distance: q.distance, fee: q.deliveryFee, rule: q.pricingRule });
      } else if (q.flatFee != null && q.reason !== "outside_service_area") {
        // Shop not geolocated yet → keep the legacy flat fee, but never for an
        // explicitly out-of-area location.
        setFee({ status: "ready", distance: 0, fee: q.flatFee, rule: "flat" });
      } else if (q.reason === "error") {
        // Engine/RPC not deployed yet: preserve the previous flat-fee checkout.
        setFee({ status: "ready", distance: 0, fee: flatFallback, rule: "flat" });
      } else {
        setFee({ status: "error", reason: DELIVERY_FAILURE_KEY[q.reason] });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [shopId, lat, lng, flatFallback]);

  const deliveryFee = fee.status === "ready" ? fee.fee : 0;
  const feeUnavailable = fee.status === "error";
  const promoDiscount = promo?.discount ?? 0;
  const total = Math.max(subtotal + deliveryFee + tip - promoDiscount, 0);

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setCheckingPromo(true);
    const { data, error } = await supabase.rpc("check_coupon", {
      p_code: code,
      p_subtotal: subtotal,
      p_delivery_fee: deliveryFee,
    });
    setCheckingPromo(false);
    if (error) {
      toast.error(supabaseErrorText(t, error));
      return;
    }
    const r = data as { valid: boolean; message: string; code?: string; discount?: number };
    if (!r.valid) {
      setPromo(null);
      toast.error(r.message);
      return;
    }
    setPromo({ code: r.code ?? code, discount: Number(r.discount ?? 0) });
    toast.success(t("checkout_promo_applied_toast", { amount: ETB(Number(r.discount ?? 0)) }));
  };
  const shopLoaded = !shopId || !!shop;
  const shopOpen = shopLoaded ? isShopOpenNow(shop ?? {}, hours) : false;

  if (!user)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">{t("checkout_sign_in_title")}</h1>
        <Button asChild className="mt-6">
          <Link to="/login">{t("auth_sign_in")}</Link>
        </Button>
      </div>
    );

  if (items.length === 0)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">{t("cart_empty_title")}</h1>
        <Button asChild className="mt-6">
          <Link to="/shops">{t("cart_browse")}</Link>
        </Button>
      </div>
    );

  if (shopLoaded && !shopOpen)
    return (
      <div className="container-ligo py-16 text-center">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-extrabold">
            {t("checkout_closed_title", { shop: shopName ?? "" })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("checkout_closed_note", { reason: t(closedReasonKey(shop ?? {}, hours)) })}
          </p>
          <Button asChild className="mt-6">
            <Link to="/shops">{t("cart_browse")}</Link>
          </Button>
        </div>
      </div>
    );

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isShopOpenNow(shop ?? {}, hours)) {
      toast.error(t("checkout_closed_toast"));
      return;
    }
    if (feeUnavailable) {
      toast.error(t(fee.status === "error" ? fee.reason : "delivery_err_generic"));
      return;
    }
    setBusy(true);
    try {
      // Server-side placement: prices, options, distance, fee and totals are
      // recomputed in the database. Coordinates are only a hint, not a fee.
      const { data: orderId, error } = await supabase.rpc("place_order", {
        p_shop_id: shopId!,
        p_items: items.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
          option_ids: i.options.map((o) => o.id),
        })),
        p_payment_method: method,
        p_customer_name: name.trim(),
        p_customer_phone: phone.trim(),
        p_delivery_address: address.trim(),
        p_delivery_instructions: instructions.trim(),
        p_tip: tip,
        p_lat: lat as number,
        p_lng: lng as number,
        ...(promo ? { p_coupon_code: promo.code } : {}),
      });
      if (error) throw error;

      clear();
      toast.success(t("checkout_order_placed"));
      await navigate({ to: "/orders/$orderId", params: { orderId: orderId as string } });
    } catch (err) {
      toast.error(supabaseErrorText(t, err));
    } finally {
      setBusy(false);
    }
  };

  const canProceed = !!(name.trim() && phone.trim() && address.trim()) && !feeUnavailable;
  const payDetails = Object.entries(
    (publicSettings?.[`payment_${method}`] ?? {}) as Record<string, unknown>,
  ).filter(([k, v]) => k !== "enabled" && k !== "instructions" && v != null && v !== "");
  const copyText = (value: string, label: string) => {
    void navigator.clipboard?.writeText(value);
    toast.success(t("od_copied", { label }));
  };

  return (
    <form
      onSubmit={placeOrder}
      className="container-ligo grid gap-8 py-10 lg:grid-cols-[1fr_340px]"
    >
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-extrabold">{t("checkout_heading")}</h1>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{t("checkout_delivery_details")}</h2>

            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t("checkout_saved_addresses")}
                  </Label>
                  <Link
                    to="/account/addresses"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {t("checkout_manage")}
                  </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {savedAddresses.map((a) => {
                    const active = selectedAddressId === a.id;
                    return (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => chooseAddress(a)}
                        className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                          active
                            ? "border-primary bg-primary-soft"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase">
                            {a.label}
                          </span>
                          {a.is_default && (
                            <span className="text-[10px] font-semibold text-primary">
                              {t("checkout_default")}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-muted-foreground">
                          {a.address}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="n">{t("checkout_full_name")}</Label>
                <Input id="n" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p">{t("checkout_phone")}</Label>
                <Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a">{t("checkout_address")}</Label>
              <Input
                id="a"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setSelectedAddressId(null);
                }}
                required
                placeholder={t("checkout_address_placeholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="i">{t("checkout_notes")}</Label>
              <Textarea
                id="i"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t("checkout_notes_placeholder")}
              />
            </div>

            <DeliveryStatus fee={fee} flatFallback={flatFallback} />

            {lat == null || lng == null ? (
              <p className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("checkout_pin_hint")}
              </p>
            ) : null}

          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{t("checkout_payment_method")}</h2>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center text-xs font-semibold transition-colors ${method === m.id ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40"}`}
                >
                  <span className="text-xl" aria-hidden>{m.icon}</span>
                  {t(m.labelKey)}
                </button>
              ))}
            </div>
            {method === "cash" ? (
              <p className="rounded-lg bg-primary-soft p-3 text-xs font-medium">
                💵 {ETB(total)}
              </p>
            ) : (
              <div className="space-y-2 rounded-lg bg-secondary/60 p-3 text-sm">
                {payDetails.length > 0 ? (
                  payDetails.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <span className="text-xs capitalize text-muted-foreground">
                        {k.replace(/_/g, " ")}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(String(v), k.replace(/_/g, " "))}
                        className="flex items-center gap-1 font-semibold hover:text-primary"
                      >
                        {String(v)} <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{t("checkout_total")}</span>
                  <button
                    type="button"
                    onClick={() => copyText(String(total), t("checkout_total"))}
                    className="flex items-center gap-1 font-semibold hover:text-primary"
                  >
                    {ETB(total)} <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{t("checkout_payment_note")}</p>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">{t("checkout_rider_tip")}</h2>
            <div className="flex flex-wrap gap-2">
              {TIP_PRESETS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setTip(amount)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    tip === amount
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  {amount === 0 ? t("checkout_no_tip") : ETB(amount)}
                </button>
              ))}
            </div>
          </section>
      </div>

      <aside className="h-fit space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">{t("checkout_order_summary")}</h2>
        <p className="text-xs text-muted-foreground">{shopName}</p>
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.lineId} className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {i.quantity} × {i.name}
                {i.options.length > 0 && (
                  <span className="block text-xs">{i.options.map((o) => o.name).join(" · ")}</span>
                )}
              </span>
              <span>{ETB(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span>{t("cart_subtotal")}</span>
            <span>{ETB(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>
              {surge > 1 ? t("checkout_delivery_surge", { surge }) : t("checkout_delivery")}
            </span>
            <span>{fee.status === "ready" ? ETB(fee.fee) : "—"}</span>
          </div>
          {fee.status === "ready" && fee.distance > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("checkout_delivery_distance", { km: formatDistance(fee.distance) })}
            </p>
          )}
          {tip > 0 && (
            <div className="flex justify-between">
              <span>{t("checkout_rider_tip")}</span>
              <span>{ETB(tip)}</span>
            </div>
          )}
          {promo && (
            <div className="flex justify-between text-primary">
              <span>{t("checkout_promo", { code: promo.code })}</span>
              <span>−{ETB(promoDiscount)}</span>
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="promo" className="text-xs">
              {t("checkout_promo_q")}
            </Label>
            {promo ? (
              <div className="flex items-center justify-between rounded-md border border-primary bg-primary-soft px-3 py-2 text-xs font-semibold">
                <span>{t("checkout_promo_applied", { code: promo.code })}</span>
                <button type="button" className="underline" onClick={() => setPromo(null)}>
                  {t("checkout_remove")}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="promo"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder={t("checkout_promo_placeholder")}
                  className="h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={checkingPromo}
                  onClick={applyPromo}
                >
                  {checkingPromo ? "…" : t("checkout_apply")}
                </Button>
              </div>
            )}
          </div>
          <div className="mt-2 flex justify-between font-display text-base font-bold">
            <span>{t("checkout_total")}</span>
            <span>{ETB(total)}</span>
          </div>
        </div>
        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-border bg-card p-4 lg:static lg:m-0 lg:border-0 lg:p-0">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || !canProceed}
          >
            {busy ? t("checkout_placing") : `${t("checkout_place_order")} · ${ETB(total)}`}
          </Button>
        </div>
      </aside>
    </form>
  );
}

function DeliveryStatus({ fee, flatFallback }: { fee: FeeState; flatFallback: number }) {
  const { t } = useLanguage();
  if (fee.status === "loading")
    return (
      <p className="rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
        {t("delivery_calculating")}
      </p>
    );
  if (fee.status === "error")
    return (
      <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t(fee.reason)}
      </p>
    );
  return (
    <p className="flex items-center justify-between rounded-lg bg-primary-soft p-3 text-xs font-medium text-accent-foreground">
      <span>
        {fee.distance > 0
          ? t("checkout_delivery_distance", { km: formatDistance(fee.distance) })
          : t("delivery_flat_note")}
      </span>
      <span className="font-bold">{ETB(fee.fee || flatFallback)}</span>
    </p>
  );
}
