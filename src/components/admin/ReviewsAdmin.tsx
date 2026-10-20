import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Star } from "lucide-react";
import { toast } from "@/lib/toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorText, isMissingTable } from "@/lib/supa-error";
import { setReviewHidden, type ReviewRow } from "@/lib/reviews";
import { StarRating } from "@/components/reviews/ReviewUI";
import { ListSkeleton } from "@/components/account/States";
import { Button } from "@/components/ui/button";

type AdminReviewRow = ReviewRow & {
  is_hidden: boolean;
  shops: { name: string } | null;
  products: { name: string } | null;
};

type Filter = "all" | "visible" | "hidden";

/**
 * Review moderation. Admins see hidden rows too (RLS allows it), and toggling
 * visibility goes through `set_review_hidden`, which is the only write path —
 * the aggregate rating columns are recomputed by a trigger on the same table.
 */
export function ReviewsAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin", "reviews"],
    staleTime: 30_000,
    queryFn: async (): Promise<AdminReviewRow[]> => {
      try {
        const { data, error } = await supabase
          .from("reviews")
          .select(
            "id,order_id,customer_id,shop_id,product_id,rating,comment,created_at,is_hidden,shops(name),products(name)",
          )
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        return (data ?? []) as unknown as AdminReviewRow[];
      } catch (err) {
        if (isMissingTable(err)) return [];
        throw err;
      }
    },
  });

  const filtered = useMemo(() => {
    if (filter === "visible") return reviews.filter((r) => !r.is_hidden);
    if (filter === "hidden") return reviews.filter((r) => r.is_hidden);
    return reviews;
  }, [reviews, filter]);

  const toggle = async (row: AdminReviewRow) => {
    setBusy(row.id);
    try {
      await setReviewHidden(row.id, !row.is_hidden);
      void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
      // The storefront average and list both moved.
      void qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success(t("aop_saved"));
    } catch (err) {
      toast.error(supabaseErrorText(t, err));
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) return <ListSkeleton rows={3} />;

  const hiddenCount = reviews.filter((r) => r.is_hidden).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">{t("rv_admin_title")}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t("rv_admin_desc")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "rv_admin_filter_all"],
            ["visible", "rv_admin_filter_visible"],
            ["hidden", "rv_admin_filter_hidden"],
          ] as const
        ).map(([value, key]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === value
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {t(key)}
          </button>
        ))}
        <span className="text-xs text-muted-foreground">
          {reviews.length} · {hiddenCount} {t("rv_admin_hidden")}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-card">
          {t("rv_admin_empty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li
              key={r.id}
              className={`rounded-xl border border-border bg-card p-4 shadow-card ${
                r.is_hidden ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRating value={r.rating} />
                    <span className="text-xs font-semibold">
                      {r.products?.name ?? r.shops?.name ?? "—"}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase">
                      {r.product_id ? t("rv_admin_product") : t("rv_admin_shop")}
                    </span>
                    {r.is_hidden && (
                      <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive">
                        {t("rv_admin_hidden")}
                      </span>
                    )}
                  </div>
                  {r.comment && (
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{r.comment}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy === r.id}
                  onClick={() => void toggle(r)}
                >
                  {r.is_hidden ? (
                    <>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      {t("rv_admin_restore")}
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                      {t("rv_admin_hide")}
                    </>
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Star className="h-3 w-3" />
        {t("rv_verified")}
      </p>
    </div>
  );
}
