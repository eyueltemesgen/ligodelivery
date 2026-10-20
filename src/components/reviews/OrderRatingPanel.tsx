import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "@/lib/toast";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabaseErrorText } from "@/lib/supa-error";
import {
  orderReviewsQuery,
  riderRatingQuery,
  submitReview,
  submitRiderRating,
  type ReviewRow,
} from "@/lib/reviews";
import { ReviewForm, StarRating } from "@/components/reviews/ReviewUI";
import { Button } from "@/components/ui/button";

export type RateableItem = {
  productId: string;
  name: string;
};

/**
 * Post-delivery rating panel: one shop review, one review per order line, and
 * one rider rating. Renders nothing until the order is delivered, because the
 * `submit_review` RPC rejects anything else.
 *
 * Reviews are an upsert keyed on the order (and the line), so a returning
 * customer sees their existing stars and edits rather than duplicating.
 */
export function OrderRatingPanel({
  orderId,
  shopName,
  riderId,
  items,
}: {
  orderId: string;
  shopName: string | undefined;
  riderId: string | null | undefined;
  items: RateableItem[];
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const { data: reviews = [] } = useQuery(orderReviewsQuery(orderId));
  const { data: riderRating } = useQuery({
    ...riderRatingQuery(orderId),
    enabled: !!orderId && !!riderId,
  });

  // Shop review = the row with no product; product reviews are keyed by product.
  const byProduct = useMemo(() => {
    const map = new Map<string, ReviewRow>();
    for (const r of reviews) if (r.product_id) map.set(r.product_id, r);
    return map;
  }, [reviews]);
  const shopReview = useMemo(() => reviews.find((r) => !r.product_id) ?? null, [reviews]);

  const doneCount = (shopReview ? 1 : 0) + byProduct.size + (riderRating ? 1 : 0);
  const totalCount = 1 + items.length + (riderId ? 1 : 0);
  const allDone = doneCount >= totalCount;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["reviews", "order", orderId] });
    void qc.invalidateQueries({ queryKey: ["rider-rating", orderId] });
    // The aggregate columns moved, so the storefront rating is stale too.
    void qc.invalidateQueries({ queryKey: ["reviews"] });
    void qc.invalidateQueries({ queryKey: ["shop"] });
    void qc.invalidateQueries({ queryKey: ["shops"] });
  };

  const saveShop = async (rating: number, comment: string) => {
    setBusy("shop");
    try {
      await submitReview({ orderId, rating, comment });
      toast.success(t("rv_thanks"));
      refresh();
    } catch (err) {
      toast.error(supabaseErrorText(t, err));
    } finally {
      setBusy(null);
    }
  };

  const saveProduct = async (productId: string, rating: number, comment: string) => {
    setBusy(productId);
    try {
      await submitReview({ orderId, rating, comment, productId });
      toast.success(t("rv_thanks"));
      refresh();
    } catch (err) {
      toast.error(supabaseErrorText(t, err));
    } finally {
      setBusy(null);
    }
  };

  const saveRider = async (rating: number, comment: string) => {
    if (!user || !riderId) return;
    setBusy("rider");
    try {
      await submitRiderRating({
        orderId,
        riderId,
        customerId: user.id,
        rating,
        comment,
      });
      toast.success(t("rv_rider_thanks"));
      refresh();
    } catch (err) {
      toast.error(supabaseErrorText(t, err));
    } finally {
      setBusy(null);
    }
  };

  if (allDone && !open) {
    return (
      <section className="space-y-2 rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold">
            <Star className="h-4 w-4 fill-warning text-warning" />
            {t("rv_title")}
          </h2>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
            {t("rv_reviewed")}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{t("rv_thanks")}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          {shopReview && <StarRating value={shopReview.rating} showValue />}
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t("rv_update")}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <Star className="h-4 w-4 fill-warning text-warning" />
          {t("rv_title")}
        </h2>
        {doneCount > 0 && (
          <span className="text-[11px] font-semibold text-muted-foreground">
            {doneCount}/{totalCount}
          </span>
        )}
      </div>

      <ReviewForm
        title={t("rv_rate_shop")}
        initialRating={shopReview?.rating ?? 0}
        initialComment={shopReview?.comment ?? ""}
        submitting={busy === "shop"}
        onSubmit={(r, c) => void saveShop(r, c)}
        submitLabel={shopReview ? t("rv_update") : t("rv_submit")}
      />

      {items.map((item) => {
        const existing = byProduct.get(item.productId);
        return (
          <ReviewForm
            key={item.productId}
            title={`${t("rv_rate_product")} · ${item.name}`}
            initialRating={existing?.rating ?? 0}
            initialComment={existing?.comment ?? ""}
            submitting={busy === item.productId}
            onSubmit={(r, c) => void saveProduct(item.productId, r, c)}
            submitLabel={existing ? t("rv_update") : t("rv_submit")}
          />
        );
      })}

      {riderId && (
        <ReviewForm
          title={t("rv_rate_rider")}
          initialRating={riderRating?.rating ?? 0}
          initialComment={riderRating?.comment ?? ""}
          submitting={busy === "rider"}
          onSubmit={(r, c) => void saveRider(r, c)}
          submitLabel={riderRating ? t("rv_update") : t("rv_submit")}
        />
      )}

      {shopName && <p className="text-[11px] text-muted-foreground">{shopName}</p>}
    </section>
  );
}
