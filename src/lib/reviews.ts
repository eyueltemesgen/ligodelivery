/**
 * Customer reviews for shops and products.
 *
 * The `reviews` table and the `submit_review` RPC shipped in
 * `20261005150000_reviews.sql` with i18n copy, but no screen ever read or wrote
 * them — so customers could not rate a delivered order and shops showed nothing.
 * This module is the missing client data layer.
 *
 * Reads are public (hidden rows are filtered server-side by RLS), writes go
 * only through the verified-purchase RPC so a customer cannot review an order
 * they do not own. Both degrade to empty/no-op when the migration is not yet
 * applied, so the pages that use them never break.
 */
import { supabase } from "@/integrations/supabase/client";
import { isMissingTable, supabaseErrorMessage } from "@/lib/supa-error";

export type ReviewRow = {
  id: string;
  order_id: string;
  shop_id: string;
  product_id: string | null;
  /**
   * Only present on the customer's own reviews (`COLUMNS`); public shop reads
   * omit it so anonymous visitors are not handed customer identifiers.
   */
  customer_id?: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

const COLUMNS = "id,order_id,shop_id,product_id,customer_id,rating,comment,created_at";

/**
 * Public columns. `customer_id` is deliberately excluded: shop reviews are
 * readable by anonymous visitors, and the UI never renders the author, so
 * selecting it would hand every visitor a list of customer UUIDs for nothing.
 */
const PUBLIC_COLUMNS = "id,order_id,shop_id,product_id,rating,comment,created_at";

const softList = async (
  q: PromiseLike<{ data: unknown; error: unknown }>,
): Promise<ReviewRow[]> => {
  try {
    const { data, error } = await q;
    if (error) {
      if (!isMissingTable(error)) console.warn("[reviews] query failed", error);
      return [];
    }
    return (data ?? []) as ReviewRow[];
  } catch (err) {
    console.warn("[reviews] query threw", err);
    return [];
  }
};

/**
 * Visible shop-level reviews for a shop, newest first.
 *
 * Filtered to `product_id IS NULL` on purpose: `shops.rating_count` (the badge
 * on the shop cards) is computed over shop-level reviews only, so the list and
 * the header it feeds must use the same set or the page shows two different
 * counts. Product reviews stay visible in admin moderation.
 */
export const shopReviewsQuery = (shopId: string, limit = 30) => ({
  queryKey: ["shop-reviews", shopId, limit],
  staleTime: 60_000,
  enabled: !!shopId,
  queryFn: async () =>
    softList(
      supabase
        .from("reviews")
        .select(PUBLIC_COLUMNS)
        .eq("shop_id", shopId)
        .is("product_id", null)
        .order("created_at", { ascending: false })
        .limit(limit),
    ),
});

/** The signed-in customer's own reviews for one order, so the form prefills. */
export const orderReviewsQuery = (orderId: string, userId: string | undefined) => ({
  queryKey: ["order-reviews", orderId, userId],
  enabled: !!orderId && !!userId,
  queryFn: async () =>
    softList(
      supabase.from("reviews").select(COLUMNS).eq("order_id", orderId).eq("customer_id", userId!),
    ),
});

/**
 * Upsert one review line via the verified-purchase RPC. `productId` omitted =
 * a shop-level review. Throws a readable message on failure.
 */
export async function submitReview(
  orderId: string,
  rating: number,
  comment: string,
  productId?: string,
) {
  const trimmed = comment.trim();
  const { error } = await supabase.rpc("submit_review", {
    _order_id: orderId,
    _rating: rating,
    ...(trimmed ? { _comment: trimmed } : {}),
    ...(productId ? { _product_id: productId } : {}),
  });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export const averageRating = (reviews: ReviewRow[]) =>
  reviews.length
    ? Math.round((reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length) * 10) / 10
    : 0;
