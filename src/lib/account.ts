import { supabase } from "@/integrations/supabase/client";
import { isOrderOpen } from "@/lib/orders";
import { isMissingColumn } from "@/lib/supa-error";

/**
 * Customer account data access. Every query is scoped to the signed-in user by
 * RLS; the explicit `user_id` filter keeps query keys stable and lets React
 * Query cache per customer.
 */

export type OrderRow = {
  id: string;
  order_code: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tip: number;
  total: number;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_instructions: string | null;
  delivery_pin: string | null;
  shop_id: string | null;
  rider_id: string | null;
  lat: number | null;
  lng: number | null;
  // Delivery fee engine snapshot (present once the migration is applied).
  delivery_distance?: number | null;
  delivery_rule?: string | null;
  shop_lat?: number | null;
  shop_lng?: number | null;
  customer_lat?: number | null;
  customer_lng?: number | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
};

export type ShopLite = {
  id: string;
  name: string;
  image_url: string | null;
  cover_url: string | null;
  delivery_fee: number;
  delivery_time_min: number;
  is_online: boolean;
};

export type AddressRow = {
  id: string;
  user_id: string;
  label: string;
  full_name: string | null;
  phone: string | null;
  address: string;
  area: string | null;
  city: string;
  instructions: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
};

const unwrap = <T>(res: { data: T | null; error: unknown }, fallback: T): T => {
  if (res.error) throw res.error;
  return (res.data ?? fallback) as T;
};

/**
 * For optional account features (saved products, favourite shops, receipts),
 * a missing/unreachable table should degrade to an empty result instead of
 * breaking the whole page. The primary order queries stay strict.
 */
const soft = async <T>(
  q: PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
): Promise<T> => {
  try {
    const res = await q;
    return res.error ? fallback : ((res.data ?? fallback) as T);
  } catch {
    return fallback;
  }
};

const softCount = async (
  q: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> => {
  try {
    const { count, error } = await q;
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
};

/** Page size for order history; the list grows on demand. */
export const ORDER_PAGE_SIZE = 25;

/**
 * Column list for order reads. The delivery-fee snapshot columns are additive;
 * if the migration has not been applied yet PostgREST rejects the select, so
 * callers fall back to the legacy columns instead of failing to load orders.
 */
const ORDER_COLUMNS_FULL =
  "id,order_code,status,payment_status,payment_method,subtotal,delivery_fee,discount,tip,total,customer_name,customer_phone,delivery_address,delivery_instructions,delivery_pin,shop_id,rider_id,lat,lng,delivery_distance,delivery_rule,shop_lat,shop_lng,customer_lat,customer_lng,created_at,updated_at";
const ORDER_COLUMNS_LEGACY =
  "id,order_code,status,payment_status,payment_method,subtotal,delivery_fee,discount,tip,total,customer_name,customer_phone,delivery_address,delivery_instructions,delivery_pin,shop_id,rider_id,lat,lng,created_at,updated_at";

async function selectOrderRows(
  userId: string,
  limit: number,
): Promise<{ data: OrderRow[] | null; error: unknown }> {
  const run = (cols: string) =>
    supabase
      .from("orders")
      .select(cols)
      .eq("customer_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
  const first = await run(ORDER_COLUMNS_FULL);
  if (first.error && isMissingColumn(first.error)) {
    return (await run(ORDER_COLUMNS_LEGACY)) as unknown as {
      data: OrderRow[] | null;
      error: unknown;
    };
  }
  return first as unknown as { data: OrderRow[] | null; error: unknown };
}

export const ordersQuery = (userId: string | undefined, limit = ORDER_PAGE_SIZE) => ({
  queryKey: ["account-orders", userId, limit],
  enabled: !!userId,
  queryFn: async () => unwrap<OrderRow[]>(await selectOrderRows(userId!, limit), []),
});

/** Products for a set of orders, grouped by order id. */
export const orderItemsQuery = (orderIds: string[]) => ({
  queryKey: ["account-order-items", [...orderIds].sort().join(",")],
  enabled: orderIds.length > 0,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("order_items")
      .select("id,order_id,product_id,product_name,image_url,unit_price,quantity")
      .in("order_id", orderIds);
    if (error) throw error;
    const byOrder: Record<string, OrderItemRow[]> = {};
    for (const row of (data ?? []) as OrderItemRow[]) {
      (byOrder[row.order_id] ??= []).push(row);
    }
    return byOrder;
  },
});

export const shopsByIdsQuery = (shopIds: string[]) => ({
  queryKey: ["account-shops", [...shopIds].sort().join(",")],
  enabled: shopIds.length > 0,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("shops")
      .select("id,name,image_url,cover_url,delivery_fee,delivery_time_min,is_online")
      .in("id", shopIds);
    if (error) throw error;
    const map: Record<string, ShopLite> = {};
    for (const row of (data ?? []) as ShopLite[]) map[row.id] = row;
    return map;
  },
});

export const orderQuery = (orderId: string | undefined, userId: string | undefined) => ({
  queryKey: ["account-order", orderId, userId],
  enabled: !!orderId && !!userId,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId!)
      .eq("customer_id", userId!)
      .maybeSingle();
    if (error) throw error;
    return data as OrderRow | null;
  },
});

export const addressesQuery = (userId: string | undefined) => ({
  queryKey: ["addresses", userId],
  enabled: !!userId,
  queryFn: async () =>
    unwrap<AddressRow[]>(
      await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", userId!)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }),
      [],
    ),
});

export type WishlistRow = {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    discount_percent: number;
    image_url: string | null;
    in_stock: boolean;
    is_active: boolean;
    shop_id: string;
    shops: { id: string; name: string; is_online: boolean } | null;
  } | null;
};

export const wishlistQuery = (userId: string | undefined) => ({
  queryKey: ["wishlist", userId],
  enabled: !!userId,
  queryFn: async () =>
    soft<WishlistRow[]>(
      supabase
        .from("wishlist")
        .select(
          "id,product_id,created_at,products(id,name,description,price,discount_percent,image_url,in_stock,is_active,shop_id,shops(id,name,is_online))",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false }),
      [],
    ),
});

export type FavoriteRow = {
  id: string;
  shop_id: string;
  created_at: string;
  shops: ShopLite | null;
};

export const favoritesQuery = (userId: string | undefined) => ({
  queryKey: ["shop-favorites", userId],
  enabled: !!userId,
  queryFn: async () =>
    soft<FavoriteRow[]>(
      supabase
        .from("shop_favorites")
        .select(
          "id,shop_id,created_at,shops(id,name,image_url,cover_url,delivery_fee,delivery_time_min,is_online)",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false }),
      [],
    ),
});

export const notificationsQuery = (userId: string | undefined) => ({
  queryKey: ["notifications", userId],
  enabled: !!userId,
  queryFn: async () =>
    unwrap<NotificationRow[]>(
      await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(60),
      [],
    ),
});

export type AccountSummary = {
  orders: OrderRow[];
  openOrders: number;
  activeOrder: OrderRow | null;
  totalOrders: number;
  totalSpent: number;
  addressCount: number;
  wishlistCount: number;
  favoriteCount: number;
  unreadNotifications: number;
};

/**
 * Aggregated account overview. Counts use head-only requests so the dashboard
 * stays cheap on mid-range devices and slow connections.
 */
export const accountSummaryQuery = (userId: string | undefined) => ({
  queryKey: ["account-summary", userId],
  enabled: !!userId,
  queryFn: async (): Promise<AccountSummary> => {
    const [orders, addressCount, wishlistCount, favoriteCount, unreadNotifications] =
      await Promise.all([
        selectOrderRows(userId!, 30).then((r) =>
          r.error ? ([] as OrderRow[]) : ((r.data ?? []) as OrderRow[]),
        ),
        softCount(
          supabase
            .from("addresses")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId!),
        ),
        softCount(
          supabase
            .from("wishlist")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId!),
        ),
        softCount(
          supabase
            .from("shop_favorites")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId!),
        ),
        softCount(
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId!)
            .eq("is_read", false),
        ),
      ]);
    const active = orders.find((o) => isOrderOpen(o.status)) ?? null;
    return {
      orders,
      activeOrder: active,
      openOrders: orders.filter((o) => isOrderOpen(o.status)).length,
      totalOrders: orders.length,
      totalSpent: orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + Number(o.total ?? 0), 0),
      addressCount,
      wishlistCount,
      favoriteCount,
      unreadNotifications,
    };
  },
});

/** Products that a customer ordered most recently, for one-tap reordering. */
export const recentProductsQuery = (userId: string | undefined) => ({
  queryKey: ["account-recent-products", userId],
  enabled: !!userId,
  queryFn: async () => {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_id", userId!)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    const ids = (orders ?? []).map((o) => o.id);
    if (ids.length === 0) return [];
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id,product_name,image_url,unit_price,created_at")
      .in("order_id", ids)
      .not("product_id", "is", null);
    if (itemsError) throw itemsError;
    const seen = new Set<string>();
    return (items ?? []).filter((i) => {
      if (!i.product_id || seen.has(i.product_id)) return false;
      seen.add(i.product_id);
      return true;
    });
  },
});
