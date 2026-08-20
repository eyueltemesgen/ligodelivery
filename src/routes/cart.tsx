import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { ETB } from "@/lib/format";
import { StorageImage } from "@/lib/media";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Ligo Delivery" },
      {
        name: "description",
        content: "Review the items in your Ligo delivery cart before checkout.",
      },
      { property: "og:title", content: "Your cart — Ligo Delivery" },
      { property: "og:description", content: "Review your Ligo order before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, shopName, clear } = useCart();
  const navigate = useNavigate();

  if (items.length === 0)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Browse shops in Bishoftu and add something tasty.
        </p>
        <Button asChild className="mt-6">
          <Link to="/shops">Browse shops</Link>
        </Button>
      </div>
    );

  return (
    <div className="container-ligo grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Your cart</h1>
        <p className="mt-1 text-sm text-muted-foreground">From {shopName}</p>
        <ul className="mt-6 space-y-3">
          {items.map((i) => (
            <li
              key={i.productId}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <StorageImage
                path={i.imagePath}
                alt={i.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-semibold">{i.name}</p>
                <p className="text-sm text-muted-foreground">{ETB(i.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQty(i.productId, i.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQty(i.productId, i.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(i.productId)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Button variant="ghost" className="mt-4 text-destructive" onClick={clear}>
          Clear cart
        </Button>
      </div>
      <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">Summary</h2>
        <div className="mt-4 flex justify-between text-sm">
          <span>Subtotal</span>
          <span className="font-semibold">{ETB(subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Delivery fee is calculated at checkout.
        </p>
        <Button className="mt-5 w-full" onClick={() => navigate({ to: "/checkout" })}>
          Proceed to checkout
        </Button>
      </aside>
    </div>
  );
}
