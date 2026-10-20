import { supabase } from "@/integrations/supabase/client";
import { isMissingRpc, isMissingTable } from "@/lib/supa-error";

/**
 * Verified ratings & reviews.
 *
 * The backend (`20261005150000_reviews.sql`) is a single order-scoped `reviews`
 * table covering shops (`product_id` NULL) and products, plus the
 * `submit_review` / `set_review_hidden` RPCs. Writes go through those RPCs, so
 * a customer can only review an order they own and that was delivered; the
 * aggregate `shops.rating` / `products.rating` columns are recomputed by a
 * trigger and are never written from the client.
 *
 * Every read here degrades to empty if the migration has not been applied yet,
 * so the storefront still renders. Writes surface the RPC error instead, since
 * silently dropping a review would be worse than a clear failure.
 */

export type ReviewRow = {
  id: string;
  order_id: string;
  customer_id: string;
  shop_id: string;
  product_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

const REVIEW_COLUMNS = "id,order_id,customer_id,shop_id,product_id,rating,comment,created_at";

/** Reviews are publicly readable; hidden ones are filtered by RLS for visitors. */
async function fetchReviews(
  match: Record<string, string | null>,
  limit: number,
): Promise<ReviewRow[]> {
  try {
    let q = supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(limit);
    for (const [col, value] of Object.entries(match)) {
      q = value === null ? q.is(col, null) : q.eq(col, value);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as ReviewRow[];
  } catch (err) {
    if (isMissingTable(err) || isMissingRpc(err)) return [];
    throw err;
  }
}

/** Shop-level reviews (the ones that drive `shops.rating`). */
export const shopReviewsQuery = (shopId: string | undefined, limit = 20) => ({
  queryKey: ["reviews", "shop", shopId, limit],
  enabled: !!shopId,
  staleTime: 60_000,
  queryFn: () => fetchReviews({ shop_id: shopId ?? null, product_id: null }, limit),
});

export const productReviewsQuery = (productId: string | undefined, limit = 10) => ({
  queryKey: ["reviews", "product", productId, limit],
  enabled: !!productId,
  staleTime: 60_000,
  queryFn: () => fetchReviews({ product_id: productId ?? null }, limit),
});

/** The reviews this customer already left on one order, so the UI can edit them. */
export const orderReviewsQuery = (orderId: string | undefined) => ({
  queryKey: ["reviews", "order", orderId],
  enabled: !!orderId,
  staleTime: 30_000,
  queryFn: () => fetchReviews({ order_id: orderId ?? null }, 50),
});

export type RatingStats = { average: number; count: number; breakdown: number[] };

/**
 * `breakdown` is indexed by star (index 0 = 1 star … index 4 = 5 stars) so the
 * histogram renders without re-scanning the list.
 */
export function ratingStats(reviews: ReviewRow[]): RatingStats {
  const breakdown = [0, 0, 0, 0, 0];
  if (reviews.length === 0) return { average: 0, count: 0, breakdown };
  let sum = 0;
  for (const r of reviews) {
    const star = Math.min(Math.max(Math.round(r.rating), 1), 5);
    breakdown[star - 1] = (breakdown[star - 1] ?? 0) + 1;
    sum += star;
  }
  return { average: sum / reviews.length, count: reviews.length, breakdown };
}

/** Percentage of the total a bar should fill, guarding division by zero. */
export function starPercent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

export type SubmitReviewInput = {
  orderId: string;
  rating: number;
  comment?: string | null;
  /** Omit for a shop review; pass the product id for a product review. */
  productId?: string | null;
};

/**
 * Create or update the caller's review for one order line (or the order's shop
 * review). The RPC enforces ownership and a `delivered` status, and the unique
 * indexes make this an upsert, so re-submitting edits rather than duplicating.
 */
export async function submitReview(input: SubmitReviewInput): Promise<void> {
  const comment = input.comment?.trim() || undefined;
  const { error } = await supabase.rpc("submit_review", {
    _order_id: input.orderId,
    _rating: input.rating,
    ...(comment ? { _comment: comment } : {}),
    ...(input.productId ? { _product_id: input.productId } : {}),
  });
  if (error) throw error;
}

export type RiderRatingRow = {
  id: string;
  order_id: string;
  rider_id: string;
  customer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export const riderRatingQuery = (orderId: string | undefined) => ({
  queryKey: ["rider-rating", orderId],
  enabled: !!orderId,
  staleTime: 30_000,
  queryFn: async (): Promise<RiderRatingRow | null> => {
    try {
      const { data, error } = await supabase
        .from("rider_ratings")
        .select("id,order_id,rider_id,customer_id,rating,comment,created_at")
        .eq("order_id", orderId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as RiderRatingRow | null) ?? null;
    } catch (err) {
      if (isMissingTable(err)) return null;
      throw err;
    }
  },
});

/**
 * Rate the rider. `order_id` is UNIQUE, so this upserts to allow a re-rate
 * (the `rider_ratings_update_customer` policy permits the update). RLS only
 * accepts a delivered order the caller owns, so the guard is server-side.
 */
export async function submitRiderRating(input: {
  orderId: string;
  riderId: string;
  customerId: string;
  rating: number;
  comment?: string;
}): Promise<void> {
  const { error } = await supabase.from("rider_ratings").upsert(
    {
      order_id: input.orderId,
      rider_id: input.riderId,
      customer_id: input.customerId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    },
    { onConflict: "order_id" },
  );
  if (error) throw error;
}

/** Admin moderation: hide or restore a review. */
export async function setReviewHidden(reviewId: string, hidden: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_review_hidden", {
    _review_id: reviewId,
    _hidden: hidden,
  });
  if (error) throw error;
}
