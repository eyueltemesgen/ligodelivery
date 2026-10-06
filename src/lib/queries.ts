import { supabase } from "@/integrations/supabase/client";
import type { ShopHoursRow } from "@/lib/hours";

export type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
};
export type Shop = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  phone: string | null;
  address: string | null;
  image_url: string | null;
  cover_url: string | null;
  opens_at: string;
  closes_at: string;
  delivery_fee: number;
  delivery_time_min: number;
  rating: number;
  is_featured: boolean;
  is_online: boolean;
  is_active: boolean;
  owner_id: string | null;
  lat: number | null;
  lng: number | null;
};
export type Product = {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  discount_percent: number;
  image_url: string | null;
  in_stock: boolean;
  is_featured: boolean;
  is_popular: boolean;
};
export type Offer = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: string;
  discount_value: number;
  shop_id: string | null;
  product_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

const unwrap = <T>(res: { data: T | null; error: unknown }) => {
  if (res.error) throw res.error;
  return (res.data ?? []) as T;
};

/** Columns the storefront actually renders, so responses stay small. */
const SHOP_COLUMNS =
  "id,name,description,category_id,phone,address,image_url,cover_url,opens_at,closes_at,delivery_fee,delivery_time_min,rating,is_featured,is_online,is_active,owner_id,lat,lng";
const PRODUCT_COLUMNS =
  "id,shop_id,category_id,name,description,price,discount_percent,image_url,in_stock,is_featured,is_popular";
const OFFER_COLUMNS =
  "id,title,description,image_url,discount_type,discount_value,shop_id,product_id,starts_at,ends_at";

/** Upper bound on catalogue rows fetched in one request; the UI pages beyond this. */
export const SHOP_PAGE_SIZE = 60;
export const PRODUCT_PAGE_SIZE = 120;

export const categoriesQuery = {
  queryKey: ["categories"],
  staleTime: 5 * 60_000,
  queryFn: async () =>
    unwrap<Category[]>(
      await supabase
        .from("categories")
        .select("id,name,slug,image_url,sort_order")
        .eq("is_active", true)
        .order("sort_order"),
    ),
};

/**
 * Catalogue shops. Bounded by `SHOP_PAGE_SIZE` so a large marketplace never
 * streams its whole table to a phone; callers can raise `limit` for admin-like
 * views.
 */
export const shopsQuery = (categoryId?: string | null, limit = SHOP_PAGE_SIZE) => ({
  queryKey: ["shops", categoryId ?? "all", limit],
  staleTime: 3 * 60_000,
  queryFn: async () => {
    let q = supabase
      .from("shops")
      .select(SHOP_COLUMNS)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("rating", { ascending: false })
      .limit(limit);
    if (categoryId) q = q.eq("category_id", categoryId);
    return unwrap<Shop[]>(await q);
  },
});

export const shopQuery = (id: string) => ({
  queryKey: ["shop", id],
  staleTime: 3 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("shops")
      .select(SHOP_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as Shop | null;
  },
});

/**
 * Shop operating hours are auxiliary data: a missing shop_hours table or a
 * failed query must never block checkout. Falls back to an empty schedule,
 * which makes isShopOpenNow() use the shop-level opens_at/closes_at.
 */
export const shopHoursQuery = (shopId: string) => ({
  queryKey: ["shop-hours", shopId],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<ShopHoursRow[]> => {
    try {
      const { data, error } = await supabase
        .from("shop_hours")
        .select("*")
        .eq("shop_id", shopId)
        .order("day_of_week");
      if (error) throw error;
      return (data ?? []) as ShopHoursRow[];
    } catch (err) {
      console.warn("shop_hours unavailable, falling back to shop-level hours", err);
      return [] as ShopHoursRow[];
    }
  },
});

export const shopProductsQuery = (shopId: string, limit = PRODUCT_PAGE_SIZE) => ({
  queryKey: ["products", shopId, limit],
  staleTime: 3 * 60_000,
  queryFn: async () =>
    unwrap<Product[]>(
      await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("is_popular", { ascending: false })
        .order("name")
        .limit(limit),
    ),
});

export const featuredProductsQuery = {
  queryKey: ["products", "featured"],
  staleTime: 5 * 60_000,
  queryFn: async () =>
    unwrap<Product[]>(
      await supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .eq("is_popular", true)
        .limit(8),
    ),
};

export const offersQuery = {
  queryKey: ["offers"],
  staleTime: 5 * 60_000,
  queryFn: async () =>
    unwrap<Offer[]>(
      await supabase.from("offers").select(OFFER_COLUMNS).eq("is_active", true).limit(24),
    ),
};

export const searchQuery = (term: string) => ({
  queryKey: ["search", term],
  staleTime: 2 * 60_000,
  queryFn: async () => {
    if (!term.trim()) return { shops: [] as Shop[], products: [] as Product[] };
    const like = `%${term.trim()}%`;
    const [s, p] = await Promise.all([
      supabase
        .from("shops")
        .select(SHOP_COLUMNS)
        .eq("is_active", true)
        .ilike("name", like)
        .limit(12),
      supabase
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("is_active", true)
        .ilike("name", like)
        .limit(24),
    ]);
    return {
      shops: (s.data ?? []) as unknown as Shop[],
      products: (p.data ?? []) as Product[],
    };
  },
});

export type DeliveryFeeRule = {
  id: string;
  min_distance: number;
  max_distance: number | null;
  fee: number;
  label: string | null;
  is_active: boolean;
  priority: number;
};

/** Active distance brackets. Public so the checkout can show how a fee is built. */
export const deliveryFeeRulesQuery = {
  queryKey: ["delivery-fee-rules"],
  staleTime: 5 * 60_000,
  queryFn: async () =>
    unwrap<DeliveryFeeRule[]>(
      await supabase
        .from("delivery_fee_rules")
        .select("id,min_distance,max_distance,fee,label,is_active,priority")
        .eq("is_active", true)
        .order("priority")
        .order("min_distance"),
    ),
};

export type ProductOption = {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  sort_order: number;
  is_active?: boolean | undefined;
};
export type ProductOptionGroup = {
  id: string;
  product_id: string;
  name: string;
  is_required: boolean;
  is_multi: boolean;
  sort_order: number;
  product_options: ProductOption[];
};

/**
 * Real, per-product option groups. A missing table (migration not yet applied)
 * degrades to an empty list so products without options keep working.
 */
export const productOptionsQuery = (productId: string) => ({
  queryKey: ["product-options", productId],
  staleTime: 5 * 60_000,
  enabled: !!productId,
  queryFn: async (): Promise<ProductOptionGroup[]> => {
    try {
      const { data, error } = await supabase
        .from("product_option_groups")
        .select(
          "id,product_id,name,is_required,is_multi,sort_order,product_options(id,group_id,name,price_delta,sort_order,is_active)",
        )
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (
        (data ?? []) as unknown as (ProductOptionGroup & {
          product_options: (ProductOption & { is_active: boolean })[];
        })[]
      ).map((g) => ({
        ...g,
        product_options: (g.product_options ?? [])
          .filter((o) => o.is_active !== false)
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
    } catch (err) {
      if (import.meta.env.DEV) console.warn("product options unavailable", err);
      return [];
    }
  },
});

export const publicSettingsQuery = {
  queryKey: ["settings", "public"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const { data } = await supabase.from("settings").select("key,value");
    const map: Record<string, unknown> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map as Record<string, Record<string, unknown>>;
  },
};
