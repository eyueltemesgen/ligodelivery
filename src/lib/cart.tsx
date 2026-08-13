import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  shopId: string;
  shopName: string;
  name: string;
  imagePath: string | null;
  unitPrice: number;
  quantity: number;
};

type CartValue = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  shopId: string | null;
  shopName: string | null;
};

const CartContext = createContext<CartValue | null>(null);
const KEY = "ligo.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
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
          const base = prev.length && prev[0]?.shopId !== item.shopId ? [] : prev;
          const found = base.find((i) => i.productId === item.productId);
          if (found)
            return base.map((i) =>
              i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i,
            );
          return [...base, { ...item, quantity: qty }];
        }),
      setQty: (productId, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
        ),
      remove: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
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