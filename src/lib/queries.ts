import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; name: string; slug: string; image_url: string | null; sort_order: number };
export type Shop = {
  id: string; name: string; description: string | null; category_id: string | null;
  phone: string | null; address: string | null; image_url: string | null; cover_url: string | null;
  opens_at: string; closes_at: string; delivery_fee: number; delivery_time_min: number;
  rating: number; is_featured: boolean;
};
export type Product = {
  id: string; shop_id: string; category_id: string | null; name: string; description: string | null;
  price: number; discount_percent: number; image_url: string | null; in_stock: boolean;
  is_featured: boolean; is_popular: boolean;
};
export type Offer = {
  id: string; title: string; description: string | null; image_url: string | null;
  discount_type: string; discount_value: number; shop_id: string | null; product_id: string | null;
  starts_at: string | null; ends_at: string | null;
};

const unwrap = <T,>(res: { data: T | null; error: unknown }) => {
  if (res.error) throw res.error;
  return (res.data ?? []) as T;
};

export const categoriesQuery = {
  queryKey: ["categories"],
  queryFn: async () =>
    unwrap<Category[]>(
      await supabase.from("categories").select("id,name,slug,image_url,sort_order").eq("is_active", true).order("sort_order"),
    ),
};

export const shopsQuery = (categoryId?: string | null) => ({
  queryKey: ["shops", categoryId ?? "all"],
  queryFn: async () => {
    let q = supabase.from("shops").select("*").eq("is_active", true).order("is_featured", { ascending: false });
    if (categoryId) q = q.eq("category_id", categoryId);
    return unwrap<Shop[]>(await q);
  },
});

export const shopQuery = (id: string) => ({
  queryKey: ["shop", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("shops").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data as Shop | null;
  },
});

export const shopProductsQuery = (shopId: string) => ({
  queryKey: ["products", shopId],
  queryFn: async () =>
    unwrap<Product[]>(
      await supabase.from("products").select("*").eq("shop_id", shopId).eq("is_active", true).order("name"),
    ),
});

export const featuredProductsQuery = {
  queryKey: ["products", "featured"],
  queryFn: async () =>
    unwrap<Product[]>(
      await supabase.from("products").select("*").eq("is_active", true).eq("is_popular", true).limit(8),
    ),
};

export const offersQuery = {
  queryKey: ["offers"],
  queryFn: async () => unwrap<Offer[]>(await supabase.from("offers").select("*").eq("is_active", true)),
};

export const searchQuery = (term: string) => ({
  queryKey: ["search", term],
  queryFn: async () => {
    if (!term.trim()) return { shops: [] as Shop[], products: [] as Product[] };
    const like = `%${term.trim()}%`;
    const [s, p] = await Promise.all([
      supabase.from("shops").select("*").eq("is_active", true).ilike("name", like).limit(12),
      supabase.from("products").select("*").eq("is_active", true).ilike("name", like).limit(24),
    ]);
    return { shops: (s.data ?? []) as Shop[], products: (p.data ?? []) as Product[] };
  },
});

export const publicSettingsQuery = {
  queryKey: ["settings", "public"],
  queryFn: async () => {
    const { data } = await supabase.from("settings").select("key,value");
    const map: Record<string, any> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  },
};
