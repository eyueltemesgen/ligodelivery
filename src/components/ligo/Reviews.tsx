import { Star } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Review } from "@/lib/reviews";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";

/** Read-only star row; fills to the nearest whole star. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${Number(value).toFixed(1)} / 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= Math.round(Number(value))
              ? "fill-warning text-warning"
              : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

/** Interactive 1–5 picker used when writing or editing a review. */
export function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={t("rev_stars_label")}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={t("rev_star_n", { n: i })}
          disabled={disabled}
          onClick={() => onChange(i)}
          className="rounded p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Star
            className={cn(
              "h-6 w-6",
              i <= value ? "fill-warning text-warning" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Public review list with a translated empty state. */
export function ReviewList({ reviews }: { reviews: Review[] }) {
  const { t } = useLanguage();
  if (reviews.length === 0)
    return <p className="text-sm text-muted-foreground">{t("rev_empty")}</p>;
  return (
    <ul className="divide-y divide-border">
      {reviews.map((r) => (
        <li key={r.id} className="py-3">
          <div className="flex items-center gap-2">
            <Stars value={r.rating} />
            <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
              {t("rev_verified")}
            </span>
          </div>
          {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
        </li>
      ))}
    </ul>
  );
}
