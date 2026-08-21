import type { Category, Offer, Product, Shop } from "@/lib/queries";

/**
 * Built-in mock data used as a graceful fallback when Supabase tables are
 * missing, empty, or slow. Every consumer treats these as safe defaults so the
 * storefront never throws on a network or schema issue.
 */

export const FALLBACK_CATEGORIES: Category[] = [
  { id: "cat-food", name: "Food & Restaurants", slug: "food", image_url: null, sort_order: 1 },
  { id: "cat-grocery", name: "Groceries", slug: "groceries", image_url: null, sort_order: 2 },
  { id: "cat-pharmacy", name: "Pharmacy", slug: "pharmacy", image_url: null, sort_order: 3 },
  { id: "cat-drinks", name: "Drinks", slug: "drinks", image_url: null, sort_order: 4 },
  { id: "cat-bakery", name: "Bakery", slug: "bakery", image_url: null, sort_order: 5 },
  { id: "cat-essentials", name: "Essentials", slug: "essentials", image_url: null, sort_order: 6 },
];

export const FALLBACK_SHOPS: Shop[] = [
  {
    id: "shop-1",
    name: "Ligo Burger House",
    description: "Smash burgers, fries and shakes",
    category_id: "cat-food",
    phone: "+251911000001",
    address: "Kebele 03, Bishoftu",
    image_url: null,
    cover_url: null,
    opens_at: "08:00",
    closes_at: "22:00",
    delivery_fee: 40,
    delivery_time_min: 18,
    rating: 4.8,
    is_featured: true,
    is_online: true,
    owner_id: null,
  },
  {
    id: "shop-2",
    name: "Green Grocer Bishoftu",
    description: "Fresh fruit, vegetables and staples",
    category_id: "cat-grocery",
    phone: "+251911000002",
    address: "Kebele 01, Bishoftu",
    image_url: null,
    cover_url: null,
    opens_at: "07:00",
    closes_at: "21:00",
    delivery_fee: 30,
    delivery_time_min: 22,
    rating: 4.6,
    is_featured: true,
    is_online: true,
    owner_id: null,
  },
  {
    id: "shop-3",
    name: "City Pharmacy",
    description: "Medicine, wellness and personal care",
    category_id: "cat-pharmacy",
    phone: "+251911000003",
    address: "Kebele 05, Bishoftu",
    image_url: null,
    cover_url: null,
    opens_at: "08:30",
    closes_at: "20:00",
    delivery_fee: 50,
    delivery_time_min: 15,
    rating: 4.9,
    is_featured: false,
    is_online: true,
    owner_id: null,
  },
];

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    shop_id: "shop-1",
    category_id: "cat-food",
    name: "Classic Smash Burger",
    description: "Beef patty, cheese, house sauce",
    price: 220,
    discount_percent: 0,
    image_url: null,
    in_stock: true,
    is_featured: true,
    is_popular: true,
  },
  {
    id: "prod-2",
    shop_id: "shop-1",
    category_id: "cat-food",
    name: "Crispy Fries",
    description: "Golden fries with sea salt",
    price: 90,
    discount_percent: 0,
    image_url: null,
    in_stock: true,
    is_featured: false,
    is_popular: true,
  },
  {
    id: "prod-3",
    shop_id: "shop-2",
    category_id: "cat-grocery",
    name: "Fresh Avocado (1kg)",
    description: "Locally sourced, ripe today",
    price: 180,
    discount_percent: 10,
    image_url: null,
    in_stock: true,
    is_featured: true,
    is_popular: true,
  },
];

export const FALLBACK_OFFERS: Offer[] = [];

/** Run a Supabase query, falling back to mock data on any error or empty result. */
export async function withFallback<T>(run: () => Promise<T[]>, fallback: T[]): Promise<T[]> {
  try {
    const data = await run();
    return Array.isArray(data) && data.length > 0 ? data : fallback;
  } catch (err) {
    console.warn("[fallback] query failed, using built-in mock data", err);
    return fallback;
  }
}
