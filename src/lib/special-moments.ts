import { supabase } from "@/integrations/supabase/client";
import { isMissingTable, supabaseErrorMessage } from "@/lib/supa-error";
import type { TranslationKey } from "@/lib/i18n";
import type { Json } from "@/integrations/supabase/types";

/**
 * Special Moments data access: gift, surprise, holiday gift, catering and
 * decoration services. Everything is database-backed and admin-managed.
 *
 * The Supabase tables arrive in an additive migration that may not have been
 * applied yet, so reads degrade to empty results (never throw) and writes
 * surface a clear message instead of a raw PostgREST error.
 */

export type ServiceCategory = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type PricingType = "fixed" | "quote";

export type Service = {
  id: string;
  slug: string;
  name: string;
  service_category_id: string | null;
  shop_id: string | null;
  occasion: string | null;
  pricing_type: PricingType;
  price: number | null;
  starting_price: number | null;
  description: string | null;
  included_items: string[];
  image_url: string | null;
  gallery: string[];
  service_area: string | null;
  lead_time_hours: number;
  available_from: string | null;
  available_to: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
};

export type ServiceAddon = {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
};

export type ServiceRequestStatus =
  "submitted" | "quote_requested" | "quoted" | "accepted" | "confirmed" | "completed" | "cancelled";

export type ServiceRequestType = "booking" | "quote";

export type ServiceRequestAddon = {
  name: string;
  price: number;
};

export type ServiceRequest = {
  id: string;
  request_code: string;
  user_id: string;
  service_id: string | null;
  request_type: ServiceRequestType;
  status: ServiceRequestStatus;
  customer_name: string | null;
  customer_phone: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  is_anonymous: boolean;
  occasion: string | null;
  surprise_type: string | null;
  event_type: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  guest_count: number | null;
  message: string | null;
  theme: string | null;
  food_preferences: string | null;
  special_instructions: string | null;
  budget: number | null;
  addons: ServiceRequestAddon[];
  quote_amount: number | null;
  admin_notes: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
};

export const REQUEST_STATUS_LABEL: Record<ServiceRequestStatus, string> = {
  submitted: "Submitted",
  quote_requested: "Quote requested",
  quoted: "Quote ready",
  accepted: "Quote accepted",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** i18n keys for request status labels, keyed by status. */
export const REQUEST_STATUS_LABEL_KEY: Record<ServiceRequestStatus, TranslationKey> = {
  submitted: "sr_status_submitted",
  quote_requested: "sr_status_quote_requested",
  quoted: "sr_status_quoted",
  accepted: "sr_status_accepted",
  confirmed: "sr_status_confirmed",
  completed: "sr_status_completed",
  cancelled: "sr_status_cancelled",
};

/**
 * i18n keys for the occasion/type pick-list labels. Values stay English in the
 * DB and query params; only the displayed label is localized.
 */
export const OPTION_LABEL_KEY: Record<string, TranslationKey> = {
  Birthday: "smo_birthday",
  Anniversary: "smo_anniversary",
  Graduation: "smo_graduation",
  Proposal: "smo_proposal",
  Welcome: "smo_welcome",
  Celebration: "smo_celebration",
  Wedding: "smo_wedding",
  Engagement: "smo_engagement",
  "Baby Shower": "smo_baby_shower",
  Corporate: "smo_corporate",
  Holiday: "smo_holiday",
  Other: "smo_other",
  "Birthday surprise": "smo_birthday_surprise",
  "Anniversary surprise": "smo_anniversary_surprise",
  "Graduation surprise": "smo_graduation_surprise",
  "Proposal surprise": "smo_proposal_surprise",
  "Welcome surprise": "smo_welcome_surprise",
  "Celebration surprise": "smo_celebration_surprise",
  "Custom surprise": "smo_custom_surprise",
  "Gift box": "smo_gift_box",
  Flowers: "smo_flowers",
  Cake: "smo_cake",
  Chocolates: "smo_chocolates",
  Perfume: "smo_perfume",
  "Personalized gift": "smo_personalized_gift",
  "Greeting card": "smo_greeting_card",
  "Gift bundle": "smo_gift_bundle",
  "Gift basket": "smo_gift_basket",
  "Custom gift": "smo_custom_gift",
  Christmas: "smo_christmas",
  Eid: "smo_eid",
  Easter: "smo_easter",
  "New Year": "smo_new_year",
  Timket: "smo_timket",
  Meskel: "smo_meskel",
  "Graduation season": "smo_graduation_season",
  "Mother's Day": "smo_mothers_day",
  "Father's Day": "smo_fathers_day",
  "Valentine's Day": "smo_valentines_day",
  "Other holiday": "smo_other_holiday",
  "Birthday catering": "smo_birthday_catering",
  "Family gathering": "smo_family_gathering",
  "Office / corporate catering": "smo_office_catering",
  "Wedding catering": "smo_wedding_catering",
  "Graduation catering": "smo_graduation_catering",
  "Party food": "smo_party_food",
  "Dessert package": "smo_dessert_package",
  "Drink package": "smo_drink_package",
  "Custom catering": "smo_custom_catering",
  "Birthday decoration": "smo_birthday_decoration",
  "Wedding decoration": "smo_wedding_decoration",
  "Engagement decoration": "smo_engagement_decoration",
  "Graduation decoration": "smo_graduation_decoration",
  "Baby shower decoration": "smo_baby_shower_decoration",
  "Balloon decoration": "smo_balloon_decoration",
  "Flower decoration": "smo_flower_decoration",
  "Table decoration": "smo_table_decoration",
  "Venue decoration": "smo_venue_decoration",
  "Custom decoration": "smo_custom_decoration",
};

/* ------------------------------------------------------------------ */
/* Option lists used by request/booking forms and filters.             */
/* These are pick-lists on DB-backed services, not demo content.       */
/* ------------------------------------------------------------------ */

export const OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Graduation",
  "Proposal",
  "Welcome",
  "Celebration",
  "Wedding",
  "Engagement",
  "Baby Shower",
  "Corporate",
  "Holiday",
  "Other",
] as const;

export const SURPRISE_TYPES = [
  "Birthday surprise",
  "Anniversary surprise",
  "Graduation surprise",
  "Proposal surprise",
  "Welcome surprise",
  "Celebration surprise",
  "Custom surprise",
] as const;

export const GIFT_TYPES = [
  "Gift box",
  "Flowers",
  "Cake",
  "Chocolates",
  "Perfume",
  "Personalized gift",
  "Greeting card",
  "Gift bundle",
  "Gift basket",
  "Custom gift",
] as const;

export const HOLIDAY_OCCASIONS = [
  "Christmas",
  "Eid",
  "Easter",
  "New Year",
  "Timket",
  "Meskel",
  "Graduation season",
  "Mother's Day",
  "Father's Day",
  "Valentine's Day",
  "Other holiday",
] as const;

export const CATERING_TYPES = [
  "Birthday catering",
  "Family gathering",
  "Office / corporate catering",
  "Wedding catering",
  "Graduation catering",
  "Party food",
  "Dessert package",
  "Drink package",
  "Custom catering",
] as const;

export const DECORATION_TYPES = [
  "Birthday decoration",
  "Wedding decoration",
  "Engagement decoration",
  "Graduation decoration",
  "Baby shower decoration",
  "Balloon decoration",
  "Flower decoration",
  "Table decoration",
  "Venue decoration",
  "Custom decoration",
] as const;

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

const softArray = async <T>(q: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> => {
  try {
    const { data, error } = await q;
    if (error) {
      if (!isMissingTable(error)) console.warn("[special-moments] query failed", error);
      return [];
    }
    return (data ?? []) as T[];
  } catch (err) {
    console.warn("[special-moments] query threw", err);
    return [];
  }
};

export const serviceCategoriesQuery = {
  queryKey: ["service-categories"],
  queryFn: async () =>
    softArray<ServiceCategory>(
      supabase
        .from("service_categories")
        .select("id,slug,name,tagline,description,image_url,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order"),
    ),
};

export type ServiceFilters = {
  categoryId?: string | null;
  occasion?: string | null;
  search?: string | null;
  maxPrice?: number | null;
  area?: string | null;
};

export const servicesQuery = (filters: ServiceFilters = {}) => ({
  queryKey: ["services", filters],
  queryFn: async () => {
    let q = supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("sort_order");
    if (filters.categoryId) q = q.eq("service_category_id", filters.categoryId);
    if (filters.occasion) q = q.eq("occasion", filters.occasion);
    if (filters.area) q = q.ilike("service_area", `%${filters.area}%`);
    if (filters.search) {
      const like = `%${filters.search}%`;
      q = q.or(`name.ilike.${like},description.ilike.${like},occasion.ilike.${like}`);
    }
    if (filters.maxPrice != null) q = q.lte("price", filters.maxPrice);
    return softArray<Service>(q);
  },
});

export const serviceQuery = (id: string | undefined) => ({
  queryKey: ["service", id],
  enabled: !!id,
  queryFn: async () => {
    const { data, error } = await supabase.from("services").select("*").eq("id", id!).maybeSingle();
    if (error) {
      if (!isMissingTable(error)) console.warn("[special-moments] service lookup failed", error);
      return null;
    }
    return data as unknown as Service | null;
  },
});

export const serviceAddonsQuery = (serviceId: string | undefined) => ({
  queryKey: ["service-addons", serviceId],
  enabled: !!serviceId,
  queryFn: async () =>
    softArray<ServiceAddon>(
      supabase
        .from("service_addons")
        .select("*")
        .eq("service_id", serviceId!)
        .eq("is_active", true)
        .order("sort_order"),
    ),
});

export const serviceRequestsQuery = (userId: string | undefined) => ({
  queryKey: ["service-requests", userId],
  enabled: !!userId,
  queryFn: async () =>
    softArray<ServiceRequest>(
      supabase
        .from("service_requests")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false }),
    ),
});

export const serviceRequestQuery = (id: string | undefined, userId: string | undefined) => ({
  queryKey: ["service-request", id, userId],
  enabled: !!id && !!userId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", id!)
      .eq("user_id", userId!)
      .maybeSingle();
    if (error) {
      if (!isMissingTable(error)) console.warn("[special-moments] request lookup failed", error);
      return null;
    }
    return data as unknown as ServiceRequest | null;
  },
});

/** Resolve services by id (used to label a customer's requests). */
export const servicesByIdsQuery = (ids: string[]) => ({
  queryKey: ["services-by-ids", [...ids].sort().join(",")],
  enabled: ids.length > 0,
  queryFn: async () => {
    if (ids.length === 0) return {} as Record<string, Service>;
    const { data, error } = await supabase.from("services").select("*").in("id", ids);
    if (error) {
      if (!isMissingTable(error)) console.warn("[special-moments] services by ids failed", error);
      return {} as Record<string, Service>;
    }
    const map: Record<string, Service> = {};
    for (const row of (data ?? []) as unknown as Service[]) map[row.id] = row;
    return map;
  },
});

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export type ServiceRequestInput = {
  serviceId: string;
  requestType: ServiceRequestType;
  customerName?: string | undefined;
  customerPhone?: string | undefined;
  recipientName?: string | undefined;
  recipientPhone?: string | undefined;
  isAnonymous?: boolean | undefined;
  occasion?: string | undefined;
  surpriseType?: string | undefined;
  eventType?: string | undefined;
  eventDate?: string | undefined;
  eventTime?: string | undefined;
  location?: string | undefined;
  guestCount?: number | null | undefined;
  message?: string | undefined;
  theme?: string | undefined;
  foodPreferences?: string | undefined;
  specialInstructions?: string | undefined;
  budget?: number | null | undefined;
  addons?: ServiceRequestAddon[] | undefined;
};

/** Create a booking or quote request. Returns the new request id. */
export async function createServiceRequest(userId: string, input: ServiceRequestInput) {
  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      user_id: userId,
      service_id: input.serviceId,
      request_type: input.requestType,
      status: input.requestType === "quote" ? "quote_requested" : "submitted",
      customer_name: input.customerName?.trim() || null,
      customer_phone: input.customerPhone?.trim() || null,
      recipient_name: input.recipientName?.trim() || null,
      recipient_phone: input.recipientPhone?.trim() || null,
      is_anonymous: input.isAnonymous ?? false,
      occasion: input.occasion || null,
      surprise_type: input.surpriseType || null,
      event_type: input.eventType || null,
      event_date: input.eventDate || null,
      event_time: input.eventTime || null,
      location: input.location?.trim() || null,
      guest_count: input.guestCount ?? null,
      message: input.message?.trim() || null,
      theme: input.theme?.trim() || null,
      food_preferences: input.foodPreferences?.trim() || null,
      special_instructions: input.specialInstructions?.trim() || null,
      budget: input.budget ?? null,
      addons: (input.addons ?? []) as unknown as Json,
    })
    .select("id")
    .single();
  if (error) throw new Error(supabaseErrorMessage(error));
  return (data as { id: string }).id;
}

/** Customer accepts an admin quote (status becomes accepted). */
export async function acceptServiceQuote(requestId: string) {
  const { error } = await supabase.rpc("accept_service_quote", { p_request: requestId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

/** Pay for a fixed-price service or an accepted quote via the existing pipeline. */
export async function placeServiceOrder(
  requestId: string,
  method: string,
  details: {
    name?: string | undefined;
    phone?: string | undefined;
    address?: string | undefined;
    instructions?: string | undefined;
  },
) {
  const { data, error } = await supabase.rpc("place_service_order", {
    p_request_id: requestId,
    p_payment_method: method,
    ...(details.name ? { p_customer_name: details.name } : {}),
    ...(details.phone ? { p_customer_phone: details.phone } : {}),
    ...(details.address ? { p_delivery_address: details.address } : {}),
    ...(details.instructions ? { p_delivery_instructions: details.instructions } : {}),
  });
  if (error) throw new Error(supabaseErrorMessage(error));
  return data as string;
}

/** Price shown for a request: accepted/held quote, else the service fixed price. */
export function requestDisplayPrice(req: ServiceRequest, service?: Service | null) {
  if (req.quote_amount != null) return req.quote_amount;
  if (service?.pricing_type === "fixed" && service.price != null) return service.price;
  return null;
}

export const addonsTotal = (addons: ServiceRequestAddon[] | null | undefined) =>
  (addons ?? []).reduce((sum, a) => sum + Number(a.price ?? 0), 0);
