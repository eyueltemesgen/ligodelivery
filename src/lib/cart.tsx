import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartOption = {
  /** Option row id, used for server-side validation at checkout. */
  id: string;
  group: string;
  name: string;
  priceDelta: number;
};

export type CartItem = {
  /** Stable line identity: product plus its selected options. */
  lineId: string;
  productId: string;
  shopId: string;
  shopName: string;
  name: string;
  imagePath: string | null;
  unitPrice: number;
  quantity: number;
  options: CartOption[];
};

export type NewCartItem = Omit<CartItem, "quantity" | "lineId"> & { lineId?: string };

type CartValue = {
  items: CartItem[];
  add: (item: NewCartItem, qty?: number) => void;
  setQty: (lineId: string, qty: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  shopId: string | null;
  shopName: string | null;
};

const CartContext = createContext<CartValue | null>(null);
const KEY = "ligo.cart.v1";

/** Deterministic line id from a product and the ids of its selected options. */
export const cartLineId = (productId: string, optionIds: string[] = []) =>
  optionIds.length ? `${productId}::${[...optionIds].sort().join(",")}` : productId;

/** Reads older carts that predate options and fills the new fields safely. */
function migrate(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => {
      const productId = String(i["productId"] ?? "");
      const options = Array.isArray(i["options"]) ? (i["options"] as CartOption[]) : [];
      const optionIds = options.map((o) => o.id).filter(Boolean);
      return {
        lineId: String(i["lineId"] ?? cartLineId(productId, optionIds)),
        productId,
        shopId: String(i["shopId"] ?? ""),
        shopName: String(i["shopName"] ?? ""),
        name: String(i["name"] ?? ""),
        imagePath: (i["imagePath"] as string | null) ?? null,
        unitPrice: Number(i["unitPrice"] ?? 0),
        quantity: Math.max(1, Number(i["quantity"] ?? 1)),
        options,
      };
    })
    .filter((i) => i.productId);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(migrate(JSON.parse(raw)));
    } catch {
      /* ignore corrupt cart */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items]);

  const value = useMemo<CartValue>(() => {
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return {
      items,
      subtotal,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      shopId: items[0]?.shopId ?? null,
      shopName: items[0]?.shopName ?? null,
      add: (item, qty = 1) =>
        setItems((prev) => {
          const lineId =
            item.lineId ??
            cartLineId(
              item.productId,
              item.options.map((o) => o.id),
            );
          // Single-shop cart: switching shop replaces the previous basket.
          const base = prev.length && prev[0]?.shopId !== item.shopId ? [] : prev;
          const found = base.find((i) => i.lineId === lineId);
          if (found)
            return base.map((i) =>
              i.lineId === lineId ? { ...i, quantity: i.quantity + qty } : i,
            );
          return [...base, { ...item, lineId, quantity: qty }];
        }),
      setQty: (lineId, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.lineId !== lineId)
            : prev.map((i) => (i.lineId === lineId ? { ...i, quantity: qty } : i)),
        ),
      remove: (lineId) => setItems((prev) => prev.filter((i) => i.lineId !== lineId)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
