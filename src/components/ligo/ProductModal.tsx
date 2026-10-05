import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Star } from "lucide-react";
import { toast } from "@/lib/toast";
import type { Product, ProductOptionGroup } from "@/lib/queries";
import { productOptionsQuery } from "@/lib/queries";
import { ETB, discounted } from "@/lib/format";
import { StorageImage } from "@/lib/media";
import { cartLineId, useCart, type CartOption } from "@/lib/cart";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Product customization dialog. Options come from the database
 * (`product_option_groups` / `product_options`); products without option groups
 * simply get a quantity picker. The selected option ids travel to checkout and
 * are re-priced and validated server-side.
 */
export function ProductModal({
  product,
  shopName,
  open,
  onOpenChange,
}: {
  product: Product | null;
  shopName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { add } = useCart();
  const { t } = useLanguage();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const { data: groups = [] } = useQuery(productOptionsQuery(product?.id ?? ""));

  const price = useMemo(
    () => (product ? discounted(Number(product.price), product.discount_percent) : 0),
    [product],
  );

  const selectedOptions = useMemo<CartOption[]>(() => {
    const out: CartOption[] = [];
    for (const g of groups) {
      for (const id of picked[g.id] ?? []) {
        const opt = g.product_options.find((o) => o.id === id);
        if (opt)
          out.push({
            id: opt.id,
            group: g.name,
            name: opt.name,
            priceDelta: Number(opt.price_delta),
          });
      }
    }
    return out;
  }, [groups, picked]);

  const addonsTotal = selectedOptions.reduce((sum, o) => sum + o.priceDelta, 0);
  const unitPrice = price + addonsTotal;

  const missingRequired = groups.some((g) => g.is_required && (picked[g.id]?.length ?? 0) === 0);

  const reset = () => {
    setQty(1);
    setNotes("");
    setPicked({});
  };

  // Default single-choice groups to their first option so the price is concrete.
  useEffect(() => {
    if (!product) return;
    setPicked((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (!g.is_multi && g.is_required && !next[g.id]?.length && g.product_options[0])
          next[g.id] = [g.product_options[0].id];
      }
      return next;
    });
  }, [groups, product]);

  const toggle = (group: ProductOptionGroup, optionId: string) => {
    setPicked((prev) => {
      const current = prev[group.id] ?? [];
      if (group.is_multi) {
        return {
          ...prev,
          [group.id]: current.includes(optionId)
            ? current.filter((c) => c !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [group.id]: [optionId] };
    });
  };

  const addToCart = () => {
    if (!product || missingRequired) return;
    add(
      {
        productId: product.id,
        shopId: product.shop_id,
        shopName,
        name: product.name,
        imagePath: product.image_url,
        unitPrice,
        options: selectedOptions,
      },
      qty,
    );
    toast.success(t("pm_added", { name: product.name }));
    onOpenChange(false);
    reset();
  };

  if (!product) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <div className="relative -mx-6 -mt-6 h-52 overflow-hidden sm:rounded-t-lg">
          <StorageImage
            path={product.image_url}
            alt={product.name}
            width={900}
            height={390}
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-3">
            <span>{product.name}</span>
            <span className="shrink-0 font-display text-lg">{ETB(price)}</span>
          </DialogTitle>
          {Number(product.rating_count) > 0 && (
            <p className="flex items-center gap-1 text-sm font-semibold text-warning-foreground">
              <Star className="h-4 w-4 fill-warning text-warning" />
              {Number(product.rating).toFixed(1)}
              <span className="font-normal text-muted-foreground">
                {t("rev_count", { count: Number(product.rating_count) })}
              </span>
            </p>
          )}
          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2">
          {groups.map((g) => (
            <div key={g.id}>
              <p className="text-sm font-bold">
                {g.name}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {g.is_required ? t("pm_required") : t("pm_optional")}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.product_options.map((o) => {
                  const active = picked[g.id]?.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggle(g, o.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      {o.name}
                      {Number(o.price_delta) > 0 && (
                        <span className="ml-1">+{ETB(Number(o.price_delta))}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="text-sm font-bold">{t("pm_instructions")}</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("pm_instructions_placeholder")}
              className="mt-2"
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-3 rounded-full border border-border px-2 py-1.5">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label={t("cart_decrease")}
              className="rounded-full p-1 hover:bg-secondary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-5 text-center font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              aria-label={t("cart_increase")}
              className="rounded-full p-1 hover:bg-secondary"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            className="flex-1"
            onClick={addToCart}
            disabled={!product.in_stock || missingRequired}
          >
            {!product.in_stock
              ? t("pm_out_of_stock")
              : missingRequired
                ? t("pm_choose_required")
                : t("pm_add_to_order", { total: ETB(unitPrice * qty) })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
