import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isShopOpenNow } from "@/lib/hours";
import type { Shop } from "@/lib/queries";
import { ShopHoursEditor } from "@/components/ligo/ShopHoursEditor";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "Merchant portal — Ligo Delivery" },
      {
        name: "description",
        content: "Manage your shop's opening hours and online availability on Ligo.",
      },
      { property: "og:title", content: "Merchant portal — Ligo Delivery" },
      { property: "og:description", content: "Control your Ligo shop hours and availability." },
    ],
  }),
  component: MerchantPage,
});

function MerchantPage() {
  const { user, isMerchant, isAdmin, loading } = useAuth();
  const qc = useQueryClient();

  const { data: shops = [] } = useQuery<Shop[]>({
    queryKey: ["merchant-shops", user?.id, isAdmin],
    enabled: !!user && (isMerchant || isAdmin),
    queryFn: async () => {
      let q = supabase.from("shops").select("*").order("name");
      if (!isAdmin) q = q.eq("owner_id", user!.id);
      const { data } = await q;
      return (data ?? []) as Shop[];
    },
  });

  if (loading) return <div className="container-ligo py-16 text-muted-foreground">Loading…</div>;
  if (!user)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sign in to manage your shop</h1>
        <Button asChild className="mt-6">
          <Link to="/auth" search={{ mode: "login", role: "merchant" }}>
            Sign in
          </Link>
        </Button>
      </div>
    );
  if (!isMerchant && !isAdmin)
    return (
      <div className="container-ligo py-16 text-center font-display text-xl font-bold">
        Merchants only.
      </div>
    );

  const toggleOnline = async (shopId: string, value: boolean) => {
    const { error } = await supabase.from("shops").update({ is_online: value }).eq("id", shopId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["merchant-shops"] });
    toast.success(
      value ? "Shop is online — customers can order" : "Shop is offline — checkout is locked",
    );
  };

  return (
    <div className="container-ligo py-10">
      <h1 className="font-display text-3xl font-extrabold">Merchant portal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Control your opening hours and go offline anytime — checkout locks automatically when you're
        closed.
      </p>

      {shops.length === 0 && (
        <div className="mt-8 max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-card">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No shop linked to your account yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The Ligo team will link your shop after reviewing your registration.
          </p>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {shops.map((s) => (
          <section key={s.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">{s.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {isShopOpenNow(s) ? "Open for orders right now" : "Currently closed for orders"}
                </p>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <span className="text-sm font-medium">{s.is_online ? "Online" : "Offline"}</span>
                <Switch checked={s.is_online} onCheckedChange={(v) => void toggleOnline(s.id, v)} />
              </label>
            </div>
            <h3 className="mt-5 font-display text-base font-bold">Weekly opening hours</h3>
            <div className="mt-3">
              <ShopHoursEditor
                shopId={s.id}
                fallbackOpen={s.opens_at.slice(0, 5)}
                fallbackClose={s.closes_at.slice(0, 5)}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
