import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Check } from "lucide-react";
import type { Service, ServiceRequestAddon } from "@/lib/special-moments";
import {
  CATERING_TYPES,
  DECORATION_TYPES,
  GIFT_TYPES,
  HOLIDAY_OCCASIONS,
  OCCASIONS,
  OPTION_LABEL_KEY,
  SURPRISE_TYPES,
  createServiceRequest,
  placeServiceOrder,
  serviceAddonsQuery,
} from "@/lib/special-moments";
import { ETB } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import type { TranslationKey } from "@/lib/i18n";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS: { id: string; labelKey: TranslationKey }[] = [
  { id: "cash", labelKey: "pay_cash" },
  { id: "mobile_money", labelKey: "pay_mobile_money" },
  { id: "telebirr", labelKey: "pay_telebirr" },
  { id: "cbe", labelKey: "pay_cbe" },
  { id: "chapa", labelKey: "pay_chapa" },
  { id: "boa", labelKey: "pay_boa" },
];

const occasionOptionsFor = (slug: string) =>
  slug === "holiday-gifts" ? HOLIDAY_OCCASIONS : OCCASIONS;

const typeOptionsFor = (slug: string) => {
  if (slug === "surprises") return SURPRISE_TYPES;
  if (slug === "catering") return CATERING_TYPES;
  if (slug === "decoration") return DECORATION_TYPES;
  if (slug === "gifts" || slug === "holiday-gifts") return GIFT_TYPES;
  return null;
};

const typeFieldLabelKey = (slug: string, isQuote: boolean): TranslationKey => {
  if (slug === "surprises") return "srd_type_surprise";
  if (slug === "catering") return "srd_type_catering";
  if (slug === "decoration") return "srd_type_decoration";
  if (slug === "gifts" || slug === "holiday-gifts") return "srd_type_gift";
  return isQuote ? "srd_type_service" : "srd_type";
};

export function ServiceRequestDialog({
  service,
  categorySlug,
  open,
  onOpenChange,
}: {
  service: Service;
  categorySlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isQuote = service.pricing_type === "quote";
  const { data: addons = [] } = useQuery(serviceAddonsQuery(service.id));

  const [customerName, setCustomerName] = useState(profile?.full_name ?? "");
  const [customerPhone, setCustomerPhone] = useState(profile?.phone ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [occasion, setOccasion] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState("");
  const [foodPreferences, setFoodPreferences] = useState("");
  const [instructions, setInstructions] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<ServiceRequestAddon[]>([]);
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const name = profile?.full_name;
    const phone = profile?.phone;
    if (name) setCustomerName((v) => v || name);
    if (phone) setCustomerPhone((v) => v || phone);
  }, [profile]);

  const typeOptions = typeOptionsFor(categorySlug);
  const isSurprise = categorySlug === "surprises";
  const isEvent = categorySlug === "catering" || categorySlug === "decoration";

  const toggleAddon = (addon: ServiceRequestAddon) => {
    setSelectedAddons((cur) =>
      cur.some((a) => a.name === addon.name)
        ? cur.filter((a) => a.name !== addon.name)
        : [...cur, addon],
    );
  };

  const addonsTotal = selectedAddons.reduce((s, a) => s + Number(a.price ?? 0), 0);
  const basePrice = service.price ?? 0;
  const bookingTotal = !isQuote ? basePrice + addonsTotal : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error(t("srd_err_contact"));
      return;
    }
    if (isEvent && !eventDate) {
      toast.error(t("srd_err_date"));
      return;
    }
    setBusy(true);
    try {
      const requestId = await createServiceRequest(user.id, {
        serviceId: service.id,
        requestType: isQuote ? "quote" : "booking",
        customerName,
        customerPhone,
        recipientName: isSurprise || categorySlug === "gifts" ? recipientName : undefined,
        recipientPhone,
        isAnonymous: isSurprise ? isAnonymous : false,
        occasion,
        surpriseType: isSurprise ? typeValue : undefined,
        eventType: isEvent ? typeValue : undefined,
        eventDate: eventDate || undefined,
        eventTime: eventTime || undefined,
        location,
        guestCount: guestCount ? Number(guestCount) : null,
        message,
        theme,
        foodPreferences,
        specialInstructions: instructions,
        budget: budget ? Number(budget) : null,
        addons: selectedAddons,
      });

      if (isQuote) {
        toast.success(t("srd_sent"));
        onOpenChange(false);
        await navigate({
          to: "/account/service-requests/$requestId",
          params: { requestId },
        });
        return;
      }

      const orderId = await placeServiceOrder(requestId, method, {
        name: customerName,
        phone: customerPhone,
        address: location || undefined,
        instructions,
      });
      toast.success(t("srd_booked"));
      onOpenChange(false);
      await navigate({ to: "/orders/$orderId", params: { orderId } });
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto p-5 sm:w-full">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold">
            {isQuote ? t("srd_title_quote") : t("srd_title_book")}
          </DialogTitle>
          <DialogDescription>
            {service.name} · {isQuote ? t("srd_desc_quote") : t("srd_desc_book")}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{t("srd_signin_note")}</p>
            <Button asChild className="w-full">
              <Link to="/login">{t("srd_signin")}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sm-name">{t("srd_your_name")}</Label>
                <Input
                  id="sm-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-phone">{t("srd_your_phone")}</Label>
                <Input
                  id="sm-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {(isSurprise || categorySlug === "gifts") && (
              <fieldset className="space-y-4 rounded-lg border border-border p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {isSurprise ? t("srd_recipient_reveal") : t("srd_recipient")}
                </legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sm-recipient">{t("srd_recipient_name")}</Label>
                    <Input
                      id="sm-recipient"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={t("srd_recipient_name_ph")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sm-recipient-phone">{t("srd_recipient_contact")}</Label>
                    <Input
                      id="sm-recipient-phone"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder={t("srd_recipient_contact_ph")}
                    />
                  </div>
                </div>
                {isSurprise && (
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={isAnonymous}
                      onCheckedChange={(v) => setIsAnonymous(v === true)}
                      className="mt-0.5"
                    />
                    <span>
                      {t("srd_anon")}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {t("srd_anon_note")}
                      </span>
                    </span>
                  </label>
                )}
              </fieldset>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sm-occasion">{t("srd_occasion")}</Label>
                <Input
                  id="sm-occasion"
                  list="sm-occasions"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder={t("srd_occasion_ph")}
                />
                <datalist id="sm-occasions">
                  {occasionOptionsFor(categorySlug).map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-type">{t(typeFieldLabelKey(categorySlug, isQuote))}</Label>
                {typeOptions ? (
                  <Select value={typeValue} onValueChange={setTypeValue}>
                    <SelectTrigger id="sm-type">
                      <SelectValue placeholder={t("srd_choose_one")} />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {t(OPTION_LABEL_KEY[opt] ?? "srd_type")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="sm-type"
                    value={typeValue}
                    onChange={(e) => setTypeValue(e.target.value)}
                    placeholder={t("srd_type_ph")}
                  />
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sm-date">
                  {isEvent ? t("srd_event_date") : t("srd_preferred_date")}
                  {isEvent && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id="sm-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required={isEvent}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-time">{t("srd_preferred_time")}</Label>
                <Input
                  id="sm-time"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sm-location">{t("srd_location")}</Label>
              <Input
                id="sm-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("srd_location_ph")}
              />
            </div>

            {isEvent && (
              <div className="space-y-1.5">
                <Label htmlFor="sm-guests">{t("srd_guests")}</Label>
                <Input
                  id="sm-guests"
                  type="number"
                  min={1}
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                />
              </div>
            )}

            {categorySlug === "catering" && (
              <div className="space-y-1.5">
                <Label htmlFor="sm-food">{t("srd_food")}</Label>
                <Textarea
                  id="sm-food"
                  value={foodPreferences}
                  onChange={(e) => setFoodPreferences(e.target.value)}
                  placeholder={t("srd_food_ph")}
                />
              </div>
            )}

            {categorySlug === "decoration" && (
              <div className="space-y-1.5">
                <Label htmlFor="sm-theme">{t("srd_theme")}</Label>
                <Input
                  id="sm-theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder={t("srd_theme_ph")}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="sm-message">
                {isSurprise ? t("srd_message_recipient") : t("srd_message")}
              </Label>
              <Textarea
                id="sm-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("srd_message_ph")}
              />
            </div>

            {isQuote && (
              <div className="space-y-1.5">
                <Label htmlFor="sm-budget">{t("srd_budget")}</Label>
                <Input
                  id="sm-budget"
                  type="number"
                  min={0}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={t("srd_budget_ph")}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="sm-instructions">{t("srd_instructions")}</Label>
              <Textarea
                id="sm-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={t("srd_instructions_ph")}
              />
            </div>

            {addons.length > 0 && (
              <div className="space-y-2">
                <Label>{t("srd_addons")}</Label>
                <ul className="space-y-2">
                  {addons.map((a) => {
                    const active = selectedAddons.some((x) => x.name === a.name);
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => toggleAddon({ name: a.name, price: Number(a.price) })}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                            active ? "border-primary bg-primary-soft" : "border-border",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "grid h-5 w-5 place-items-center rounded border",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border",
                              )}
                            >
                              {active && <Check className="h-3.5 w-3.5" />}
                            </span>
                            <span>
                              {a.name}
                              {a.description && (
                                <span className="block text-xs text-muted-foreground">
                                  {a.description}
                                </span>
                              )}
                            </span>
                          </span>
                          <span className="font-semibold">{ETB(a.price)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {!isQuote && (
              <div className="space-y-2">
                <Label>{t("srd_payment")}</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left text-sm font-medium",
                        method === m.id ? "border-primary bg-primary-soft" : "border-border",
                      )}
                    >
                      {t(m.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-surface p-3 text-sm">
              {isQuote ? (
                <p className="text-muted-foreground">{t("srd_quote_note")}</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("srd_service")}</span>
                    <span>{ETB(basePrice)}</span>
                  </div>
                  {addonsTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("srd_addons_total")}</span>
                      <span>{ETB(addonsTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-display font-bold">
                    <span>{t("srd_subtotal")}</span>
                    <span>{ETB(bookingTotal ?? 0)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("srd_delivery_note")}</p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              <CalendarClock className="mr-2 h-4 w-4" />
              {busy
                ? t("srd_submitting")
                : isQuote
                  ? t("srd_request_quote")
                  : t("srd_continue_payment")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
