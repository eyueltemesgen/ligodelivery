/**
 * Read-only tools for the customer shopping assistant.
 *
 * Every tool returns a typed payload built from real rows, and is deliberately
 * incapable of mutating anything: there is no insert/update/delete and no order
 * placement anywhere in this module. The model only chooses which tool to call
 * and how to phrase the answer; all money, distance and status values are copied
 * verbatim from the database or the `calculate_delivery_fee` RPC.
 *
 * `.server.ts` keeps this module (and the service-role client it may load) out of
 * the browser bundle.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AssistantDeliveryFee,
  AssistantHours,
  AssistantHoursDay,
  AssistantOrder,
  AssistantProduct,
  AssistantService,
  AssistantShop,
  AssistantToolResult,
} from "@/lib/assistant";
import { DELIVERY_FAILURE_KEY, type DeliveryFailureReason } from "@/lib/delivery";
import { closedReasonKey, isShopOpenNow, type ShopHoursRow } from "@/lib/hours";
import type { PricingType } from "@/lib/special-moments";

type Db = SupabaseClient<Database>;

/** Hard bounds so a single tool call can never stream a whole table. */
const SHOP_LIMIT = 6;
const PRODUCT_LIMIT = 8;
const SERVICE_LIMIT = 6;
const ORDER_LIMIT = 5;

const SHOP_COLUMNS =
  "id,name,description,category_id,image_url,cover_url,opens_at,closes_at,delivery_fee,delivery_time_min,rating,is_online,is_active,lat,lng";
const PRODUCT_COLUMNS = "id,shop_id,name,image_url,price,discount_percent,in_stock,is_active";

/** Trims and caps free text before it reaches an `ilike` pattern. */
function cleanTerm(value: unknown, max = 60): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/** Escapes `%`/`,` so a crafted term cannot widen a PostgREST `or` filter. */
function escapeLike(value: string): string {
  return value.replace(/[%,()]/g, " ").trim();
}

type ShopRow = {
  id: string;
  name: string;
  category_id: string | null;
  image_url: string | null;
  cover_url: string | null;
  opens_at: string;
  closes_at: string;
  delivery_fee: number;
  delivery_time_min: number;
  rating: number;
  is_online: boolean;
  is_active: boolean;
  lat: number | null;
  lng: number | null;
};

type ProductRow = {
  id: string;
  shop_id: string;
  name: string;
  image_url: string | null;
  price: number;
  discount_percent: number;
  in_stock: boolean;
};

function toShop(row: ShopRow, categoryName: string | null): AssistantShop {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url ?? row.cover_url ?? null,
    deliveryFee: Number(row.delivery_fee ?? 0),
    deliveryTimeMin: Number(row.delivery_time_min ?? 0),
    rating: Number(row.rating ?? 0),
    categoryName,
  };
}

function toProduct(row: ProductRow, shopName: string | null): AssistantProduct {
  return {
    id: row.id,
    shopId: row.shop_id,
    shopName,
    name: row.name,
    imageUrl: row.image_url,
    price: Number(row.price ?? 0),
    discountPercent: Number(row.discount_percent ?? 0),
    inStock: row.in_stock !== false,
  };
}

/** Category id → name, for the shop cards. Degrades to an empty map. */
async function categoryNames(db: Db): Promise<Map<string, string>> {
  try {
    const { data } = await db.from("categories").select("id,name").eq("is_active", true);
    return new Map((data ?? []).map((c) => [c.id, c.name]));
  } catch {
    return new Map();
  }
}

async function shopNames(db: Db, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  try {
    const { data } = await db.from("shops").select("id,name").in("id", unique);
    return new Map((data ?? []).map((s) => [s.id, s.name]));
  } catch {
    return new Map();
  }
}

/** Search active shops and products by name. Bounded and read-only. */
export async function searchCatalogue(
  db: Db,
  input: { q?: unknown; shopsOnly?: unknown },
): Promise<AssistantToolResult> {
  const term = escapeLike(cleanTerm(input.q));
  const shopsOnly = input.shopsOnly === true;
  if (term.length < 2) return { kind: "none", noteKey: "ai_no_results" };
  const like = `%${term}%`;

  const shopsRequest = db
    .from("shops")
    .select(SHOP_COLUMNS)
    .eq("is_active", true)
    .or(`name.ilike.${like},description.ilike.${like}`)
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false })
    .limit(SHOP_LIMIT);

  const productsRequest = shopsOnly
    ? Promise.resolve({ data: [] as ProductRow[] })
    : db
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .ilike("name", like)
        .limit(PRODUCT_LIMIT)
        .then((r) => ({ data: (r.data ?? []) as unknown as ProductRow[] }));

  const [shopRes, productRes, categories] = await Promise.all([
    shopsRequest,
    productsRequest,
    categoryNames(db),
  ]);

  const shopRows = (shopRes.data ?? []) as unknown as ShopRow[];
  const productRows = productRes.data;
  const names = await shopNames(
    db,
    productRows.map((p) => p.shop_id),
  );

  if (shopRows.length === 0 && productRows.length === 0) {
    return { kind: "none", noteKey: "ai_no_results" };
  }
  return {
    kind: "catalogue",
    shops: shopRows.map((s) =>
      toShop(s, s.category_id ? (categories.get(s.category_id) ?? null) : null),
    ),
    products: productRows.map((p) => toProduct(p, names.get(p.shop_id) ?? null)),
  };
}

/** Look one shop up by name or id. Used before hours / fee questions. */
export async function findShop(
  db: Db,
  input: { shopId?: unknown; q?: unknown },
): Promise<AssistantToolResult> {
  const shopId = cleanTerm(input.shopId, 64);
  const term = escapeLike(cleanTerm(input.q));
  const categories = await categoryNames(db);

  const base = db.from("shops").select(SHOP_COLUMNS).eq("is_active", true);
  const request = shopId
    ? base.eq("id", shopId).limit(1)
    : term.length >= 2
      ? base.ilike("name", `%${term}%`).order("rating", { ascending: false }).limit(SHOP_LIMIT)
      : null;

  if (!request) return { kind: "none", noteKey: "ai_need_shop" };

  const { data } = await request;
  const rows = (data ?? []) as unknown as ShopRow[];
  if (rows.length === 0) return { kind: "none", noteKey: "ai_no_results" };
  return {
    kind: "shops",
    shops: rows.map((s) =>
      toShop(s, s.category_id ? (categories.get(s.category_id) ?? null) : null),
    ),
  };
}

/** Opening hours, resolved server-side with the same helper the UI uses. */
export async function getShopHours(
  db: Db,
  input: { shopId?: unknown; shopName?: unknown },
): Promise<AssistantToolResult> {
  const shopId = cleanTerm(input.shopId, 64);
  const name = escapeLike(cleanTerm(input.shopName));
  const base = db.from("shops").select(SHOP_COLUMNS).eq("is_active", true);
  const request = shopId
    ? base.eq("id", shopId).limit(1)
    : name.length >= 2
      ? base.ilike("name", `%${name}%`).order("rating", { ascending: false }).limit(1)
      : null;
  if (!request) return { kind: "none", noteKey: "ai_need_shop" };

  const { data } = await request;
  const shop = ((data ?? []) as unknown as ShopRow[])[0];
  if (!shop) return { kind: "none", noteKey: "ai_no_results" };

  const schedule = await loadHours(db, shop.id);
  const isOpen = isShopOpenNow(shop, schedule);
  const today = schedule.find((h) => h.day_of_week === new Date().getDay()) ?? null;

  const hours: AssistantHours = {
    shopId: shop.id,
    shopName: shop.name,
    isOpen,
    reasonKey: isOpen ? null : closedReasonKey(shop, schedule),
    today: today
      ? {
          dayOfWeek: today.day_of_week,
          opensAt: today.opens_at,
          closesAt: today.closes_at,
          isClosed: today.is_closed,
        }
      : null,
    schedule: schedule.map((h) => ({
      dayOfWeek: h.day_of_week,
      opensAt: h.opens_at,
      closesAt: h.closes_at,
      isClosed: h.is_closed,
    })),
  };
  return { kind: "hours", hours };
}

/** `shop_hours` is auxiliary; a missing table falls back to shop-level hours. */
async function loadHours(db: Db, shopId: string): Promise<ShopHoursRow[]> {
  try {
    const { data, error } = await db
      .from("shop_hours")
      .select("shop_id,day_of_week,opens_at,closes_at,is_closed")
      .eq("shop_id", shopId)
      .order("day_of_week");
    if (error) throw error;
    return (data ?? []) as ShopHoursRow[];
  } catch {
    return [];
  }
}

type RawQuote = {
  ok?: boolean;
  reason?: string;
  distance?: number;
  delivery_fee?: number;
  pricing_rule?: string;
};

function normalizeReason(reason: string | undefined): DeliveryFailureReason {
  switch (reason) {
    case "customer_location_unavailable":
    case "shop_location_unavailable":
    case "outside_service_area":
    case "no_rule":
    case "shop_not_found":
      return reason;
    default:
      return "error";
  }
}

/**
 * Delivery-fee estimate.
 *
 * The RPC is REVOKEd from `anon`, so the call is made with the service-role
 * client. It is a pure, read-only calculation (no writes), and the returned
 * numbers are copied through verbatim — this module performs no arithmetic on
 * the fee or the distance.
 */
export async function estimateDeliveryFee(
  db: Db,
  input: { shopId?: unknown; shopName?: unknown; lat?: unknown; lng?: unknown },
): Promise<AssistantToolResult> {
  const shopId = cleanTerm(input.shopId, 64);
  const name = escapeLike(cleanTerm(input.shopName));
  const lat = typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : null;
  const lng = typeof input.lng === "number" && Number.isFinite(input.lng) ? input.lng : null;

  const base = db.from("shops").select("id,name").eq("is_active", true);
  const request = shopId
    ? base.eq("id", shopId).limit(1)
    : name.length >= 2
      ? base.ilike("name", `%${name}%`).order("rating", { ascending: false }).limit(1)
      : null;
  if (!request) return { kind: "none", noteKey: "ai_need_shop" };

  const { data } = await request;
  const shop = ((data ?? []) as { id: string; name: string }[])[0];
  if (!shop) return { kind: "none", noteKey: "ai_no_results" };

  const fee = await callFeeEngine(db, shop.id, shop.name, lat, lng);
  return { kind: "delivery_fee", fee };
}

async function callFeeEngine(
  db: Db,
  shopId: string,
  shopName: string,
  lat: number | null,
  lng: number | null,
): Promise<AssistantDeliveryFee> {
  const fail = (reason: DeliveryFailureReason): AssistantDeliveryFee => ({
    shopId,
    shopName,
    ok: false,
    distanceKm: null,
    deliveryFee: null,
    pricingRule: null,
    failureKey: DELIVERY_FAILURE_KEY[reason],
  });

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("calculate_delivery_fee", {
      p_shop_id: shopId,
      p_lat: (lat ?? null) as number,
      p_lng: (lng ?? null) as number,
    });
    if (error) {
      console.warn("[assistant] delivery fee RPC unavailable", error.message);
      return fail("error");
    }
    const raw = (data ?? {}) as RawQuote;
    if (raw.ok) {
      return {
        shopId,
        shopName,
        ok: true,
        distanceKm: raw.distance != null ? Number(raw.distance) : null,
        deliveryFee: raw.delivery_fee != null ? Number(raw.delivery_fee) : null,
        pricingRule: raw.pricing_rule ?? null,
        failureKey: null,
      };
    }
    return fail(normalizeReason(raw.reason));
  } catch (err) {
    console.warn("[assistant] delivery fee lookup failed", err);
    return fail("error");
  }
}

/**
 * The signed-in customer's own orders. Scoped by `customer_id = userId` AND
 * run through the caller's RLS session, so a customer can never see another
 * customer's rows. Anonymous callers get a typed sign-in result, not an error.
 */
export async function getMyOrders(
  db: Db | null,
  userId: string | null,
  input: { limit?: unknown },
): Promise<AssistantToolResult> {
  if (!db || !userId) return { kind: "none", noteKey: "ai_sign_in_orders" };
  const limit = Math.min(
    Math.max(Number(input.limit ?? ORDER_LIMIT) || ORDER_LIMIT, 1),
    ORDER_LIMIT,
  );
  try {
    const { data, error } = await db
      .from("orders")
      .select("id,order_code,status,payment_status,total,created_at")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const orders: AssistantOrder[] = (data ?? []).map((o) => ({
      id: o.id,
      orderCode: o.order_code,
      status: o.status,
      paymentStatus: o.payment_status,
      total: Number(o.total ?? 0),
      createdAt: o.created_at,
    }));
    if (orders.length === 0) return { kind: "none", noteKey: "ai_no_orders" };
    return { kind: "orders", orders };
  } catch (err) {
    console.warn("[assistant] order lookup failed", err);
    return { kind: "none", noteKey: "ai_orders_unavailable" };
  }
}

/** Special Moments suggestions. Reads degrade to empty before the migration. */
export async function suggestSpecialMoments(
  db: Db,
  input: { q?: unknown; occasion?: unknown; categorySlug?: unknown },
): Promise<AssistantToolResult> {
  const term = escapeLike(cleanTerm(input.q));
  const occasion = cleanTerm(input.occasion, 40);
  const categorySlug = cleanTerm(input.categorySlug, 40);

  let categoryId: string | null = null;
  if (categorySlug) {
    try {
      const { data } = await db
        .from("service_categories")
        .select("id")
        .eq("slug", categorySlug)
        .maybeSingle();
      categoryId = data?.id ?? null;
    } catch {
      categoryId = null;
    }
  }

  try {
    let query = db
      .from("services")
      .select(
        "id,slug,name,service_category_id,pricing_type,price,starting_price,image_url,occasion",
      )
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("sort_order")
      .limit(SERVICE_LIMIT);
    if (categoryId) query = query.eq("service_category_id", categoryId);
    if (occasion) query = query.ilike("occasion", `%${occasion}%`);
    if (term.length >= 2) {
      const like = `%${term}%`;
      query = query.or(`name.ilike.${like},description.ilike.${like},occasion.ilike.${like}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as {
      id: string;
      slug: string;
      name: string;
      service_category_id: string | null;
      pricing_type: string | null;
      price: number | null;
      starting_price: number | null;
      image_url: string | null;
    }[];
    if (rows.length === 0) return { kind: "none", noteKey: "ai_no_services" };

    const categoryIds = [...new Set(rows.map((r) => r.service_category_id).filter(Boolean))];
    const slugById = new Map<string, string>();
    if (categoryIds.length) {
      const { data: cats } = await db
        .from("service_categories")
        .select("id,slug")
        .in("id", categoryIds as string[]);
      for (const c of cats ?? []) slugById.set(c.id, c.slug);
    }

    const services: AssistantService[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      categorySlug: r.service_category_id ? (slugById.get(r.service_category_id) ?? null) : null,
      pricingType: (r.pricing_type === "quote" ? "quote" : "fixed") as PricingType,
      price: r.price != null ? Number(r.price) : null,
      startingPrice: r.starting_price != null ? Number(r.starting_price) : null,
      imageUrl: r.image_url,
    }));
    return { kind: "services", services };
  } catch (err) {
    console.warn("[assistant] services lookup failed", err);
    return { kind: "none", noteKey: "ai_no_services" };
  }
}

/** Day-of-week labels for the hours card, kept out of the model's reach. */
export type { AssistantHoursDay };
