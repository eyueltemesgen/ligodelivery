import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/queries";
import { ETB, discounted } from "@/lib/format";
import { StorageImage } from "@/lib/media";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Standard customization groups. The product table has no addon columns, so
 * options are a curated per-item client preset — safe with any backend.
 * Labels are translation keys resolved against the active language.
 */
export type OptionGroup = {
  key: string;
  labelKey: string;
  choices: { nameKey: string; priceDelta: number }[];
  multi: boolean;
};

export const DEFAULT_OPTION_GROUPS: OptionGroup[] = [
  {
    key: "size",
    labelKey: "product.optionSize",
    multi: false,
    choices: [
      { nameKey: "product.sizeRegular", priceDelta: 0 },
      { nameKey: "product.sizeLarge", priceDelta: 40 },
      { nameKey: "product.sizeFamily", priceDelta: 90 },
    ],
  },
  {
    key: "extras",
    labelKey: "product.optionExtras",
    multi: true,
    choices: [
      { nameKey: "product.extraCheese", priceDelta: 25 },
      { nameKey: "product.extraSauce", priceDelta: 10 },
      { nameKey: "product.spicy", priceDelta: 0 },
      { nameKey: "product.extraPortion", priceDelta: 45 },
    ],
  },
];

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
  const { t } = useI18n();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const price = useMemo(
    () => (product ? discounted(Number(product.price), product.discount_percent) : 0),
    [product],
  );

  const addonsTotal = useMemo(() => {
    let sum = 0;
    for (const g of DEFAULT_OPTION_GROUPS) {
      for (const c of g.choices) if (picked[g.key]?.includes(c.nameKey)) sum += c.priceDelta;
    }
    return sum;
  }, [picked]);

  const unitPrice = price + addonsTotal;

  const reset = () => {
    setQty(1);
    setNotes("");
    setPicked({});
  };

  const toggle = (group: OptionGroup, choice: string) => {
    setPicked((prev) => {
      const current = prev[group.key] ?? [];
      if (group.multi) {
        return {
          ...prev,
          [group.key]: current.includes(choice)
            ? current.filter((c) => c !== choice)
            : [...current, choice],
        };
      }
      return { ...prev, [group.key]: [choice] };
    });
  };

  const addToCart = () => {
    if (!product) return;
    const selections = DEFAULT_OPTION_GROUPS.flatMap((g) =>
      (picked[g.key] ?? []).map((c) => `${t(g.labelKey)}: ${t(c)}`),
    );
    const noteText = [selections.join(" · "), notes.trim()].filter(Boolean).join(" — ");
    add(
      {
        productId: product.id,
        shopId: product.shop_id,
        shopName,
        name: noteText ? `${product.name} (${noteText})` : product.name,
        imagePath: product.image_url,
        unitPrice,
      },
      qty,
    );
    toast.success(t("product.addedToCart", { name: product.name }));
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
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-3">
            <span className="min-w-0">{product.name}</span>
            <span className="shrink-0 font-display text-lg">{ETB(price)}</span>
          </DialogTitle>
          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-2">
          {DEFAULT_OPTION_GROUPS.map((g) => (
            <div key={g.key}>
              <p className="text-sm font-bold">
                {t(g.labelKey)}
                {g.multi && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({t("common.optional")})
                  </span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.choices.map((c) => {
                  const active = picked[g.key]?.includes(c.nameKey);
                  return (
                    <button
                      key={c.nameKey}
                      type="button"
                      onClick={() => toggle(g, c.nameKey)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      {t(c.nameKey)}
                      {c.priceDelta > 0 && <span className="ml-1">+{ETB(c.priceDelta)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="text-sm font-bold">{t("product.specialInstructions")}</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("product.instructionsPlaceholder")}
              className="mt-2"
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-3 rounded-full border border-border px-2 py-1.5">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label={t("product.decreaseQty")}
              className="rounded-full p-1 hover:bg-secondary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-5 text-center font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              aria-label={t("product.increaseQty")}
              className="rounded-full p-1 hover:bg-secondary"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button className="flex-1" onClick={addToCart} disabled={!product.in_stock}>
            {product.in_stock
              ? t("product.addToOrder", { amount: ETB(unitPrice * qty) })
              : t("common.outOfStock")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
