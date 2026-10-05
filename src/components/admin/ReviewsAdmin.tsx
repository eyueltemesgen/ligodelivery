import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { isMissingTable, supabaseErrorText } from "@/lib/supa-error";
import { setReviewHidden } from "@/lib/reviews";
import { formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";

type AdminReview = {
  id: string;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
  created_at: string;
  shop_id: string;
  product_id: string | null;
  customer_id: string;
};

/** Admin moderation console for shop/product reviews (hide or restore). */
export function ReviewsAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async (): Promise<AdminReview[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,comment,is_hidden,created_at,shop_id,product_id,customer_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        if (isMissingTable(error)) return [];
        throw error;
      }
      return (data ?? []) as AdminReview[];
    },
  });

  const { data: shops = {} } = useQuery({
    queryKey: ["admin-review-shops"],
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,name");
      return Object.fromEntries((data ?? []).map((s) => [s.id, s.name])) as Record<string, string>;
    },
  });

  const { data: products = {} } = useQuery({
    queryKey: ["admin-review-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name");
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.name])) as Record<string, string>;
    },
  });

  const mutation = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) => setReviewHidden(id, hidden),
    onSuccess: () => {
      toast.success(t("rev_admin_updated"));
      void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      void qc.invalidateQueries({ queryKey: ["shop-reviews"] });
      void qc.invalidateQueries({ queryKey: ["product-reviews"] });
      void qc.invalidateQueries({ queryKey: ["shop"] });
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(supabaseErrorText(t, err)),
  });

  const subject = useCallback(
    (r: AdminReview) =>
      r.product_id
        ? t("rev_admin_product", { name: products[r.product_id] ?? "—" })
        : t("rev_admin_shop", { name: shops[r.shop_id] ?? "—" }),
    [products, shops, t],
  );

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter === "visible" && r.is_hidden) return false;
      if (filter === "hidden" && !r.is_hidden) return false;
      if (!q) return true;
      return subject(r).toLowerCase().includes(q) || (r.comment ?? "").toLowerCase().includes(q);
    });
  }, [reviews, term, filter, subject]);

  const counts = useMemo(
    () => ({
      all: reviews.length,
      visible: reviews.filter((r) => !r.is_hidden).length,
      hidden: reviews.filter((r) => r.is_hidden).length,
    }),
    [reviews],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t("rev_admin_search")}
          className="h-9 max-w-xs"
        />
        <div className="flex gap-1">
          {(
            [
              { value: "all", key: "rev_admin_filter_all" },
              { value: "visible", key: "rev_admin_filter_visible" },
              { value: "hidden", key: "rev_admin_filter_hidden" },
            ] as const
          ).map(({ value, key }) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "default" : "outline"}
              onClick={() => setFilter(value)}
            >
              {t(key)} ({counts[value]})
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("rev_admin_loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("rev_admin_empty")}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i <= r.rating ? "fill-warning text-warning" : "text-muted-foreground/40"
                        }`}
                      />
                    ))}
                  </span>
                  <span className="text-sm font-semibold">{subject(r)}</span>
                  {r.is_hidden && <Badge variant="secondary">{t("rev_admin_hidden")}</Badge>}
                  <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
              </div>
              <Button
                size="sm"
                variant={r.is_hidden ? "default" : "outline"}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: r.id, hidden: !r.is_hidden })}
              >
                {r.is_hidden ? (
                  <>
                    <Eye className="mr-1 h-4 w-4" /> {t("rev_admin_restore")}
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-1 h-4 w-4" /> {t("rev_admin_hide")}
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
