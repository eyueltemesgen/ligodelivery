import { r as supabase } from "./client-D2C38fHY.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/queries-DB3Dy3Ev.js
var unwrap = (res) => {
	if (res.error) throw res.error;
	return res.data ?? [];
};
var categoriesQuery = {
	queryKey: ["categories"],
	queryFn: async () => unwrap(await supabase.from("categories").select("id,name,slug,image_url,sort_order").eq("is_active", true).order("sort_order"))
};
var shopsQuery = (categoryId) => ({
	queryKey: ["shops", categoryId ?? "all"],
	queryFn: async () => {
		let q = supabase.from("shops").select("*").eq("is_active", true).order("is_featured", { ascending: false });
		if (categoryId) q = q.eq("category_id", categoryId);
		return unwrap(await q);
	}
});
var shopQuery = (id) => ({
	queryKey: ["shop", id],
	queryFn: async () => {
		const { data, error } = await supabase.from("shops").select("*").eq("id", id).maybeSingle();
		if (error) throw error;
		return data;
	}
});
/**
* Shop operating hours are auxiliary data: a missing shop_hours table or a
* failed query must never block checkout. Falls back to an empty schedule,
* which makes isShopOpenNow() use the shop-level opens_at/closes_at.
*/
var shopHoursQuery = (shopId) => ({
	queryKey: ["shop-hours", shopId],
	queryFn: async () => {
		try {
			const { data, error } = await supabase.from("shop_hours").select("*").eq("shop_id", shopId).order("day_of_week");
			if (error) throw error;
			return data ?? [];
		} catch (err) {
			console.warn("shop_hours unavailable, falling back to shop-level hours", err);
			return [];
		}
	}
});
var shopProductsQuery = (shopId) => ({
	queryKey: ["products", shopId],
	queryFn: async () => unwrap(await supabase.from("products").select("*").eq("shop_id", shopId).eq("is_active", true).order("name"))
});
var featuredProductsQuery = {
	queryKey: ["products", "featured"],
	queryFn: async () => unwrap(await supabase.from("products").select("*").eq("is_active", true).eq("is_popular", true).limit(8))
};
var offersQuery = {
	queryKey: ["offers"],
	queryFn: async () => unwrap(await supabase.from("offers").select("*").eq("is_active", true))
};
var searchQuery = (term) => ({
	queryKey: ["search", term],
	queryFn: async () => {
		if (!term.trim()) return {
			shops: [],
			products: []
		};
		const like = `%${term.trim()}%`;
		const [s, p] = await Promise.all([supabase.from("shops").select("*").eq("is_active", true).ilike("name", like).limit(12), supabase.from("products").select("*").eq("is_active", true).ilike("name", like).limit(24)]);
		return {
			shops: s.data ?? [],
			products: p.data ?? []
		};
	}
});
var publicSettingsQuery = {
	queryKey: ["settings", "public"],
	queryFn: async () => {
		const { data } = await supabase.from("settings").select("key,value");
		const map = {};
		for (const row of data ?? []) map[row.key] = row.value;
		return map;
	}
};
//#endregion
export { searchQuery as a, shopQuery as c, publicSettingsQuery as i, shopsQuery as l, featuredProductsQuery as n, shopHoursQuery as o, offersQuery as r, shopProductsQuery as s, categoriesQuery as t };
