/**
 * Admin review moderation.
 *
 * The `reviews` table, the `set_review_hidden` RPC and the `rev_admin_*` i18n
 * copy all shipped with `20261005150000_reviews.sql`, but no screen ever called
 * them: a review could only be moderated by hand in SQL. That matters more than
 * it sounds — a customer can only review a delivered order, so a review is real
 * customer feedback that stays visible to every shopper until an admin hides it.
 *
 * Hiding is reversible and never deletes: `is_hidden` only removes the row from
 * public reads and from the shops/products aggregates, which the DB recomputes
 * in `reviews_recompute_aggregates`. So this screen cannot corrupt a rating, it
 * only decides what shoppers see.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { isMissingTable, supabaseErrorText } from "@/lib/supa-error";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/account/Reviews";
import { ErrorState } from "@/components/account/States";

type ModerationReview = {
  id: string;
  order_id: string;
  shop_id: string;
  product_id: string | null;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
  created_at: string;
};

const COLUMNS = "id,order_id,shop_id,product_id,rating,comment,is_hidden,created_at" as const;

type Filter = "all" | "visible" | "hidden";

export function ReviewsAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    data: reviews = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-reviews"],
    // A hidden row is invisible to everyone but an admin, so this list is the
    // only place moderation state is visible.
    queryFn: async () => {
      const { data, error: qError } = await supabase
        .from("reviews")
        .select(COLUMNS)
        .order("created_at", { ascending: false })
        .limit(200);
      if (qError) {
        // Tolerate the migration not being applied yet rather than crashing the
        // whole ops console.
        if (isMissingTable(qError)) return [];
        throw qError;
      }
      return (data ?? []) as ModerationReview[];
    },
  });

  // Resolve the shop and product names once for the rows on screen.
  const shopIds = useMemo(() => [...new Set(reviews.map((r) => r.shop_id))], [reviews]);
  const productIds = useMemo(
    () => [...new Set(reviews.map((r) => r.product_id).filter((id): id is string => !!id))],
    [reviews],
  );

  const { data: shops = [] } = useQuery({
    queryKey: ["admin-review-shops", shopIds],
    enabled: shopIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,name").in("id", shopIds);
      return data ?? [];
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin-review-products", productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name").in("id", productIds);
      return data ?? [];
    },
  });

  const shopName = (id: string) => shops.find((s) => s.id === id)?.name ?? "—";
  const productName = (id: string | null) =>
    id ? (products.find((p) => p.id === id)?.name ?? "—") : null;

  const visible = reviews.filter((r) => {
    if (filter === "visible" && r.is_hidden) return false;
    if (filter === "hidden" && !r.is_hidden) return false;
    if (!term.trim()) return true;
    const needle = term.trim().toLowerCase();
    return (
      (r.comment ?? "").toLowerCase().includes(needle) ||
      shopName(r.shop_id).toLowerCase().includes(needle) ||
      (productName(r.product_id) ?? "").toLowerCase().includes(needle)
    );
  });

  const setHidden = async (review: ModerationReview, hidden: boolean) => {
    setBusyId(review.id);
    const { error } = await supabase.rpc("set_review_hidden", {
      _review_id: review.id,
      _hidden: hidden,
    });
    setBusyId(null);
    if (error) {
      toast.error(supabaseErrorText(t, error));
      return;
    }
    toast.success(t("rev_admin_updated"));
    // The aggregates changed too, so refresh both this list and any public
    // shop/product reads that may be cached.
    void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    void qc.invalidateQueries({ queryKey: ["shop-reviews"] });
    void qc.invalidateQueries({ queryKey: ["shops"] });
  };

  const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: t("rev_admin_filter_all") },
    { value: "visible", label: t("rev_admin_filter_visible") },
    { value: "hidden", label: t("rev_admin_filter_hidden") },
  ];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t("rev_admin_search")}
          aria-label={t("rev_admin_search")}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("rev_admin_loading")}</p>
      ) : error ? (
        <ErrorState description={supabaseErrorText(t, error)} onRetry={() => void refetch()} />
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("rev_admin_empty")}</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRating value={r.rating} />
                    <span className="text-sm font-semibold">{r.rating}/5</span>
                    {r.is_hidden && (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                        {t("rev_admin_hidden")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("rev_admin_shop", { name: shopName(r.shop_id) })}
                    {productName(r.product_id)
                      ? ` · ${t("rev_admin_product", { name: productName(r.product_id) ?? "" })}`
                      : ""}
                    {" · "}
                    {formatDate(r.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={r.is_hidden ? "outline" : "destructive"}
                  disabled={busyId === r.id}
                  onClick={() => void setHidden(r, !r.is_hidden)}
                >
                  {r.is_hidden ? t("rev_admin_restore") : t("rev_admin_hide")}
                </Button>
              </div>
              {r.comment && <p className="mt-3 text-sm">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
