import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/queries";
import { ETB, discounted } from "@/lib/format";
import { StorageImage } from "@/lib/media";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Standard customization groups. The product table has no addon columns, so
 * options are a curated per-item client preset — safe with any backend.
 */
export type OptionGroup = {
  key: string;
  label: string;
  choices: { name: string; priceDelta: number }[];
  multi: boolean;
};

export const DEFAULT_OPTION_GROUPS: OptionGroup[] = [
  {
    key: "size",
    label: "Size",
    multi: false,
    choices: [
      { name: "Regular", priceDelta: 0 },
      { name: "Large", priceDelta: 40 },
      { name: "Family", priceDelta: 90 },
    ],
  },
  {
    key: "extras",
    label: "Extras",
    multi: true,
    choices: [
      { name: "Extra cheese", priceDelta: 25 },
      { name: "Extra sauce", priceDelta: 10 },
      { name: "Spicy", priceDelta: 0 },
      { name: "Extra portion", priceDelta: 45 },
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
      for (const c of g.choices) if (picked[g.key]?.includes(c.name)) sum += c.priceDelta;
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
      (picked[g.key] ?? []).map((c) => `${g.label}: ${c}`),
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
    toast.success(`${product.name} added to cart`);
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
            <span>{product.name}</span>
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
                {g.label}
                {g.multi && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.choices.map((c) => {
                  const active = picked[g.key]?.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => toggle(g, c.name)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-secondary"
                      }`}
                    >
                      {c.name}
                      {c.priceDelta > 0 && <span className="ml-1">+{ETB(c.priceDelta)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="text-sm font-bold">Special instructions</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. no onions, extra hot…"
              className="mt-2"
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-3 rounded-full border border-border px-2 py-1.5">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
              className="rounded-full p-1 hover:bg-secondary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-5 text-center font-bold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase quantity"
              className="rounded-full p-1 hover:bg-secondary"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button className="flex-1" onClick={addToCart} disabled={!product.in_stock}>
            {product.in_stock ? `Add to order · ${ETB(unitPrice * qty)}` : "Out of stock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
