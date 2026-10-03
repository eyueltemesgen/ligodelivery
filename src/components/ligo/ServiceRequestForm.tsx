import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ETB } from "@/lib/format";
import { supabaseErrorMessage } from "@/lib/supa-error";
import {
  EVENT_TYPES,
  OCCASIONS,
  serviceOptionsQuery,
  type ServiceOption,
  type ServiceWithShop,
} from "@/lib/services";
import { Button } from "@/components/ui/button";
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

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash on delivery / on the day" },
  { id: "telebirr", label: "Telebirr" },
  { id: "cbe", label: "CBE Birr" },
  { id: "boa", label: "Bank of Abyssinia" },
  { id: "mobile_money", label: "Mobile Money" },
  { id: "chapa", label: "Chapa" },
];

type Props = { service: ServiceWithShop };

/**
 * Booking / request form for a Special Moments service. Which fields appear is
 * driven by the service's own flags (schedule, location, recipient, guests,
 * anonymity) so a gift order and a catering request collect the right details
 * without forcing every service into one shape.
 */
export function ServiceRequestForm({ service }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: options = [] } = useQuery(serviceOptionsQuery(service.id));

  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [occasion, setOccasion] = useState<string>(service.occasions[0] ?? "");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [guests, setGuests] = useState("");
  const [location, setLocation] = useState("");
  const [theme, setTheme] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);

  const isQuote = service.pricing_type === "quote";
  const showRecipient = service.requires_recipient || service.anonymous_option;
  const showGuests = service.min_guests != null || service.max_guests != null;
  const showTheme = service.service_categories?.slug === "decoration";
  const showMessage = service.service_categories?.slug !== "catering";

  const estimated = useMemo(() => {
    const base = Number(service.price) > 0 ? Number(service.price) : 0;
    const extras = options
      .filter((o) => selectedOptions.includes(o.id))
      .reduce((sum, o) => sum + Number(o.price_delta), 0);
    return base + extras;
  }, [options, selectedOptions, service.price]);

  const toggleOption = (id: string) =>
    setSelectedOptions((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(Math.ceil(service.lead_time_hours / 24), 1));
    return d.toISOString().slice(0, 10);
  }, [service.lead_time_hours]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      // Omit empty fields entirely: the RPC treats missing arguments as null.
      const { data, error } = await supabase.rpc("submit_service_request", {
        p_service_id: service.id,
        p_option_ids: selectedOptions,
        p_keep_sender_anonymous: anonymous,
        ...(isQuote ? {} : { p_payment_method: method }),
        ...(name.trim() ? { p_customer_name: name.trim() } : {}),
        ...(phone.trim() ? { p_customer_phone: phone.trim() } : {}),
        ...(recipientName.trim() ? { p_recipient_name: recipientName.trim() } : {}),
        ...(recipientPhone.trim() ? { p_recipient_phone: recipientPhone.trim() } : {}),
        ...(occasion ? { p_event_type: occasion } : {}),
        ...(eventDate ? { p_event_date: eventDate } : {}),
        ...(eventTime ? { p_event_time: eventTime } : {}),
        ...(guests ? { p_guest_count: Number(guests) } : {}),
        ...(location.trim() ? { p_location: location.trim() } : {}),
        ...(theme.trim() ? { p_theme: theme.trim() } : {}),
        ...(budget ? { p_budget: Number(budget) } : {}),
        ...(message.trim() ? { p_message: message.trim() } : {}),
        ...(instructions.trim() ? { p_special_instructions: instructions.trim() } : {}),
      });
      if (error) throw error;
      toast.success(isQuote ? "Request sent — we'll be in touch with a quote" : "Request sent");
      await navigate({ to: "/account/requests/$requestId", params: { requestId: data as string } });
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = !!user && !!name.trim() && !!phone.trim();

  return (
    <form
      onSubmit={submit}
      id="request"
      className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div>
        <h2 className="font-display text-lg font-bold">
          {isQuote ? "Request a quote" : "Book this service"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isQuote
            ? "Tell us what you need and we'll send pricing and availability through Ligo."
            : "Share the details and we'll confirm your booking."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sr-name">Your name</Label>
          <Input id="sr-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sr-phone">Your phone</Label>
          <Input
            id="sr-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+251…"
            required
          />
        </div>
      </div>

      {showRecipient && (
        <fieldset className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recipient
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sr-rname">Recipient name</Label>
              <Input
                id="sr-rname"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Who is this for?"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-rphone">Recipient phone</Label>
              <Input
                id="sr-rphone"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="For delivery coordination"
              />
            </div>
          </div>
          {service.anonymous_option && (
            <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm">
              <Checkbox
                checked={anonymous}
                onCheckedChange={(v) => setAnonymous(v === true)}
                className="mt-0.5"
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  Keep me anonymous
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Your name won't be shared with the recipient. Our team still sees it to fulfil
                  your order.
                </span>
              </span>
            </label>
          )}
        </fieldset>
      )}

      {service.requires_schedule && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="sr-occasion">Occasion</Label>
            <Select value={occasion} onValueChange={setOccasion}>
              <SelectTrigger id="sr-occasion">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {(service.occasions.length
                  ? service.occasions
                  : OCCASIONS.filter((o) => EVENT_TYPES.includes(o as never))
                ).map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sr-date">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-primary" /> Event date
              </span>
            </Label>
            <Input
              id="sr-date"
              type="date"
              min={minDate}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sr-time">Preferred time</Label>
            <Input
              id="sr-time"
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {showGuests && (
          <div className="space-y-1.5">
            <Label htmlFor="sr-guests">Number of guests</Label>
            <Input
              id="sr-guests"
              type="number"
              min={service.min_guests ?? 1}
              max={service.max_guests ?? undefined}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              placeholder={
                service.min_guests && service.max_guests
                  ? `${service.min_guests}–${service.max_guests}`
                  : undefined
              }
            />
          </div>
        )}
        {showTheme && (
          <div className="space-y-1.5">
            <Label htmlFor="sr-theme">Theme / colours</Label>
            <Input
              id="sr-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. gold & white, safari"
            />
          </div>
        )}
        {isQuote && (
          <div className="space-y-1.5">
            <Label htmlFor="sr-budget">Budget (optional)</Label>
            <Input
              id="sr-budget"
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="ETB"
            />
          </div>
        )}
      </div>

      {service.requires_location && (
        <div className="space-y-1.5">
          <Label htmlFor="sr-location">Delivery / event location</Label>
          <Input
            id="sr-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Kebele, landmark, venue…"
            required
          />
        </div>
      )}

      {showMessage && (
        <div className="space-y-1.5">
          <Label htmlFor="sr-message">Personal message (optional)</Label>
          <Textarea
            id="sr-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note for the gift card or surprise…"
            rows={3}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="sr-instructions">Special instructions (optional)</Label>
        <Textarea
          id="sr-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Anything we should know?"
          rows={2}
        />
      </div>

      {options.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Optional add-ons
          </legend>
          <div className="space-y-2">
            {options.map((o: ServiceOption) => (
              <label
                key={o.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors",
                  selectedOptions.includes(o.id)
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:border-primary/40",
                )}
              >
                <span className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedOptions.includes(o.id)}
                    onCheckedChange={() => toggleOption(o.id)}
                  />
                  <span>
                    <span className="block font-medium">{o.name}</span>
                    {o.description && (
                      <span className="block text-xs text-muted-foreground">{o.description}</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-primary">
                  {Number(o.price_delta) === 0
                    ? "Free"
                    : `${Number(o.price_delta) > 0 ? "+" : ""}${ETB(o.price_delta)}`}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {!isQuote && (
        <div className="space-y-3">
          <Label>Payment method</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium",
                  method === m.id ? "border-primary bg-primary-soft" : "border-border",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-4">
        {!isQuote && estimated > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated total</span>
            <span className="font-display text-lg font-bold">{ETB(estimated)}</span>
          </div>
        )}
        {user ? (
          <Button type="submit" size="lg" className="w-full" disabled={busy || !canSubmit}>
            <Sparkles className="mr-2 h-4 w-4" />
            {busy ? "Sending…" : isQuote ? "Send request" : "Confirm booking request"}
          </Button>
        ) : (
          <Button asChild size="lg" className="w-full">
            <a href="/login">Sign in to continue</a>
          </Button>
        )}
        <p className="text-center text-xs text-muted-foreground">
          {isQuote
            ? "No payment now — we'll confirm pricing first."
            : "You'll confirm payment after we review your request."}
        </p>
      </div>
    </form>
  );
}
