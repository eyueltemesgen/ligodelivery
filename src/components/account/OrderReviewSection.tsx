import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { supabaseErrorText } from "@/lib/supa-error";
import { myOrderReviewsQuery, submitReview, type MyReview } from "@/lib/reviews";
import type { OrderItemRow } from "@/lib/account";
import { StarInput } from "@/components/ligo/Reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";

type Target = { productId: string | null; label: string };

/** One star + comment form for a product line or the shop. */
function ReviewForm({
  orderId,
  target,
  existing,
  onSaved,
}: {
  orderId: string;
  target: Target;
  existing: MyReview | undefined;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");

  // Keep the form in sync when the saved review loads/changes underneath.
  useEffect(() => {
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? "");
  }, [existing?.id, existing?.rating, existing?.comment]);

  const mutation = useMutation({
    mutationFn: () => submitReview({ orderId, rating, comment, productId: target.productId }),
    onSuccess: () => {
      toast.success(t("rev_saved"));
      onSaved();
    },
    onError: (err) => toast.error(supabaseErrorText(t, err)),
  });

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{target.label}</p>
        {existing && (
          <span className="text-[11px] font-medium text-primary">{t("rev_your_rating")}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <StarInput value={rating} onChange={setRating} disabled={mutation.isPending} />
        {rating > 0 && <span className="text-xs text-muted-foreground">{rating}/5</span>}
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("rev_comment_placeholder")}
        className="mt-2 min-h-16"
        maxLength={600}
      />
      {existing?.is_hidden && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3" /> {t("rev_hidden_note")}
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          disabled={rating === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {existing ? t("rev_update") : t("rev_submit")}
        </Button>
      </div>
    </div>
  );
}

/** Rider rating form; uses the existing rider_ratings table (one row per order). */
function RiderReview({
  orderId,
  riderId,
  userId,
  onSaved,
}: {
  orderId: string;
  riderId: string;
  userId: string | undefined;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["my-rider-rating", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rider_ratings")
        .select("id,rating,comment")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existing && !loaded) {
      setRating(existing.rating);
      setComment(existing.comment ?? "");
      setLoaded(true);
    }
  }, [existing, loaded]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rider_ratings").upsert(
        {
          order_id: orderId,
          rider_id: riderId,
          customer_id: userId!,
          rating,
          comment: comment.trim() || null,
        },
        { onConflict: "order_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("rev_saved"));
      onSaved();
    },
    onError: (err) => toast.error(supabaseErrorText(t, err)),
  });

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t("rev_rider_label")}</p>
        {existing && (
          <span className="text-[11px] font-medium text-primary">{t("rev_your_rating")}</span>
        )}
      </div>
      <div className="mt-2">
        <StarInput value={rating} onChange={setRating} disabled={mutation.isPending} />
      </div>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("rev_comment_placeholder")}
        className="mt-2 min-h-16"
        maxLength={600}
      />
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          disabled={rating === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {existing ? t("rev_update") : t("rev_submit")}
        </Button>
      </div>
    </div>
  );
}

/**
 * "Rate your order" block shown once an order is delivered. Renders one form
 * per purchased line plus a shop-level form, and (when a rider was assigned) a
 * rider rating. All writes are re-validated server-side by the RPC / RLS.
 */
export function OrderReviewSection({
  orderId,
  shopId,
  shopName,
  riderId,
  items,
  userId,
}: {
  orderId: string;
  shopId: string | null;
  shopName: string | undefined;
  riderId: string | null;
  items: OrderItemRow[];
  userId: string | undefined;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: mine = [] } = useQuery(myOrderReviewsQuery(orderId, userId));

  const saved = () => {
    void qc.invalidateQueries({ queryKey: ["my-order-reviews", orderId] });
    void qc.invalidateQueries({ queryKey: ["my-rider-rating", orderId] });
    void qc.invalidateQueries({ queryKey: ["shop-reviews"] });
    void qc.invalidateQueries({ queryKey: ["product-reviews"] });
    void qc.invalidateQueries({ queryKey: ["shop", shopId] });
    void qc.invalidateQueries({ queryKey: ["products"] });
    void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  };

  const byProduct = (productId: string | null) =>
    mine.find((r) => (r.product_id ?? null) === productId);

  const reviewableItems = items.filter((it) => it.product_id);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-lg font-bold">{t("rev_title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("rev_subtitle")}</p>
      <div className="mt-4 space-y-3">
        {reviewableItems.map((it) => (
          <ReviewForm
            key={it.id}
            orderId={orderId}
            target={{ productId: it.product_id, label: it.product_name }}
            existing={byProduct(it.product_id)}
            onSaved={saved}
          />
        ))}
        {shopId && (
          <ReviewForm
            orderId={orderId}
            target={{ productId: null, label: shopName ?? t("rev_shop_label") }}
            existing={byProduct(null)}
            onSaved={saved}
          />
        )}
        {riderId && (
          <RiderReview orderId={orderId} riderId={riderId} userId={userId} onSaved={saved} />
        )}
      </div>
    </section>
  );
}
