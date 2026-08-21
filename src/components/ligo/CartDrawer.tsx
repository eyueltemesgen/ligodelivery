import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { ETB } from "@/lib/format";
import { StorageImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Live sliding side-cart drawer, opened from the header cart button. */
export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { items, setQty, remove, clear, count, subtotal, shopName } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your cart {count > 0 && <span className="text-muted-foreground">({count})</span>}
          </SheetTitle>
          {shopName && <p className="text-xs text-muted-foreground">from {shopName}</p>}
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">
              Add some items from a shop to get started.
            </p>
            <Button asChild variant="outline" onClick={() => onOpenChange(false)}>
              <Link to="/shops">Browse shops</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto py-4">
              {items.map((i) => (
                <div key={i.productId} className="flex gap-3">
                  <StorageImage
                    path={i.imagePath}
                    alt={i.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight">{i.name}</p>
                      <button
                        onClick={() => remove(i.productId)}
                        aria-label={`Remove ${i.name}`}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-border px-1 py-0.5">
                        <button
                          onClick={() => setQty(i.productId, i.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="rounded-full p-1 hover:bg-secondary"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-4 text-center text-sm font-semibold">
                          {i.quantity}
                        </span>
                        <button
                          onClick={() => setQty(i.productId, i.quantity + 1)}
                          aria-label="Increase quantity"
                          className="rounded-full p-1 hover:bg-secondary"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold">{ETB(i.unitPrice * i.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SheetFooter className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-display text-lg font-bold">{ETB(subtotal)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clear} className="flex-none">
                  Clear
                </Button>
                <Button asChild className="flex-1" onClick={() => onOpenChange(false)}>
                  <Link to="/checkout">Checkout · {ETB(subtotal)}</Link>
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Header trigger button with a live item-count badge. */
export function CartTrigger({ onOpen }: { onOpen: () => void }) {
  const { count } = useCart();
  return (
    <button
      onClick={onOpen}
      className="relative rounded-md p-2 hover:bg-secondary"
      aria-label="Open cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}

// Re-export SheetTrigger so consumers can compose if needed.
export { SheetTrigger };
