-- Performance indexes for the storefront's hottest read paths.
--
-- Additive and idempotent: safe to apply on an existing database and safe to
-- skip (queries still work, just with sequential scans on large tables). No
-- table or column is altered and no data is touched.

-- Shop listing: WHERE is_active ORDER BY is_featured DESC, rating DESC
CREATE INDEX IF NOT EXISTS shops_active_featured_rating_idx
  ON public.shops (is_active, is_featured DESC, rating DESC);

-- Shop product listing: WHERE shop_id = ? AND is_active ORDER BY is_popular DESC, name
CREATE INDEX IF NOT EXISTS products_shop_active_popular_idx
  ON public.products (shop_id, is_active, is_popular DESC, name);

-- Homepage featured products: WHERE is_active AND is_popular
CREATE INDEX IF NOT EXISTS products_active_popular_idx
  ON public.products (is_active, is_popular);

-- Customer order history: WHERE customer_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS orders_customer_created_idx
  ON public.orders (customer_id, created_at DESC);

-- Admin dashboard window: WHERE created_at >= ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS orders_created_idx
  ON public.orders (created_at DESC);

-- Offer listing: WHERE is_active
CREATE INDEX IF NOT EXISTS offers_active_idx
  ON public.offers (is_active);

-- Active categories ordered for the nav/homepage grid.
CREATE INDEX IF NOT EXISTS categories_active_sort_idx
  ON public.categories (is_active, sort_order);
