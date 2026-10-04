import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { ETB } from "@/lib/format";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { closedReason, isShopOpenNow } from "@/lib/hours";
import { addressesQuery } from "@/lib/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { publicSettingsQuery, shopHoursQuery, shopQuery } from "@/lib/queries";
import { useLanguage } from "@/hooks/useLanguage";
import { translations, type TranslationKey } from "@/lib/i18n";

const METHODS: { id: string; labelKey: TranslationKey }[] = [
  { id: "cash", labelKey: "pay_cash" },
  { id: "mobile_money", labelKey: "pay_mobile_money" },
  { id: "telebirr", labelKey: "pay_telebirr" },
  { id: "cbe", labelKey: "pay_cbe" },
  { id: "chapa", labelKey: "pay_chapa" },
  { id: "boa", labelKey: "pay_boa" },
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

function CheckoutPage() {
  const { items, subtotal, shopId, shopName, clear } = useCart();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: shop } = useQuery({ ...shopQuery(shopId ?? ""), enabled: !!shopId });
  const { data: hours = [] } = useQuery({ ...shopHoursQuery(shopId ?? ""), enabled: !!shopId });
  const { data: publicSettings } = useQuery(publicSettingsQuery);
  const { data: savedAddresses = [] } = useQuery(addressesQuery(user?.id));
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [method, setMethod] = useState("cash");
  const [tip, setTip] = useState(0);
  const [busy, setBusy] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Prefill from the customer's default saved address once it loads.
  useEffect(() => {
    if (selectedAddressId || savedAddresses.length === 0) return;
    const def = savedAddresses.find((a) => a.is_default) ?? savedAddresses[0];
    if (!def) return;
    setSelectedAddressId(def.id);
    setAddress([def.address, def.area, def.city].filter(Boolean).join(", "));
    setInstructions(def.instructions ?? "");
    if (def.full_name) setName(def.full_name);
    if (def.phone) setPhone(def.phone);
  }, [savedAddresses, selectedAddressId]);

  const chooseAddress = (a: (typeof savedAddresses)[number]) => {
    setSelectedAddressId(a.id);
    setAddress([a.address, a.area, a.city].filter(Boolean).join(", "));
    setInstructions(a.instructions ?? "");
    if (a.full_name) setName(a.full_name);
    if (a.phone) setPhone(a.phone);
  };

  const platform = (publicSettings?.["platform"] ?? {}) as {
    base_delivery_fee?: number;
    surge_multiplier?: number;
  };
  const surge = Math.max(Number(platform.surge_multiplier ?? 1), 1);
  const deliveryFee = Math.round(
    Number(shop?.delivery_fee ?? platform.base_delivery_fee ?? 50) * surge,
  );
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
      toast.error(supabaseErrorMessage(error));
      return;
    }
    const r = data as { valid: boolean; message: string; code?: string; discount?: number };
    if (!r.valid) {
      setPromo(null);
      toast.error(r.message);
      return;
    }
    setPromo({ code: r.code ?? code, discount: Number(r.discount ?? 0) });
    toast.success(`Promo applied — you save ${ETB(Number(r.discount ?? 0))}`);
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
            {t("checkout_closed_note", { reason: closedReason(shop ?? {}, hours) })}
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
    setBusy(true);
    try {
      // Server-side placement: prices, fees and totals are recomputed in the database.
      const { data: orderId, error } = await supabase.rpc("place_order", {
        p_shop_id: shopId!,
        p_items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        p_payment_method: method,
        p_customer_name: name.trim(),
        p_customer_phone: phone.trim(),
        p_delivery_address: address.trim(),
        p_delivery_instructions: instructions.trim(),
        p_tip: tip,
        ...(promo ? { p_coupon_code: promo.code } : {}),
      });
      if (error) throw error;

      clear();
      toast.success(t("checkout_order_placed"));
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
          <h1 className="font-display text-3xl font-extrabold">{t("checkout_heading")}</h1>
          <ol className="mt-3 flex items-center gap-2 text-xs font-semibold">
            <li className={step === 1 ? "text-primary" : "text-muted-foreground"}>
              {t("checkout_step1")}
            </li>
            <li className="text-muted-foreground">→</li>
            <li className={step === 2 ? "text-primary" : "text-muted-foreground"}>
              {t("checkout_step2")}
            </li>
          </ol>
        </div>

        {step === 1 && (
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
            <Button
              type="button"
              className="w-full"
              disabled={!canProceed}
              onClick={() => setStep(2)}
            >
              {t("checkout_continue_payment")}
            </Button>
          </section>
        )}

        {step === 2 && (
          <>
            <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-display text-lg font-bold">{t("checkout_payment_method")}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {METHODS.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`rounded-lg border px-4 py-3 text-left text-sm font-medium ${method === m.id ? "border-primary bg-primary-soft" : "border-border"}`}
                  >
                    {t(m.labelKey)}
                  </button>
                ))}
              </div>
              {method !== "cash" && (
                <p className="text-xs text-muted-foreground">{t("checkout_payment_note")}</p>
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

            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              {t("checkout_back")}
            </Button>
          </>
        )}
      </div>

      <aside className="h-fit space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">{t("checkout_order_summary")}</h2>
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
            <span>{t("cart_subtotal")}</span>
            <span>{ETB(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>
              {surge > 1 ? t("checkout_delivery_surge", { surge }) : t("checkout_delivery")}
            </span>
            <span>{ETB(deliveryFee)}</span>
          </div>
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
        {step === 2 && (
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? t("checkout_placing") : t("checkout_place_order")}
          </Button>
        )}
      </aside>
    </form>
  );
}
