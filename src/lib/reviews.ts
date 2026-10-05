import { supabase } from "@/integrations/supabase/client";
import { isMissingTable } from "@/lib/supa-error";

/** A visible review row as the storefront renders it. Reviewer identity is
 *  deliberately not fetched: `profiles` is own-row-only, so public lists show
 *  "verified purchase" instead of a customer name. */
export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

/** A review the signed-in customer wrote, used to prefill the order form. */
export type MyReview = Review & {
  order_id: string;
  product_id: string | null;
  is_hidden: boolean;
};

/** Upper bound on reviews fetched per shop/product detail view. */
export const REVIEW_PAGE_SIZE = 30;

const REVIEW_COLUMNS = "id,rating,comment,created_at";

/** Reviews are auxiliary: a missing table (migration not applied) degrades to an
 *  empty list rather than erroring the shop/product page. */
const listReviews = async (
  column: "shop_id" | "product_id",
  id: string,
  limit: number,
): Promise<Review[]> => {
  let q = supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq(column, id)
    .order("created_at", { ascending: false })
    .limit(limit);
  // A shop-level review has product_id NULL; product reviews are shown on the
  // product itself, so keep them out of the shop's review list.
  if (column === "shop_id") q = q.is("product_id", null);
  const { data, error } = await q;
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []) as Review[];
};

export const shopReviewsQuery = (shopId: string, limit = REVIEW_PAGE_SIZE) => ({
  queryKey: ["shop-reviews", shopId, limit],
  staleTime: 2 * 60_000,
  queryFn: () => listReviews("shop_id", shopId, limit),
});

export const productReviewsQuery = (productId: string, limit = REVIEW_PAGE_SIZE) => ({
  queryKey: ["product-reviews", productId, limit],
  staleTime: 2 * 60_000,
  queryFn: () => listReviews("product_id", productId, limit),
});

/** The customer's own reviews for one order (RLS also returns their hidden rows). */
export const myOrderReviewsQuery = (orderId: string, userId: string | undefined) => ({
  queryKey: ["my-order-reviews", orderId, userId],
  enabled: !!userId,
  staleTime: 0,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("id,rating,comment,created_at,order_id,product_id,is_hidden")
      .eq("order_id", orderId)
      .eq("customer_id", userId!);
    if (error) {
      if (isMissingTable(error)) return [] as MyReview[];
      throw error;
    }
    return (data ?? []) as MyReview[];
  },
});

/**
 * Create or update the caller's review for an order line (or the shop when
 * `productId` is omitted). The RPC re-checks ownership and delivered status.
 */
export async function submitReview(input: {
  orderId: string;
  rating: number;
  comment?: string | null;
  productId?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("submit_review", {
    _order_id: input.orderId,
    _rating: input.rating,
    _comment: input.comment?.trim() || null,
    _product_id: input.productId ?? null,
  });
  if (error) throw error;
}

/** Admin-only moderation: hide or restore a review. */
export async function setReviewHidden(reviewId: string, hidden: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_review_hidden", {
    _review_id: reviewId,
    _hidden: hidden,
  });
  if (error) throw error;
}
