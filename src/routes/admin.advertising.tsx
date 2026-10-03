import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  Eye,
  ImagePlus,
  Layers,
  Megaphone,
  MousePointerClick,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import {
  AD_LINK_LABEL,
  AD_PLACEMENT_LABEL,
  AD_STATUS_LABEL,
  AD_STATUS_TONE,
  AD_TYPE_LABEL,
  adminAdAnalyticsQuery,
  adminAdCampaignsQuery,
  adminAdPackagesQuery,
  adminAdPlacementsQuery,
  adminAdvertisersQuery,
  adminAdsQuery,
  type Ad,
  type AdAnalyticsRow,
  type AdCampaign,
  type AdLinkType,
  type AdPackage,
  type AdPlacement,
  type AdStatus,
  type AdType,
  type Advertiser,
} from "@/lib/ads";
import { categoriesQuery, shopsQuery } from "@/lib/queries";
import { ETB, formatDate } from "@/lib/format";
import { supabaseErrorMessage } from "@/lib/supa-error";
import { AdPreview } from "@/components/ads/AdSlot";
import { StorageImage, uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const TABS = ["ads", "advertisers", "campaigns", "placements", "packages", "analytics"] as const;
type AdsTab = (typeof TABS)[number];

export const Route = createFileRoute("/admin/advertising")({
  validateSearch: (s: Record<string, unknown>) => {
    const out: { tab?: AdsTab } = {};
    if (TABS.includes(s["tab"] as AdsTab)) out.tab = s["tab"] as AdsTab;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Advertising — LIGO Admin" },
      {
        name: "description",
        content: "Manage advertisers, campaigns, creatives, placements and performance.",
      },
    ],
  }),
  component: AdminAdvertisingPage,
});

function AdminAdvertisingPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">Advertising</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real ad creatives served across the marketplace, with live impressions and clicks.
          </p>
        </div>
      </div>
      <Tabs
        value={tab ?? "ads"}
        onValueChange={(v) => void navigate({ search: { tab: v as AdsTab } })}
        className="mt-5"
      >
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="advertisers">Advertisers</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="placements">Placements</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="ads">
          <AdsAdmin />
        </TabsContent>
        <TabsContent value="advertisers">
          <AdvertisersAdmin />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignsAdmin />
        </TabsContent>
        <TabsContent value="placements">
          <PlacementsAdmin />
        </TabsContent>
        <TabsContent value="packages">
          <PackagesAdmin />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsAdmin />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ===========================================================================
// Ads

type AdDraft = {
  id?: string;
  name: string;
  ad_type: AdType;
  placement_key: string;
  title: string;
  subtitle: string;
  cta_label: string;
  image_url: string | null;
  link_type: AdLinkType;
  link_value: string;
  advertiser_id: string | null;
  campaign_id: string | null;
  target_page: string;
  target_category_id: string | null;
  target_shop_id: string | null;
  target_product_id: string | null;
  target_service_category_slug: string;
  target_location: string;
  target_device: "all" | "mobile" | "desktop";
  priority: string;
  status: AdStatus;
  is_active: boolean;
  start_at: string;
  end_at: string;
};

const emptyAdDraft = (placement = "HOME_TOP"): AdDraft => ({
  name: "",
  ad_type: "homepage_banner",
  placement_key: placement,
  title: "",
  subtitle: "",
  cta_label: "",
  image_url: null,
  link_type: "none",
  link_value: "",
  advertiser_id: null,
  campaign_id: null,
  target_page: "",
  target_category_id: null,
  target_shop_id: null,
  target_product_id: null,
  target_service_category_slug: "",
  target_location: "",
  target_device: "all",
  priority: "0",
  status: "draft",
  is_active: true,
  start_at: "",
  end_at: "",
});

/** ISO timestamp -> value for a datetime-local input (local wall clock). */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (local: string): string | null => {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

function AdsAdmin() {
  const qc = useQueryClient();
  const { data: ads = [], isLoading } = useQuery(adminAdsQuery);
  const { data: placements = [] } = useQuery(adminAdPlacementsQuery);
  const { data: advertisers = [] } = useQuery(adminAdvertisersQuery);
  const { data: campaigns = [] } = useQuery(adminAdCampaignsQuery);
  const [editing, setEditing] = useState<AdDraft | null>(null);
  const [previewing, setPreviewing] = useState<Ad | null>(null);
  const [deleting, setDeleting] = useState<Ad | null>(null);
  const [query, setQuery] = useState("");
  const [placementFilter, setPlacementFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(
    () =>
      ads.filter((a) => {
        if (placementFilter !== "all" && a.placement_key !== placementFilter) return false;
        if (statusFilter !== "all" && a.status !== statusFilter) return false;
        if (query.trim() && !a.name.toLowerCase().includes(query.trim().toLowerCase()))
          return false;
        return true;
      }),
    [ads, query, placementFilter, statusFilter],
  );

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-ads"] });
    void qc.invalidateQueries({ queryKey: ["ads"] });
  };

  const patch = async (id: string, value: TablesUpdate<"ads">) => {
    const { error } = await supabase.from("ads").update(value).eq("id", id);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    refresh();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ads").delete().eq("id", deleting.id);
    setDeleting(null);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    toast.success("Ad deleted");
    refresh();
  };

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ads…"
            className="pl-9"
            aria-label="Search ads"
          />
        </div>
        <Select value={placementFilter} onValueChange={setPlacementFilter}>
          <SelectTrigger className="w-[190px]" aria-label="Filter by placement">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All placements</SelectItem>
            {placements.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(["draft", "active", "paused", "archived"] as AdStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {AD_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setEditing(emptyAdDraft(placements[0]?.key ?? "HOME_TOP"))}>
          <Plus className="mr-2 h-4 w-4" />
          New ad
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading ads…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-bold">No ads yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Create a creative, choose where it should appear, and publish it. It goes live on the
            marketplace immediately — no deploy needed.
          </p>
          <Button className="mt-5" onClick={() => setEditing(emptyAdDraft())}>
            <Plus className="mr-2 h-4 w-4" />
            New ad
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.map((ad) => (
            <div
              key={ad.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-card sm:flex-row sm:items-center"
            >
              <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-secondary sm:w-36">
                <StorageImage
                  path={ad.image_url}
                  alt={ad.title || ad.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold">{ad.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      AD_STATUS_TONE[ad.status],
                    )}
                  >
                    {AD_STATUS_LABEL[ad.status]}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {AD_PLACEMENT_LABEL[ad.placement_key] ?? ad.placement_key}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {ad.title || "—"} · {AD_TYPE_LABEL[ad.ad_type]} ·{" "}
                  {ad.link_type === "none" ? "No link" : AD_LINK_LABEL[ad.link_type]}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Priority {ad.priority}
                  {ad.target_device !== "all" ? ` · ${ad.target_device}` : ""}
                  {ad.start_at || ad.end_at
                    ? ` · ${ad.start_at ? formatDate(ad.start_at) : "now"} → ${
                        ad.end_at ? formatDate(ad.end_at) : "open"
                      }`
                    : " · Always on"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreviewing(ad)}>
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Preview
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(draftFrom(ad))}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void patch(ad.id, {
                      status: ad.status === "active" ? "paused" : "active",
                    })
                  }
                >
                  {ad.status === "active" ? "Pause" : "Publish"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(ad)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <AdEditor
          draft={editing}
          placements={placements}
          advertisers={advertisers}
          campaigns={campaigns}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview — {previewing?.name}</DialogTitle>
            <DialogDescription>
              How this creative appears on the marketplace. Previews never count as impressions.
            </DialogDescription>
          </DialogHeader>
          {previewing && <AdPreview ad={previewing} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ad?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.name}” and its placement will be removed. Its historical impression and
              click records are kept for reporting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function draftFrom(ad: Ad): AdDraft {
  return {
    id: ad.id,
    name: ad.name,
    ad_type: ad.ad_type,
    placement_key: ad.placement_key,
    title: ad.title ?? "",
    subtitle: ad.subtitle ?? "",
    cta_label: ad.cta_label ?? "",
    image_url: ad.image_url,
    link_type: ad.link_type,
    link_value: ad.link_value ?? "",
    advertiser_id: ad.advertiser_id,
    campaign_id: ad.campaign_id,
    target_page: ad.target_page ?? "",
    target_category_id: ad.target_category_id,
    target_shop_id: ad.target_shop_id,
    target_product_id: ad.target_product_id,
    target_service_category_slug: ad.target_service_category_slug ?? "",
    target_location: ad.target_location ?? "",
    target_device: ad.target_device,
    priority: String(ad.priority),
    status: ad.status,
    is_active: ad.is_active,
    start_at: toLocalInput(ad.start_at),
    end_at: toLocalInput(ad.end_at),
  };
}

function AdEditor({
  draft,
  placements,
  advertisers,
  campaigns,
  onClose,
  onSaved,
}: {
  draft: AdDraft;
  placements: AdPlacement[];
  advertisers: Advertiser[];
  campaigns: AdCampaign[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AdDraft>(draft);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: shops = [] } = useQuery(shopsQuery());
  const { data: categories = [] } = useQuery(categoriesQuery);

  const set = <K extends keyof AdDraft>(key: K, value: AdDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Give the ad a name");
      return;
    }
    setSaving(true);
    try {
      const image = file ? await uploadImage(file, "ads") : form.image_url;
      const payload = {
        name: form.name.trim().slice(0, 120),
        ad_type: form.ad_type,
        placement_key: form.placement_key,
        title: form.title.trim().slice(0, 120) || null,
        subtitle: form.subtitle.trim().slice(0, 200) || null,
        cta_label: form.cta_label.trim().slice(0, 40) || null,
        image_url: image,
        link_type: form.link_type,
        link_value: form.link_type === "none" ? null : form.link_value.trim().slice(0, 500) || null,
        advertiser_id: form.advertiser_id,
        campaign_id: form.campaign_id,
        target_page: form.target_page.trim().slice(0, 200) || null,
        target_category_id: form.target_category_id,
        target_shop_id: form.target_shop_id,
        target_product_id: form.target_product_id,
        target_service_category_slug: form.target_service_category_slug.trim() || null,
        target_location: form.target_location.trim().slice(0, 120) || null,
        target_device: form.target_device,
        priority: Number(form.priority) || 0,
        status: form.status,
        is_active: form.is_active,
        start_at: fromLocalInput(form.start_at),
        end_at: fromLocalInput(form.end_at),
      };
      const { error } = form.id
        ? await supabase.from("ads").update(payload).eq("id", form.id)
        : await supabase.from("ads").insert(payload);
      if (error) throw error;
      toast.success(form.id ? "Ad updated" : "Ad created");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? supabaseErrorMessage(err) : "Could not save ad");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit ad" : "New ad"}</DialogTitle>
          <DialogDescription>
            Publish it to go live instantly. Targeting is applied when the ad is served.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ad-name">Internal name</Label>
              <Input
                id="ad-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Meskel flowers promo"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Placement</Label>
              <Select value={form.placement_key} onValueChange={(v) => set("placement_key", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {placements.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Creative type</Label>
              <Select value={form.ad_type} onValueChange={(v) => set("ad_type", v as AdType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AD_TYPE_LABEL) as AdType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {AD_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v as AdStatus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AD_STATUS_LABEL) as AdStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {AD_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="ad-title">Headline</Label>
            <Input
              id="ad-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Fresh flowers, delivered today"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ad-subtitle">Supporting line</Label>
            <Input
              id="ad-subtitle"
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="Order before 4pm"
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ad-cta">Button label</Label>
              <Input
                id="ad-cta"
                value={form.cta_label}
                onChange={(e) => set("cta_label", e.target.value)}
                placeholder="Shop now"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ad-priority">Priority (higher runs first)</Label>
              <Input
                id="ad-priority"
                type="number"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Image</Label>
            <div className="mt-1 flex items-center gap-3">
              {form.image_url && (
                <StorageImage
                  path={form.image_url}
                  alt="Ad creative"
                  className="h-16 w-28 rounded-lg object-cover"
                />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary">
                <ImagePlus className="h-4 w-4" />
                {form.image_url ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-bold">Destination</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Select
                value={form.link_type}
                onValueChange={(v) => set("link_type", v as AdLinkType)}
              >
                <SelectTrigger aria-label="Link type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AD_LINK_LABEL) as AdLinkType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {AD_LINK_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.link_type === "shop" && (
                <Select
                  value={form.link_value || "none"}
                  onValueChange={(v) => set("link_value", v === "none" ? "" : v)}
                >
                  <SelectTrigger aria-label="Target shop">
                    <SelectValue placeholder="Choose a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choose a shop…</SelectItem>
                    {shops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {(form.link_type === "product" || form.link_type === "service") && (
                <Input
                  value={form.link_value}
                  onChange={(e) => set("link_value", e.target.value)}
                  placeholder={form.link_type === "product" ? "Product ID" : "Service ID"}
                />
              )}
              {form.link_type === "external" && (
                <Input
                  value={form.link_value}
                  onChange={(e) => set("link_value", e.target.value)}
                  placeholder="https://…"
                  inputMode="url"
                />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Target className="h-4 w-4" /> Targeting
              <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Select
                value={form.target_device}
                onValueChange={(v) => set("target_device", v as AdDraft["target_device"])}
              >
                <SelectTrigger aria-label="Target device">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All devices</SelectItem>
                  <SelectItem value="mobile">Mobile only</SelectItem>
                  <SelectItem value="desktop">Desktop only</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={form.target_category_id ?? "all"}
                onValueChange={(v) => set("target_category_id", v === "all" ? null : v)}
              >
                <SelectTrigger aria-label="Target category">
                  <SelectValue placeholder="Any category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={form.target_location}
                onChange={(e) => set("target_location", e.target.value)}
                placeholder="Location, e.g. Bishoftu"
                aria-label="Target location"
              />
              <Input
                value={form.target_page}
                onChange={(e) => set("target_page", e.target.value)}
                placeholder="Page path, e.g. /special-moments"
                aria-label="Target page"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ad-start">Start</Label>
              <Input
                id="ad-start"
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => set("start_at", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ad-end">End</Label>
              <Input
                id="ad-end"
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => set("end_at", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-bold">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive creatives are never served, regardless of status.
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => set("is_active", v)}
              aria-label="Ad active"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : form.id ? "Save changes" : "Create ad"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// Advertisers

type AdvertiserDraft = {
  id?: string;
  name: string;
  shop_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  is_active: boolean;
};

const emptyAdvertiser = (): AdvertiserDraft => ({
  name: "",
  shop_id: null,
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
  is_active: true,
});

function AdvertisersAdmin() {
  const qc = useQueryClient();
  const { data: advertisers = [], isLoading } = useQuery(adminAdvertisersQuery);
  const { data: shops = [] } = useQuery(shopsQuery());
  const [editing, setEditing] = useState<AdvertiserDraft | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-advertisers"] });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      name: editing.name.trim().slice(0, 120),
      shop_id: editing.shop_id,
      contact_name: editing.contact_name.trim().slice(0, 120) || null,
      contact_email: editing.contact_email.trim().slice(0, 160) || null,
      contact_phone: editing.contact_phone.trim().slice(0, 40) || null,
      notes: editing.notes.trim().slice(0, 500) || null,
      is_active: editing.is_active,
    };
    const { error } = editing.id
      ? await supabase.from("advertisers").update(payload).eq("id", editing.id)
      : await supabase.from("advertisers").insert(payload);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    toast.success(editing.id ? "Advertiser updated" : "Advertiser added");
    setEditing(null);
    refresh();
  };

  return (
    <>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => setEditing(emptyAdvertiser())}>
          <Plus className="mr-2 h-4 w-4" />
          New advertiser
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading advertisers…</p>
      ) : advertisers.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-bold">No advertisers yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add the businesses buying ad space. Link an advertiser to an existing shop to reuse its
            details.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {advertisers.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-sm font-bold">{a.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    a.is_active
                      ? "bg-primary-soft text-accent-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {a.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.contact_name || "No contact"}
                {a.contact_phone ? ` · ${a.contact_phone}` : ""}
              </p>
              {a.contact_email && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.contact_email}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() =>
                  setEditing({
                    id: a.id,
                    name: a.name,
                    shop_id: a.shop_id,
                    contact_name: a.contact_name ?? "",
                    contact_email: a.contact_email ?? "",
                    contact_phone: a.contact_phone ?? "",
                    notes: a.notes ?? "",
                    is_active: a.is_active,
                  })
                }
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit advertiser" : "New advertiser"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label htmlFor="adv-name">Business name</Label>
                <Input
                  id="adv-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Linked shop</Label>
                <Select
                  value={editing.shop_id ?? "none"}
                  onValueChange={(v) =>
                    setEditing({ ...editing, shop_id: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Not linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked</SelectItem>
                    {shops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="adv-contact">Contact name</Label>
                  <Input
                    id="adv-contact"
                    value={editing.contact_name}
                    onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="adv-phone">Phone</Label>
                  <Input
                    id="adv-phone"
                    value={editing.contact_phone}
                    onChange={(e) => setEditing({ ...editing, contact_phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="adv-email">Email</Label>
                <Input
                  id="adv-email"
                  type="email"
                  value={editing.contact_email}
                  onChange={(e) => setEditing({ ...editing, contact_email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="adv-notes">Notes</Label>
                <Textarea
                  id="adv-notes"
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <p className="text-sm font-bold">Active</p>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===========================================================================
// Campaigns

type CampaignDraft = {
  id?: string;
  name: string;
  advertiser_id: string | null;
  objective: string;
  status: AdStatus;
  start_date: string;
  end_date: string;
  budget: string;
  notes: string;
};

const emptyCampaign = (): CampaignDraft => ({
  name: "",
  advertiser_id: null,
  objective: "",
  status: "draft",
  start_date: "",
  end_date: "",
  budget: "",
  notes: "",
});

function CampaignsAdmin() {
  const qc = useQueryClient();
  const { data: campaigns = [], isLoading } = useQuery(adminAdCampaignsQuery);
  const { data: advertisers = [] } = useQuery(adminAdvertisersQuery);
  const [editing, setEditing] = useState<CampaignDraft | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      name: editing.name.trim().slice(0, 120),
      advertiser_id: editing.advertiser_id,
      objective: editing.objective.trim().slice(0, 200) || null,
      status: editing.status,
      start_date: editing.start_date || null,
      end_date: editing.end_date || null,
      budget: editing.budget ? Number(editing.budget) : null,
      notes: editing.notes.trim().slice(0, 500) || null,
    };
    const { error } = editing.id
      ? await supabase.from("ad_campaigns").update(payload).eq("id", editing.id)
      : await supabase.from("ad_campaigns").insert(payload);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    toast.success(editing.id ? "Campaign updated" : "Campaign created");
    setEditing(null);
    refresh();
  };

  return (
    <>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => setEditing(emptyCampaign())}>
          <Plus className="mr-2 h-4 w-4" />
          New campaign
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading campaigns…</p>
      ) : campaigns.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-bold">No campaigns yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Group ads into a campaign to control their shared schedule and budget.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {campaigns.map((c) => {
            const advertiser = advertisers.find((a) => a.id === c.advertiser_id);
            return (
              <div
                key={c.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold">{c.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        AD_STATUS_TONE[c.status],
                      )}
                    >
                      {AD_STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {advertiser?.name ?? "No advertiser"}
                    {c.objective ? ` · ${c.objective}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {c.start_date ? formatDate(c.start_date) : "No start"} →{" "}
                    {c.end_date ? formatDate(c.end_date) : "No end"}
                    {c.budget != null ? ` · ${ETB(c.budget)} budget` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setEditing({
                      id: c.id,
                      name: c.name,
                      advertiser_id: c.advertiser_id,
                      objective: c.objective ?? "",
                      status: c.status,
                      start_date: c.start_date ?? "",
                      end_date: c.end_date ?? "",
                      budget: c.budget != null ? String(c.budget) : "",
                      notes: c.notes ?? "",
                    })
                  }
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit campaign" : "New campaign"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label htmlFor="camp-name">Name</Label>
                <Input
                  id="camp-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Advertiser</Label>
                <Select
                  value={editing.advertiser_id ?? "none"}
                  onValueChange={(v) =>
                    setEditing({ ...editing, advertiser_id: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="No advertiser" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No advertiser</SelectItem>
                    {advertisers.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editing.status}
                    onValueChange={(v) => setEditing({ ...editing, status: v as AdStatus })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AD_STATUS_LABEL) as AdStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {AD_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="camp-budget">Budget (ETB)</Label>
                  <Input
                    id="camp-budget"
                    type="number"
                    value={editing.budget}
                    onChange={(e) => setEditing({ ...editing, budget: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="camp-start">Start date</Label>
                  <Input
                    id="camp-start"
                    type="date"
                    value={editing.start_date}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="camp-end">End date</Label>
                  <Input
                    id="camp-end"
                    type="date"
                    value={editing.end_date}
                    onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="camp-objective">Objective</Label>
                <Input
                  id="camp-objective"
                  value={editing.objective}
                  onChange={(e) => setEditing({ ...editing, objective: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="camp-notes">Notes</Label>
                <Textarea
                  id="camp-notes"
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===========================================================================
// Placements

function PlacementsAdmin() {
  const qc = useQueryClient();
  const { data: placements = [], isLoading } = useQuery(adminAdPlacementsQuery);
  const { data: ads = [] } = useQuery(adminAdsQuery);

  const toggle = async (p: AdPlacement) => {
    const { error } = await supabase
      .from("ad_placements")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-ad-placements"] });
    void qc.invalidateQueries({ queryKey: ["ad-placements"] });
  };

  if (isLoading) return <p className="mt-6 text-sm text-muted-foreground">Loading placements…</p>;

  return (
    <div className="mt-5 space-y-3">
      <p className="text-sm text-muted-foreground">
        Placements are the fixed spots the app renders. Each slot only shows live ads assigned to
        it.
      </p>
      {placements.map((p) => {
        const live = ads.filter((a) => a.placement_key === p.key && a.status === "active").length;
        return (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-sm font-bold">{p.name}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {p.layout}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  max {p.max_ads}
                </span>
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {live} live
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{p.is_active ? "On" : "Off"}</span>
              <Switch checked={p.is_active} onCheckedChange={() => void toggle(p)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================================
// Packages

type PackageDraft = {
  id?: string;
  name: string;
  description: string;
  duration_days: string;
  price: string;
  placements: string[];
  is_active: boolean;
  sort_order: string;
};

const emptyPackage = (): PackageDraft => ({
  name: "",
  description: "",
  duration_days: "7",
  price: "0",
  placements: [],
  is_active: true,
  sort_order: "0",
});

function PackagesAdmin() {
  const qc = useQueryClient();
  const { data: packages = [], isLoading } = useQuery(adminAdPackagesQuery);
  const { data: placements = [] } = useQuery(adminAdPlacementsQuery);
  const [editing, setEditing] = useState<PackageDraft | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-ad-packages"] });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      name: editing.name.trim().slice(0, 120),
      description: editing.description.trim().slice(0, 400) || null,
      duration_days: Number(editing.duration_days) || 7,
      price: Number(editing.price) || 0,
      placements: editing.placements,
      is_active: editing.is_active,
      sort_order: Number(editing.sort_order) || 0,
    };
    const { error } = editing.id
      ? await supabase.from("ad_packages").update(payload).eq("id", editing.id)
      : await supabase.from("ad_packages").insert(payload);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    toast.success(editing.id ? "Package updated" : "Package created");
    setEditing(null);
    refresh();
  };

  return (
    <>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => setEditing(emptyPackage())}>
          <Plus className="mr-2 h-4 w-4" />
          New package
        </Button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading packages…</p>
      ) : packages.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-bold">No packages yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Define sellable bundles (e.g. “7 days on Home + Category”) to quote advertisers
            consistently.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map((p: AdPackage) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-sm font-bold">{p.name}</span>
                <span className="font-display text-sm font-bold text-primary">{ETB(p.price)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.duration_days} days · {p.placements.length} placements
              </p>
              {p.description && (
                <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() =>
                  setEditing({
                    id: p.id,
                    name: p.name,
                    description: p.description ?? "",
                    duration_days: String(p.duration_days),
                    price: String(p.price),
                    placements: p.placements ?? [],
                    is_active: p.is_active,
                    sort_order: String(p.sort_order),
                  })
                }
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit package" : "New package"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label htmlFor="pkg-name">Name</Label>
                <Input
                  id="pkg-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pkg-days">Duration (days)</Label>
                  <Input
                    id="pkg-days"
                    type="number"
                    value={editing.duration_days}
                    onChange={(e) => setEditing({ ...editing, duration_days: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pkg-price">Price (ETB)</Label>
                  <Input
                    id="pkg-price"
                    type="number"
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pkg-desc">Description</Label>
                <Textarea
                  id="pkg-desc"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Included placements</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {placements.map((p) => {
                    const on = editing.placements.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            placements: on
                              ? editing.placements.filter((k) => k !== p.key)
                              : [...editing.placements, p.key],
                          })
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-secondary",
                        )}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <p className="text-sm font-bold">Active</p>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===========================================================================
// Analytics

const RANGES = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: 0 },
] as const;

function AnalyticsAdmin() {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30");
  const { from, to } = useMemo(() => {
    const preset = RANGES.find((r) => r.id === range) ?? RANGES[1];
    if (!preset.days) return { from: undefined, to: undefined };
    const now = new Date();
    const start = new Date(now.getTime() - preset.days * 24 * 60 * 60 * 1000);
    return { from: start.toISOString(), to: now.toISOString() };
  }, [range]);

  const { data: rows = [], isLoading, error } = useQuery(adminAdAnalyticsQuery(from, to));

  const totals = rows.reduce(
    (acc, r) => {
      acc.impressions += Number(r.impressions) || 0;
      acc.clicks += Number(r.clicks) || 0;
      return acc;
    },
    { impressions: 0, clicks: 0 },
  );
  const overallCtr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              range === r.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-secondary",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Eye}
          label="Impressions"
          value={totals.impressions.toLocaleString()}
          hint="Ads seen (once per visitor/hour)"
        />
        <StatCard
          icon={MousePointerClick}
          label="Clicks"
          value={totals.clicks.toLocaleString()}
          hint="Clicks through to the destination"
        />
        <StatCard
          icon={TrendingUp}
          label="Click-through rate"
          value={`${overallCtr.toFixed(2)}%`}
          hint="Clicks ÷ impressions"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading performance…</p>
      ) : error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Could not load analytics. Confirm the advertising migration has been applied.
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-bold">No ads to report on yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Performance is recorded from real visitor activity. Create and publish an ad to start
            collecting impressions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Ad</th>
                <th className="px-4 py-3">Placement</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: AdAnalyticsRow) => (
                <tr key={r.ad_id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.ad_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.advertiser_name ?? "No advertiser"}
                      {r.campaign_name ? ` · ${r.campaign_name}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {AD_PLACEMENT_LABEL[r.placement_key] ?? r.placement_key}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(r.impressions).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(r.clicks).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(r.ctr).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
