import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { ratingStats, starPercent, type ReviewRow } from "@/lib/reviews";

/** Read-only star row. Half stars are rounded to the nearest whole star. */
export function StarRating({
  value,
  size = "sm",
  showValue = false,
  count,
}: {
  value: number;
  size?: "sm" | "md" | "lg" | undefined;
  showValue?: boolean | undefined;
  count?: number | undefined;
}) {
  const { t } = useLanguage();
  const rounded = Math.round(Number(value) || 0);
  const box = size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span
      className="flex items-center gap-1"
      aria-label={t("rv_stars", { count: rounded })}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${box} ${
            star <= rounded ? "fill-warning text-warning" : "text-muted-foreground/40"
          }`}
          aria-hidden
        />
      ))}
      {showValue && (
        <span className="text-xs font-semibold text-muted-foreground">
          {Number(value) > 0 ? Number(value).toFixed(1) : t("rv_be_first")}
          {count != null && count > 0 ? ` (${count})` : ""}
        </span>
      )}
    </span>
  );
}

/** Interactive 1-5 star picker. */
export function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean | undefined;
}) {
  const { t } = useLanguage();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={t("rv_your_rating")}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={t("rv_stars", { count: star })}
          disabled={disabled}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(star)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(star)}
          className="rounded p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
        >
          <Star
            className={`h-7 w-7 ${
              star <= shown ? "fill-warning text-warning" : "text-muted-foreground/40"
            }`}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

/** One review, as rendered in a list. */
export function ReviewItem({ review }: { review: ReviewRow }) {
  const { t } = useLanguage();
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <StarRating value={review.rating} />
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
          {t("rv_verified")}
        </span>
      </div>
      {review.comment && (
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{review.comment}</p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {new Date(review.created_at).toLocaleDateString()}
      </p>
    </li>
  );
}

/** Average + histogram, shown above a review list. */
export function RatingSummary({ reviews }: { reviews: ReviewRow[] }) {
  const { t } = useLanguage();
  const stats = ratingStats(reviews);
  if (stats.count === 0) return null;
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-secondary/50 p-4 sm:flex-row sm:items-center">
      <div className="text-center sm:w-32">
        <p className="font-display text-3xl font-extrabold">{stats.average.toFixed(1)}</p>
        <StarRating value={stats.average} size="md" />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {stats.count === 1 ? t("rv_based_on_one") : t("rv_based_on", { count: stats.count })}
        </p>
      </div>
      <div className="flex-1 space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.breakdown[star - 1] ?? 0;
          return (
            <div key={star} className="flex items-center gap-2 text-[11px]">
              <span className="w-8 shrink-0 text-muted-foreground">
                {t("rv_stars", { count: star })}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-warning"
                  style={{ width: `${starPercent(count, stats.count)}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Public review list for a shop or product. Renders an empty state when bare. */
export function ReviewList({
  reviews,
  title,
  emptyText,
}: {
  reviews: ReviewRow[];
  title: string;
  emptyText?: string | undefined;
}) {
  const { t } = useLanguage();
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {reviews.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {emptyText ?? t("rv_no_reviews_desc")}
        </p>
      ) : (
        <>
          <RatingSummary reviews={reviews} />
          <ul className="space-y-3">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * Star + comment form. Used for a shop review, a product review and a rider
 * rating; `onSubmit` receives the chosen rating and the trimmed comment.
 */
export function ReviewForm({
  title,
  initialRating = 0,
  initialComment = "",
  submitting,
  onSubmit,
  submitLabel,
}: {
  title: string;
  initialRating?: number | undefined;
  initialComment?: string | undefined;
  submitting?: boolean | undefined;
  onSubmit: (rating: number, comment: string) => void;
  submitLabel?: string | undefined;
}) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  return (
    <form
      className="space-y-3 rounded-lg border border-border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (rating < 1) return;
        onSubmit(rating, comment.trim());
      }}
    >
      <p className="font-display text-sm font-bold">{title}</p>
      <StarPicker value={rating} onChange={setRating} disabled={submitting} />
      <div className="space-y-1.5">
        <Label htmlFor="rv-comment" className="text-xs">
          {t("rv_comment_label")}
        </Label>
        <Textarea
          id="rv-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("rv_comment_placeholder")}
          rows={3}
        />
      </div>
      <Button type="submit" size="sm" disabled={submitting || rating < 1}>
        {submitLabel ?? t("rv_submit")}
      </Button>
    </form>
  );
}
