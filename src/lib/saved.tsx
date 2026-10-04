import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isMissingTable } from "@/lib/supa-error";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

type SavedValue = {
  wishlistIds: Set<string>;
  favoriteShopIds: Set<string>;
  ready: boolean;
  isSavedProduct: (productId: string) => boolean;
  isFavoriteShop: (shopId: string) => boolean;
  toggleProduct: (productId: string) => Promise<void>;
  toggleShop: (shopId: string) => Promise<void>;
};

const SavedContext = createContext<SavedValue | null>(null);

const EMPTY = new Set<string>();

/**
 * Holds the customer's saved product and shop ids so cards can render their
 * saved state instantly. Writes are optimistic and fall back to a refetch of
 * the wishlist / favorites / summary queries on completion.
 */
export function SavedProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(EMPTY);
  const [favoriteShopIds, setFavoriteShopIds] = useState<Set<string>>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setWishlistIds(EMPTY);
      setFavoriteShopIds(EMPTY);
      setReady(false);
      return;
    }
    setReady(false);
    void (async () => {
      const [w, f] = await Promise.all([
        supabase.from("wishlist").select("product_id").eq("user_id", user.id),
        supabase.from("shop_favorites").select("shop_id").eq("user_id", user.id),
      ]);
      if (!active) return;
      setWishlistIds(new Set((w.data ?? []).map((r) => r.product_id)));
      setFavoriteShopIds(new Set((f.data ?? []).map((r) => r.shop_id)));
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const requireUser = useCallback(() => {
    if (user) return true;
    toast.info(t("saved_sign_in"));
    void navigate({ to: "/login" });
    return false;
  }, [user, navigate]);

  const toggleProduct = useCallback(
    async (productId: string) => {
      if (!requireUser() || !user) return;
      const saved = wishlistIds.has(productId);
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (saved) next.delete(productId);
        else next.add(productId);
        return next;
      });
      const { error } = saved
        ? await supabase
            .from("wishlist")
            .delete()
            .eq("user_id", user.id)
            .eq("product_id", productId)
        : await supabase.from("wishlist").insert({ user_id: user.id, product_id: productId });
      if (error) {
        setWishlistIds((prev) => {
          const next = new Set(prev);
          if (saved) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toast.error(isMissingTable(error) ? t("saved_setting_up") : t("saved_update_failed"));
        return;
      }
      toast.success(saved ? t("saved_removed") : t("saved_added"));
      void qc.invalidateQueries({ queryKey: ["wishlist"] });
      void qc.invalidateQueries({ queryKey: ["account-summary"] });
    },
    [requireUser, user, wishlistIds, qc, t],
  );

  const toggleShop = useCallback(
    async (shopId: string) => {
      if (!requireUser() || !user) return;
      const fav = favoriteShopIds.has(shopId);
      setFavoriteShopIds((prev) => {
        const next = new Set(prev);
        if (fav) next.delete(shopId);
        else next.add(shopId);
        return next;
      });
      const { error } = fav
        ? await supabase
            .from("shop_favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("shop_id", shopId)
        : await supabase.from("shop_favorites").insert({ user_id: user.id, shop_id: shopId });
      if (error) {
        setFavoriteShopIds((prev) => {
          const next = new Set(prev);
          if (fav) next.add(shopId);
          else next.delete(shopId);
          return next;
        });
        toast.error(isMissingTable(error) ? t("fav_setting_up") : t("fav_update_failed"));
        return;
      }
      toast.success(fav ? t("fav_removed") : t("fav_added"));
      void qc.invalidateQueries({ queryKey: ["shop-favorites"] });
      void qc.invalidateQueries({ queryKey: ["account-summary"] });
    },
    [requireUser, user, favoriteShopIds, qc, t],
  );

  const value = useMemo<SavedValue>(
    () => ({
      wishlistIds,
      favoriteShopIds,
      ready,
      isSavedProduct: (id) => wishlistIds.has(id),
      isFavoriteShop: (id) => favoriteShopIds.has(id),
      toggleProduct,
      toggleShop,
    }),
    [wishlistIds, favoriteShopIds, ready, toggleProduct, toggleShop],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used inside SavedProvider");
  return ctx;
}
