/**
 * Reviews UI: a star picker + comments list.
 *
 * Reads come from `shopReviewsQuery`/`orderReviewsQuery`; writes go through the
 * verified-purchase `submit_review` RPC. Nothing here invents a rating — the
 * aggregate shown on a shop card is `shops.rating`, which the DB recomputes
 * from real reviews.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import {
  averageRating,
  orderReviewsQuery,
  shopReviewsQuery,
  submitReview,
  type ReviewRow,
} from "@/lib/reviews";

/** Read-only star row, with an optional numeric value. */
export function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={n <= rounded ? "fill-warning text-warning" : "text-muted-foreground/40"}
        />
      ))}
    </span>
  );
}

/** Interactive 1–5 star picker used by the submit form. */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={t("rev_stars_label")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t("rev_star_n", { n })}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 ${n <= value ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
          />
        </button>
      ))}
    </div>
  );
}

/** One review line: stars, comment, verified badge, date. */
function ReviewItem({ review }: { review: ReviewRow }) {
  const { t } = useLanguage();
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <StarRating value={review.rating} />
        <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
      </div>
      {review.comment && <p className="mt-2 text-sm">{review.comment}</p>}
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-primary">
        {t("rev_verified")}
      </p>
    </li>
  );
}

/** Public list of a shop's reviews, with a header count. */
export function ShopReviews({ shopId }: { shopId: string }) {
  const { t } = useLanguage();
  const { data = [], isLoading } = useQuery(shopReviewsQuery(shopId));
  const avg = averageRating(data);
  return (
    <section className="pt-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">{t("rev_shop_title")}</h2>
        {data.length > 0 && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <StarRating value={avg} />
            <span className="font-semibold text-foreground">{avg.toFixed(1)}</span>·{" "}
            {t(data.length === 1 ? "rev_count_one" : "rev_count", { count: data.length })}
          </span>
        )}
      </div>
      {isLoading ? null : data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("rev_empty")}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Review form for one order (shop-level or one product line). Prefills from the
 * customer's existing review and updates in place through the upsert RPC.
 */
export function OrderReviewForm({
  orderId,
  userId,
  shopName,
  productId,
  productName,
}: {
  orderId: string;
  userId: string;
  shopName?: string | undefined;
  productId?: string | undefined;
  productName?: string | undefined;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: existing = [] } = useQuery(orderReviewsQuery(orderId, userId));
  const current = existing.find((r) => (r.product_id ?? null) === (productId ?? null));
  const [rating, setRating] = useState(current?.rating ?? 0);
  const [comment, setComment] = useState(current?.comment ?? "");
  const [busy, setBusy] = useState(false);

  // Prefill once the existing review resolves.
  useEffect(() => {
    setRating(current?.rating ?? 0);
    setComment(current?.comment ?? "");
  }, [current?.id, current?.rating, current?.comment]);

  const target = productId
    ? (productName ?? t("common_products"))
    : (shopName ?? t("rev_shop_label"));

  const save = async () => {
    if (rating < 1) {
      toast.error(t("rev_stars_label"));
      return;
    }
    setBusy(true);
    try {
      await submitReview(orderId, rating, comment, productId);
      toast.success(t("rev_saved"));
      void qc.invalidateQueries({ queryKey: ["order-reviews", orderId, userId] });
      void qc.invalidateQueries({ queryKey: ["shop-reviews"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("supa_request_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{target}</p>
        {current && <span className="text-xs text-primary">{t("rev_verified")}</span>}
      </div>
      <div className="mt-2">
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("rev_comment_placeholder")}
        className="mt-2 min-h-16 text-sm"
        aria-label={t("rev_comment_placeholder")}
      />
      <Button size="sm" className="mt-2" disabled={busy || rating < 1} onClick={() => void save()}>
        {busy ? "…" : current ? t("rev_update") : t("rev_submit")}
      </Button>
    </div>
  );
}
