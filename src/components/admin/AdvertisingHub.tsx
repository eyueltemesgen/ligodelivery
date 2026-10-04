import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, MousePointerClick, Percent, Megaphone, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { StorageImage, uploadImage } from "@/lib/media";
import { AD_STATUSES, AD_TYPES, ctr } from "@/lib/ads";
import { ETB } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

const sel = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const card = "rounded-xl border border-border bg-card p-4 shadow-card";

type Run = (p: PromiseLike<{ error: unknown }>, ok?: string) => Promise<boolean>;

function useRun(): Run {
  const qc = useQueryClient();
  return async (p, ok) => {
    const { error } = await p;
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return false;
    }
    if (ok) toast.success(ok);
    qc.invalidateQueries({ queryKey: ["adm-ads"] });
    qc.invalidateQueries({ queryKey: ["ads"] });
    return true;
  };
}

const toLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

export function AdvertisingHub() {
  const { t } = useI18n();
  return (
    <Tabs defaultValue="ads" className="space-y-4">
      <div className="-mx-1 overflow-x-auto px-1">
        <TabsList className="w-max">
          <TabsTrigger value="ads">{t("admin.advAdsAnalytics")}</TabsTrigger>
          <TabsTrigger value="campaigns">{t("admin.advCampaigns")}</TabsTrigger>
          <TabsTrigger value="advertisers">{t("admin.advAdvertisers")}</TabsTrigger>
          <TabsTrigger value="packages">{t("admin.advPackages")}</TabsTrigger>
          <TabsTrigger value="placements">{t("admin.advPlacements")}</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="ads">
        <AdsManager />
      </TabsContent>
      <TabsContent value="campaigns">
        <Campaigns />
      </TabsContent>
      <TabsContent value="advertisers">
        <Advertisers />
      </TabsContent>
      <TabsContent value="packages">
        <Packages />
      </TabsContent>
      <TabsContent value="placements">
        <Placements />
      </TabsContent>
    </Tabs>
  );
}

function useLookups() {
  const placements = useQuery({
    queryKey: ["adm-ads", "placements"],
    queryFn: async () =>
      (await supabase.from("ad_placements").select("*").order("sort_order")).data ?? [],
  });
  const advertisers = useQuery({
    queryKey: ["adm-ads", "advertisers"],
    queryFn: async () => (await supabase.from("advertisers").select("*").order("name")).data ?? [],
  });
  const campaigns = useQuery({
    queryKey: ["adm-ads", "campaigns"],
    queryFn: async () =>
      (await supabase.from("ad_campaigns").select("*").order("created_at", { ascending: false }))
        .data ?? [],
  });
  const packages = useQuery({
    queryKey: ["adm-ads", "packages"],
    queryFn: async () => (await supabase.from("ad_packages").select("*").order("name")).data ?? [],
  });
  const shops = useQuery({
    queryKey: ["adm-ads", "shops"],
    queryFn: async () => (await supabase.from("shops").select("id,name").order("name")).data ?? [],
  });
  const products = useQuery({
    queryKey: ["adm-ads", "products"],
    queryFn: async () =>
      (await supabase.from("products").select("id,name,shop_id").order("name")).data ?? [],
  });
  const categories = useQuery({
    queryKey: ["adm-ads", "categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("id,name,slug").order("sort_order")).data ?? [],
  });
  return {
    placements: placements.data ?? [],
    advertisers: advertisers.data ?? [],
    campaigns: campaigns.data ?? [],
    packages: packages.data ?? [],
    shops: shops.data ?? [],
    products: products.data ?? [],
    categories: categories.data ?? [],
  };
}

type AdForm = {
  id?: string;
  title: string;
  subtitle: string;
  cta_label: string;
  image_url: string;
  ad_type: string;
  placement: string;
  priority: string;
  status: string;
  advertiser_id: string;
  campaign_id: string;
  destination_type: string;
  destination_id: string;
  destination_url: string;
  starts_at: string;
  ends_at: string;
  target_category_id: string;
  target_shop_id: string;
  target_device: string;
  target_location: string;
};
const EMPTY: AdForm = {
  title: "",
  subtitle: "",
  cta_label: "Order now",
  image_url: "",
  ad_type: "banner",
  placement: "HOME_TOP",
  priority: "0",
  status: "active",
  advertiser_id: "",
  campaign_id: "",
  destination_type: "shop",
  destination_id: "",
  destination_url: "",
  starts_at: "",
  ends_at: "",
  target_category_id: "",
  target_shop_id: "",
  target_device: "all",
  target_location: "",
};

function AdsManager() {
  const { t } = useI18n();
  const L = useLookups();
  const run = useRun();
  const [form, setForm] = useState<AdForm>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("all");

  const { data: ads = [] } = useQuery({
    queryKey: ["adm-ads", "list"],
    queryFn: async () =>
      (
        await supabase
          .from("ads")
          .select("*")
          .order("placement")
          .order("priority", { ascending: false })
      ).data ?? [],
  });
  const { data: stats = [] } = useQuery({
    queryKey: ["adm-ads", "stats"],
    queryFn: async () => (await supabase.rpc("ad_stats")).data ?? [],
    refetchInterval: 30_000,
  });
  const statOf = (id: string) => {
    const s = stats.find((x) => x.ad_id === id);
    return { imp: Number(s?.impressions ?? 0), clk: Number(s?.clicks ?? 0) };
  };
  const totImp = stats.reduce((n, s) => n + Number(s.impressions), 0);
  const totClk = stats.reduce((n, s) => n + Number(s.clicks), 0);
  const now = Date.now();
  const isLive = (a: (typeof ads)[number]) =>
    a.status === "active" &&
    (!a.starts_at || new Date(a.starts_at).getTime() <= now) &&
    (!a.ends_at || new Date(a.ends_at).getTime() > now);

  const destUrl = (): string | null => {
    switch (form.destination_type) {
      case "shop":
        return form.destination_id ? `/shops/${form.destination_id}` : null;
      case "product": {
        const p = L.products.find((x) => x.id === form.destination_id);
        return p ? `/shops/${p.shop_id}` : null;
      }
      case "category": {
        const c = L.categories.find((x) => x.id === form.destination_id);
        return c ? `/shops?category=${c.id}` : null;
      }
      case "offers":
        return "/offers";
      case "external":
        return /^https?:\/\//.test(form.destination_url) ? form.destination_url : null;
      default:
        return null;
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(t("admin.advAddTitle"));
      return;
    }
    if (form.destination_type === "external" && !destUrl()) {
      toast.error(t("admin.advExternalLinkError"));
      return;
    }
    const row = {
      title: form.title.trim(),
      subtitle: form.subtitle || null,
      cta_label: form.cta_label || null,
      image_url: form.image_url || null,
      ad_type: form.ad_type,
      placement: form.placement,
      priority: Number(form.priority || 0),
      status: form.status,
      advertiser_id: form.advertiser_id || null,
      campaign_id: form.campaign_id || null,
      destination_type: form.destination_type,
      destination_id: ["shop", "product", "category"].includes(form.destination_type)
        ? form.destination_id || null
        : null,
      destination_url: destUrl(),
      starts_at: fromLocal(form.starts_at),
      ends_at: fromLocal(form.ends_at),
      target_category_id: form.target_category_id || null,
      target_shop_id: form.target_shop_id || null,
      target_device: form.target_device,
      target_location: form.target_location || null,
    };
    const ok = form.id
      ? await run(supabase.from("ads").update(row).eq("id", form.id), t("admin.advAdUpdated"))
      : await run(supabase.from("ads").insert(row), t("admin.advAdPublished"));
    if (ok) setForm(EMPTY);
  };

  const edit = (a: (typeof ads)[number]) =>
    setForm({
      id: a.id,
      title: a.title,
      subtitle: a.subtitle ?? "",
      cta_label: a.cta_label ?? "",
      image_url: a.image_url ?? "",
      ad_type: a.ad_type,
      placement: a.placement,
      priority: String(a.priority),
      status: a.status,
      advertiser_id: a.advertiser_id ?? "",
      campaign_id: a.campaign_id ?? "",
      destination_type: a.destination_type,
      destination_id: a.destination_id ?? "",
      destination_url: a.destination_type === "external" ? (a.destination_url ?? "") : "",
      starts_at: toLocal(a.starts_at),
      ends_at: toLocal(a.ends_at),
      target_category_id: a.target_category_id ?? "",
      target_shop_id: a.target_shop_id ?? "",
      target_device: a.target_device,
      target_location: a.target_location ?? "",
    });

  const destOptions =
    form.destination_type === "shop"
      ? L.shops
      : form.destination_type === "product"
        ? L.products
        : form.destination_type === "category"
          ? L.categories
          : [];
  const set = (k: keyof AdForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });
  const shown = ads.filter((a) => filter === "all" || a.placement === filter);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Megaphone, label: t("admin.advLiveAds"), v: String(ads.filter(isLive).length) },
          { icon: Eye, label: t("admin.advImpressions"), v: totImp.toLocaleString() },
          { icon: MousePointerClick, label: t("admin.advClicks"), v: totClk.toLocaleString() },
          { icon: Percent, label: t("admin.advCtr"), v: `${ctr(totImp, totClk).toFixed(2)}%` },
        ].map((s) => (
          <div key={s.label} className={card}>
            <s.icon className="h-5 w-5 text-primary" />
            <p className="mt-2 font-display text-2xl font-extrabold">{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <form onSubmit={save} className={card}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">
            {form.id ? t("admin.advEditAd") : t("admin.advCreateAd")}
          </h2>
          {form.id && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setForm(EMPTY)}>
              {t("admin.advCancelEdit")}
            </Button>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <F label={t("admin.advTitle")}>
            <Input value={form.title} onChange={set("title")} maxLength={80} />
          </F>
          <F label={t("admin.advSubtitle")}>
            <Input value={form.subtitle} onChange={set("subtitle")} maxLength={140} />
          </F>
          <F label={t("admin.advButtonText")}>
            <Input value={form.cta_label} onChange={set("cta_label")} maxLength={24} />
          </F>
          <F label={t("admin.advAdType")}>
            <select className={sel} value={form.ad_type} onChange={set("ad_type")}>
              {AD_TYPES.map((ty) => (
                <option key={ty.value} value={ty.value}>
                  {ty.label}
                </option>
              ))}
            </select>
          </F>
          <F label={t("admin.advPlacement")}>
            <select className={sel} value={form.placement} onChange={set("placement")}>
              {L.placements.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} — {p.label}
                </option>
              ))}
            </select>
          </F>
          <F label={t("admin.advPriority")}>
            <Input type="number" value={form.priority} onChange={set("priority")} />
          </F>
          <F label={t("admin.advStatus")}>
            <select className={sel} value={form.status} onChange={set("status")}>
              {AD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </F>
          <F label={t("admin.advAdvertiser")}>
            <select className={sel} value={form.advertiser_id} onChange={set("advertiser_id")}>
              <option value="">{t("admin.advNone")}</option>
              {L.advertisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </F>
          <F label={t("admin.advCampaign")}>
            <select className={sel} value={form.campaign_id} onChange={set("campaign_id")}>
              <option value="">{t("admin.advNone")}</option>
              {L.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </F>
          <F label={t("admin.advLinksTo")}>
            <select
              className={sel}
              value={form.destination_type}
              onChange={(e) =>
                setForm({ ...form, destination_type: e.target.value, destination_id: "" })
              }
            >
              <option value="shop">{t("admin.advShop")}</option>
              <option value="product">{t("admin.advProduct")}</option>
              <option value="category">{t("admin.advCategoryService")}</option>
              <option value="offers">{t("admin.advSpecialMomentsOffers")}</option>
              <option value="external">{t("admin.advExternal")}</option>
              <option value="none">{t("admin.advNoLink")}</option>
            </select>
          </F>
          {destOptions.length > 0 && (
            <F label={t("admin.advDestination")}>
              <select className={sel} value={form.destination_id} onChange={set("destination_id")}>
                <option value="">{t("admin.advChoose")}</option>
                {destOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </F>
          )}
          {form.destination_type === "external" && (
            <F label={t("admin.advWebsiteUrl")}>
              <Input
                value={form.destination_url}
                onChange={set("destination_url")}
                placeholder="https://…"
              />
            </F>
          )}
          <F label={t("admin.advStartsOptional")}>
            <Input type="datetime-local" value={form.starts_at} onChange={set("starts_at")} />
          </F>
          <F label={t("admin.advEndsOptional")}>
            <Input type="datetime-local" value={form.ends_at} onChange={set("ends_at")} />
          </F>
          <F label={t("admin.advDevice")}>
            <select className={sel} value={form.target_device} onChange={set("target_device")}>
              <option value="all">{t("admin.advAllDevices")}</option>
              <option value="mobile">{t("admin.advMobileOnly")}</option>
              <option value="desktop">{t("admin.advDesktopOnly")}</option>
            </select>
          </F>
          <F label={t("admin.advOnlyCategory")}>
            <select
              className={sel}
              value={form.target_category_id}
              onChange={set("target_category_id")}
            >
              <option value="">{t("admin.advAny")}</option>
              {L.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </F>
          <F label={t("admin.advOnlyShop")}>
            <select className={sel} value={form.target_shop_id} onChange={set("target_shop_id")}>
              <option value="">{t("admin.advAny")}</option>
              {L.shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </F>
          <F label={t("admin.advLocationNote")}>
            <Input
              value={form.target_location}
              onChange={set("target_location")}
              placeholder="Bishoftu"
            />
          </F>
          <F label={t("admin.advImage")}>
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                try {
                  const path = await uploadImage(f, "banners");
                  setForm((v) => ({ ...v, image_url: path }));
                  toast.success(t("admin.advImageUploaded"));
                } catch (err) {
                  toast.error(supabaseErrorMessage(err));
                } finally {
                  setUploading(false);
                }
              }}
            />
          </F>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            {t("admin.advPreview")}
          </p>
          <div className="relative max-w-xl overflow-hidden rounded-2xl border border-border">
            <div className="relative aspect-[16/9] w-full">
              {form.image_url ? (
                <StorageImage
                  path={form.image_url}
                  alt={form.title || "Ad"}
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
              <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-0.5 text-[10px] font-bold uppercase">
                {t("admin.advSponsored")}
              </span>
            </div>
            <div className="p-3">
              <p className="font-display font-bold">{form.title || t("admin.advAdTitle")}</p>
              {form.subtitle && <p className="text-sm text-muted-foreground">{form.subtitle}</p>}
            </div>
          </div>
        </div>
        <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={uploading}>
          {form.id ? t("admin.advSaveChanges") : t("admin.advPublishAd")}
        </Button>
      </form>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">{t("admin.advAllAds")}</h2>
          <select
            className={`${sel} max-w-xs`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{t("admin.advAllPlacements")}</option>
            {L.placements.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code}
              </option>
            ))}
          </select>
        </div>
        <ul className="mt-3 space-y-2">
          {shown.map((a) => {
            const s = statOf(a.id);
            const live = isLive(a);
            return (
              <li
                key={a.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-2"
              >
                <StorageImage
                  path={a.image_url}
                  alt={a.title}
                  className="h-12 w-20 shrink-0 rounded"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.placement} · {t("admin.advPriorityShort")} {a.priority} ·{" "}
                    <span className={live ? "font-semibold text-primary" : ""}>
                      {live
                        ? t("admin.advLive")
                        : a.status === "active"
                          ? t("admin.advScheduledExpired")
                          : a.status}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.imp} {t("admin.advImpressionsShort")} · {s.clk} {t("admin.advClicksShort")} ·
                    CTR {ctr(s.imp, s.clk).toFixed(2)}%
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    aria-label={t("admin.advActiveLabel")}
                    checked={a.status === "active"}
                    onCheckedChange={(v) =>
                      run(
                        supabase
                          .from("ads")
                          .update({ status: v ? "active" : "paused" })
                          .eq("id", a.id),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("admin.advEdit")}
                    onClick={() => {
                      edit(a);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(
                        supabase.from("ads").update({ status: "archived" }).eq("id", a.id),
                        t("admin.advArchived"),
                      )
                    }
                  >
                    {t("admin.advArchive")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("admin.advDelete")}
                    onClick={() => {
                      if (confirm(t("admin.advDeleteAdConfirm", { title: a.title })))
                        void run(
                          supabase.from("ads").delete().eq("id", a.id),
                          t("admin.advDeleted"),
                        );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
          {shown.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("admin.advNoAdsYet")}</p>
          )}
        </ul>
      </section>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Advertisers() {
  const { t } = useI18n();
  const { advertisers, shops } = useLookups();
  const run = useRun();
  const [f, setF] = useState({ name: "", contact_name: "", phone: "", email: "", shop_id: "" });
  return (
    <div className="space-y-4">
      <form
        className={`${card} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!f.name.trim()) return;
          if (
            await run(
              supabase.from("advertisers").insert({ ...f, shop_id: f.shop_id || null }),
              t("admin.advAdvertiserAdded"),
            )
          )
            setF({ name: "", contact_name: "", phone: "", email: "", shop_id: "" });
        }}
      >
        <F label={t("admin.advBusinessName")}>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </F>
        <F label={t("admin.advContactPerson")}>
          <Input
            value={f.contact_name}
            onChange={(e) => setF({ ...f, contact_name: e.target.value })}
          />
        </F>
        <F label={t("admin.advPhone")}>
          <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </F>
        <F label={t("admin.advEmail")}>
          <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </F>
        <F label={t("admin.advLinkedShop")}>
          <select
            className={sel}
            value={f.shop_id}
            onChange={(e) => setF({ ...f, shop_id: e.target.value })}
          >
            <option value="">{t("admin.advNonePlain")}</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </F>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            {t("admin.advAddAdvertiser")}
          </Button>
        </div>
      </form>
      <ul className="space-y-2">
        {advertisers.map((a) => (
          <li key={a.id} className={`${card} flex flex-wrap items-center gap-2 p-3`}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{a.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[a.contact_name, a.phone, a.email].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Switch
              checked={a.is_active}
              onCheckedChange={(v) =>
                run(supabase.from("advertisers").update({ is_active: v }).eq("id", a.id))
              }
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("admin.advDelete")}
              onClick={() => {
                if (confirm(t("admin.advDeleteAdvertiserConfirm")))
                  void run(supabase.from("advertisers").delete().eq("id", a.id));
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {advertisers.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("admin.advNoAdvertisersYet")}</p>
        )}
      </ul>
    </div>
  );
}

function Campaigns() {
  const { t } = useI18n();
  const { campaigns, advertisers, packages } = useLookups();
  const run = useRun();
  const [f, setF] = useState({
    name: "",
    advertiser_id: "",
    package_id: "",
    starts_at: "",
    ends_at: "",
  });
  return (
    <div className="space-y-4">
      <form
        className={`${card} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!f.name.trim()) return;
          const ok = await run(
            supabase.from("ad_campaigns").insert({
              name: f.name.trim(),
              advertiser_id: f.advertiser_id || null,
              package_id: f.package_id || null,
              starts_at: fromLocal(f.starts_at),
              ends_at: fromLocal(f.ends_at),
            }),
            t("admin.advCampaignCreated"),
          );
          if (ok) setF({ name: "", advertiser_id: "", package_id: "", starts_at: "", ends_at: "" });
        }}
      >
        <F label={t("admin.advCampaignName")}>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </F>
        <F label={t("admin.advAdvertiser")}>
          <select
            className={sel}
            value={f.advertiser_id}
            onChange={(e) => setF({ ...f, advertiser_id: e.target.value })}
          >
            <option value="">{t("admin.advNonePlain")}</option>
            {advertisers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </F>
        <F label={t("admin.advPackage")}>
          <select
            className={sel}
            value={f.package_id}
            onChange={(e) => setF({ ...f, package_id: e.target.value })}
          >
            <option value="">{t("admin.advNonePlain")}</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </F>
        <F label={t("admin.advStartsOptional")}>
          <Input
            type="datetime-local"
            value={f.starts_at}
            onChange={(e) => setF({ ...f, starts_at: e.target.value })}
          />
        </F>
        <F label={t("admin.advEndsOptional")}>
          <Input
            type="datetime-local"
            value={f.ends_at}
            onChange={(e) => setF({ ...f, ends_at: e.target.value })}
          />
        </F>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            {t("admin.advCreateCampaign")}
          </Button>
        </div>
      </form>
      <ul className="space-y-2">
        {campaigns.map((c) => (
          <li key={c.id} className={`${card} flex flex-wrap items-center gap-2 p-3`}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {advertisers.find((a) => a.id === c.advertiser_id)?.name ??
                  t("admin.advNoAdvertiser")}{" "}
                · {c.status}
                {c.ends_at &&
                  ` · ${t("admin.advUntilSuffix", { date: new Date(c.ends_at).toLocaleDateString() })}`}
              </p>
            </div>
            <select
              className={`${sel} w-32`}
              value={c.status}
              onChange={(e) =>
                run(supabase.from("ad_campaigns").update({ status: e.target.value }).eq("id", c.id))
              }
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="archived">archived</option>
            </select>
          </li>
        ))}
        {campaigns.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("admin.advNoCampaignsYet")}</p>
        )}
      </ul>
    </div>
  );
}

function Packages() {
  const { t } = useI18n();
  const { packages, placements } = useLookups();
  const run = useRun();
  const [f, setF] = useState({
    name: "",
    duration_days: "7",
    price: "0",
    placements: [] as string[],
  });
  return (
    <div className="space-y-4">
      <form
        className={`${card} space-y-3`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!f.name.trim()) return;
          const ok = await run(
            supabase.from("ad_packages").insert({
              name: f.name.trim(),
              duration_days: Number(f.duration_days),
              price: Number(f.price),
              placements: f.placements,
            }),
            t("admin.advPackageAdded"),
          );
          if (ok) setF({ name: "", duration_days: "7", price: "0", placements: [] });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <F label={t("admin.advName")}>
            <Input
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Homepage Featured"
            />
          </F>
          <F label={t("admin.advDurationDays")}>
            <Input
              type="number"
              min={1}
              value={f.duration_days}
              onChange={(e) => setF({ ...f, duration_days: e.target.value })}
            />
          </F>
          <F label={t("admin.advPriceEtb")}>
            <Input
              type="number"
              min={0}
              value={f.price}
              onChange={(e) => setF({ ...f, price: e.target.value })}
            />
          </F>
        </div>
        <div className="flex flex-wrap gap-2">
          {placements.map((p) => {
            const on = f.placements.includes(p.code);
            return (
              <button
                key={p.code}
                type="button"
                onClick={() =>
                  setF({
                    ...f,
                    placements: on
                      ? f.placements.filter((x) => x !== p.code)
                      : [...f.placements, p.code],
                  })
                }
                className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >
                {p.code}
              </button>
            );
          })}
        </div>
        <Button type="submit">{t("admin.advAddPackage")}</Button>
      </form>
      <ul className="space-y-2">
        {packages.map((p) => (
          <li key={p.id} className={`${card} flex flex-wrap items-center gap-2 p-3`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.duration_days} {t("admin.advDays")} · {ETB(Number(p.price))} ·{" "}
                {p.placements.join(", ") || t("admin.advNoPlacements")}
              </p>
            </div>
            <Switch
              checked={p.is_active}
              onCheckedChange={(v) =>
                run(supabase.from("ad_packages").update({ is_active: v }).eq("id", p.id))
              }
            />
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("admin.advDelete")}
              onClick={() => {
                if (confirm(t("admin.advDeletePackageConfirm")))
                  void run(supabase.from("ad_packages").delete().eq("id", p.id));
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Placements() {
  const { t } = useI18n();
  const { placements } = useLookups();
  const run = useRun();
  return (
    <section className={card}>
      <p className="text-sm text-muted-foreground">{t("admin.advPlacementToggleDesc")}</p>
      <ul className="mt-3 space-y-2">
        {placements.map((p) => (
          <li
            key={p.code}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-mono text-sm font-bold">{p.code}</p>
              <p className="truncate text-xs text-muted-foreground">{p.label}</p>
            </div>
            <Switch
              checked={p.is_active}
              onCheckedChange={(v) =>
                run(supabase.from("ad_placements").update({ is_active: v }).eq("code", p.code))
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
