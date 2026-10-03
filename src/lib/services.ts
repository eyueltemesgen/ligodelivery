import { supabase } from "@/integrations/supabase/client";
import { isMissingTable } from "@/lib/supa-error";

/**
 * Special Moments data access: Surprises, Gifts, Catering & Decoration.
 *
 * Services are bookable offerings owned by an existing shop, so a bakery can
 * sell cakes (products) and catering (services) from the same storefront. A
 * customer's booking or quote intent lives in `service_requests`; when a quote
 * is accepted (or a fixed-price request is confirmed) it links to a real row in
 * the existing `orders` table with `order_type = 'service'`.
 */

export type ServiceCategory = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  emoji: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Service = {
  id: string;
  shop_id: string;
  service_category_id: string;
  name: string;
  slug: string | null;
  summary: string | null;
  description: string | null;
  pricing_type: "fixed" | "quote";
  price: number;
  starting_price: number | null;
  price_unit: string | null;
  duration_minutes: number | null;
  preparation_hours: number | null;
  min_guests: number | null;
  max_guests: number | null;
  images: string[];
  cover_url: string | null;
  includes: string[];
  addons: string[];
  occasions: string[];
  service_area: string | null;
  requires_location: boolean;
  requires_schedule: boolean;
  requires_recipient: boolean;
  anonymous_option: boolean;
  lead_time_hours: number;
  is_active: boolean;
  is_featured: boolean;
  rating: number;
  review_count: number;
  sort_order: number;
};

export type ServiceOption = {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price_delta: number;
  option_type: "addon" | "choice";
  group_name: string | null;
  is_active: boolean;
  sort_order: number;
};

export type ServiceRequest = {
  id: string;
  request_code: string;
  customer_id: string;
  shop_id: string | null;
  service_id: string | null;
  order_id: string | null;
  status: string;
  pricing_type: "fixed" | "quote";
  service_name: string;
  service_category_slug: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  keep_sender_anonymous: boolean;
  event_type: string | null;
  event_date: string | null;
  event_time: string | null;
  guest_count: number | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  theme: string | null;
  budget: number | null;
  message: string | null;
  special_instructions: string | null;
  customization: Record<string, unknown>;
  quoted_amount: number | null;
  quoted_notes: string | null;
  quoted_at: string | null;
  subtotal: number;
  total: number;
  payment_status: string;
  payment_method: string | null;
  admin_notes: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceRequestItem = {
  id: string;
  request_id: string;
  service_id: string | null;
  option_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
};

export type ServiceWithShop = Service & {
  shops: { id: string; name: string; is_online: boolean; rating: number } | null;
  service_categories: { slug: string; name: string; emoji: string | null } | null;
};

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export const OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Graduation",
  "Wedding",
  "Engagement",
  "Proposal",
  "Baby Shower",
  "Corporate Event",
  "Surprise Visit",
  "Holiday",
  "Other",
] as const;

export type Occasion = (typeof OCCASIONS)[number];

export const EVENT_TYPES = [
  "Birthday",
  "Anniversary",
  "Graduation",
  "Wedding",
  "Engagement",
  "Baby Shower",
  "Corporate Event",
  "Family Gathering",
  "Other",
] as const;

export const SERVICE_CATEGORY_META: Record<
  string,
  { emoji: string; name: string; blurb: string; examples: string[] }
> = {
  surprises: {
    emoji: "🎉",
    name: "Surprises",
    blurb: "Surprise experiences and deliveries that land perfectly.",
    examples: [
      "Birthday surprise",
      "Anniversary surprise",
      "Romantic surprise",
      "Proposal surprise",
      "Welcome surprise",
    ],
  },
  gifts: {
    emoji: "🎁",
    name: "Gifts",
    blurb: "Thoughtful gifts, wrapped and delivered to their door.",
    examples: [
      "Gift boxes",
      "Flowers",
      "Cakes",
      "Chocolates",
      "Personalized gifts",
      "Gift baskets",
    ],
  },
  catering: {
    emoji: "🍽️",
    name: "Catering",
    blurb: "Food and drink for gatherings of every size.",
    examples: [
      "Birthday catering",
      "Office catering",
      "Wedding catering",
      "Party food",
      "Dessert tables",
    ],
  },
  decoration: {
    emoji: "🎈",
    name: "Decoration",
    blurb: "Event and venue styling that sets the scene.",
    examples: [
      "Birthday decoration",
      "Wedding decoration",
      "Balloon decoration",
      "Table decoration",
      "Venue styling",
    ],
  },
};

export const SERVICE_STATUSES = [
  "requested",
  "reviewing",
  "quoted",
  "confirmed",
  "preparing",
  "scheduled",
  "out_for_delivery",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const SERVICE_STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  reviewing: "Reviewing",
  quoted: "Quote ready",
  confirmed: "Confirmed",
  preparing: "Preparing",
  scheduled: "Scheduled",
  out_for_delivery: "Out for delivery",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const SERVICE_STATUS_TONE: Record<string, string> = {
  requested: "bg-warning/20 text-warning-foreground",
  reviewing: "bg-warning/20 text-warning-foreground",
  quoted: "bg-primary-soft text-accent-foreground",
  confirmed: "bg-primary-soft text-accent-foreground",
  preparing: "bg-secondary text-secondary-foreground",
  scheduled: "bg-secondary text-secondary-foreground",
  out_for_delivery: "bg-secondary text-secondary-foreground",
  in_progress: "bg-secondary text-secondary-foreground",
  completed: "bg-primary-soft text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

/** The lifecycle shown on the customer's request timeline (cancellation is separate). */
export const SERVICE_TIMELINE: ServiceStatus[] = [
  "requested",
  "reviewing",
  "quoted",
  "confirmed",
  "preparing",
  "scheduled",
  "in_progress",
  "completed",
];

const STATUS_ALIAS: Record<string, ServiceStatus> = {
  out_for_delivery: "in_progress",
};

export const serviceTimelineIndex = (status: string) => {
  const normalized = STATUS_ALIAS[status] ?? status;
  return SERVICE_TIMELINE.indexOf(normalized as ServiceStatus);
};

export const isServiceRequestOpen = (status: string) =>
  !["completed", "cancelled"].includes(status);

export const canCancelServiceRequest = (status: string) =>
  ["requested", "reviewing", "quoted"].includes(status);

/** Customer-facing grouping for the request list tabs. */
export const SERVICE_TABS = [
  { id: "all", label: "All" },
  { id: "open", label: "Active" },
  { id: "quoted", label: "Quotes" },
  { id: "upcoming", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export type ServiceTab = (typeof SERVICE_TABS)[number]["id"];

export const matchesServiceTab = (request: ServiceRequest, tab: ServiceTab) => {
  if (tab === "all") return true;
  if (tab === "open") return isServiceRequestOpen(request.status);
  if (tab === "quoted") return request.status === "quoted";
  if (tab === "completed") return request.status === "completed";
  if (tab === "cancelled") return request.status === "cancelled";
  return (
    isServiceRequestOpen(request.status) &&
    ["confirmed", "preparing", "scheduled", "in_progress", "out_for_delivery"].includes(
      request.status,
    )
  );
};

export const serviceTabCounts = (requests: ServiceRequest[]) =>
  SERVICE_TABS.reduce<Record<ServiceTab, number>>(
    (acc, t) => {
      acc[t.id] = requests.filter((r) => matchesServiceTab(r, t.id)).length;
      return acc;
    },
    { all: 0, open: 0, quoted: 0, upcoming: 0, completed: 0, cancelled: 0 },
  );

/** Human price label for cards: fixed price, "from" price, or a quote prompt. */
export const servicePriceLabel = (
  service: Pick<Service, "pricing_type" | "price" | "starting_price">,
) => {
  if (service.pricing_type === "quote") return "Request quote";
  const value = Number(service.price) > 0 ? Number(service.price) : service.starting_price;
  if (!value) return "Request quote";
  return null;
};

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

const unwrap = <T>(res: { data: unknown; error: unknown }, fallback: T): T => {
  if (res.error) throw res.error;
  return (res.data ?? fallback) as T;
};

/** Optional reads degrade to empty while an additive migration is rolling out. */
const soft = async <T>(
  q: PromiseLike<{ data: unknown; error: unknown }>,
  fallback: T,
): Promise<T> => {
  try {
    const res = await q;
    if (res.error) {
      if (isMissingTable(res.error)) return fallback;
      throw res.error;
    }
    return (res.data ?? fallback) as T;
  } catch (err) {
    if (isMissingTable(err)) return fallback;
    throw err;
  }
};

export const serviceCategoriesQuery = {
  queryKey: ["service-categories"],
  queryFn: async () =>
    soft<ServiceCategory[]>(
      supabase.from("service_categories").select("*").eq("is_active", true).order("sort_order"),
      [],
    ),
};

export type ServiceFilters = {
  categoryId?: string | null;
  categorySlug?: string | null;
  occasion?: string | null;
  maxPrice?: number | null;
  search?: string | null;
};

export const servicesQuery = (filters: ServiceFilters = {}) => ({
  queryKey: ["services", filters],
  queryFn: async () => {
    let q = supabase
      .from("services")
      .select("*, shops(id,name,is_online,rating), service_categories(slug,name,emoji)")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (filters.categoryId) q = q.eq("service_category_id", filters.categoryId);
    if (filters.occasion) q = q.contains("occasions", [filters.occasion]);
    if (filters.search?.trim()) {
      // Strip PostgREST filter syntax so the search term cannot alter the query.
      const safe = filters.search
        .trim()
        .replace(/[,().%*\\]/g, " ")
        .trim();
      if (safe) {
        q = q.or(`name.ilike.%${safe}%,summary.ilike.%${safe}%,description.ilike.%${safe}%`);
      }
    }
    const rows = await soft<ServiceWithShop[]>(q, []);
    if (!filters.categorySlug) return rows;
    return rows.filter((r) => r.service_categories?.slug === filters.categorySlug);
  },
});

export const featuredServicesQuery = (limit = 6) => ({
  queryKey: ["services", "featured", limit],
  queryFn: async () =>
    soft<ServiceWithShop[]>(
      supabase
        .from("services")
        .select("*, shops(id,name,is_online,rating), service_categories(slug,name,emoji)")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit),
      [],
    ),
});

export const serviceQuery = (id: string | undefined) => ({
  queryKey: ["service", id],
  enabled: !!id,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("services")
      .select(
        "*, shops(id,name,is_online,rating,address,phone), service_categories(slug,name,emoji)",
      )
      .eq("id", id!)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as
      (ServiceWithShop & { shops: { address: string | null; phone: string | null } }) | null;
  },
});

export const serviceOptionsQuery = (serviceId: string | undefined) => ({
  queryKey: ["service-options", serviceId],
  enabled: !!serviceId,
  queryFn: async () =>
    soft<ServiceOption[]>(
      supabase
        .from("service_options")
        .select("*")
        .eq("service_id", serviceId!)
        .eq("is_active", true)
        .order("sort_order"),
      [],
    ),
});

export const shopServicesQuery = (shopId: string | undefined) => ({
  queryKey: ["shop-services", shopId],
  enabled: !!shopId,
  queryFn: async () =>
    soft<Service[]>(
      supabase
        .from("services")
        .select("*")
        .eq("shop_id", shopId!)
        .eq("is_active", true)
        .order("sort_order"),
      [],
    ),
});

/** Admin catalogue: every service including archived/inactive ones. */
export const adminServicesQuery = {
  queryKey: ["admin-services"],
  queryFn: async () =>
    unwrap<ServiceWithShop[]>(
      await supabase
        .from("services")
        .select("*, shops(id,name,is_online,rating), service_categories(slug,name,emoji)")
        .order("created_at", { ascending: false }),
      [],
    ),
};

/** Provider catalogue: services belonging to the shops a merchant owns. */
export const shopAdminServicesQuery = (shopIds: string[]) => ({
  queryKey: ["shop-admin-services", shopIds.join(",")],
  enabled: shopIds.length > 0,
  queryFn: async () =>
    soft<ServiceWithShop[]>(
      supabase
        .from("services")
        .select("*, shops(id,name,is_online,rating), service_categories(slug,name,emoji)")
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false }),
      [],
    ),
});

/** Provider queue: service requests addressed to the merchant's shops. */
export const shopServiceRequestsQuery = (shopIds: string[]) => ({
  queryKey: ["shop-service-requests", shopIds.join(",")],
  enabled: shopIds.length > 0,
  queryFn: async () =>
    soft<ServiceRequest[]>(
      supabase
        .from("service_requests")
        .select("*")
        .in("shop_id", shopIds)
        .order("created_at", { ascending: false }),
      [],
    ),
});

export const adminServiceOptionsQuery = (serviceId: string | undefined) => ({
  queryKey: ["admin-service-options", serviceId],
  enabled: !!serviceId,
  queryFn: async () =>
    unwrap<ServiceOption[]>(
      await supabase
        .from("service_options")
        .select("*")
        .eq("service_id", serviceId!)
        .order("sort_order"),
      [],
    ),
});

export const adminServiceRequestsQuery = {
  queryKey: ["admin-service-requests"],
  queryFn: async () =>
    unwrap<ServiceRequest[]>(
      await supabase
        .from("service_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      [],
    ),
};

export const serviceRequestsQuery = (userId: string | undefined) => ({
  queryKey: ["service-requests", userId],
  enabled: !!userId,
  queryFn: async () =>
    soft<ServiceRequest[]>(
      supabase
        .from("service_requests")
        .select("*")
        .eq("customer_id", userId!)
        .order("created_at", { ascending: false }),
      [],
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
      .eq("customer_id", userId!)
      .maybeSingle();
    if (error) throw error;
    return data as ServiceRequest | null;
  },
});

export const serviceRequestItemsQuery = (requestId: string | undefined) => ({
  queryKey: ["service-request-items", requestId],
  enabled: !!requestId,
  queryFn: async () =>
    soft<ServiceRequestItem[]>(
      supabase
        .from("service_request_items")
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at"),
      [],
    ),
});

export const serviceRequestsForOrderQuery = (orderId: string | undefined) => ({
  queryKey: ["service-request-by-order", orderId],
  enabled: !!orderId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("order_id", orderId!)
      .maybeSingle();
    if (error) throw error;
    return data as ServiceRequest | null;
  },
});

/** Category slug -> active services, for the landing page tiles. */
export const serviceCountsByCategoryQuery = {
  queryKey: ["service-category-counts"],
  queryFn: async () => {
    const rows = await soft<{ service_category_id: string }[]>(
      supabase.from("services").select("service_category_id").eq("is_active", true),
      [],
    );
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.service_category_id] = (counts[r.service_category_id] ?? 0) + 1;
    return counts;
  },
};
