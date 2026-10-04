import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import {
  serviceCategoriesQuery,
  servicesQuery,
  OCCASIONS,
  HOLIDAY_OCCASIONS,
  type ServiceFilters,
} from "@/lib/special-moments";
import { ServiceCategoryPill, ServiceCard } from "@/components/special-moments/ServiceCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GridSkeleton } from "@/components/account/States";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { OPTION_LABEL_KEY } from "@/lib/special-moments";

type SearchState = {
  q?: string | undefined;
  category?: string | undefined;
  occasion?: string | undefined;
  max?: number | undefined;
  area?: string | undefined;
};

export const Route = createFileRoute("/special-moments/search")({
  validateSearch: (s: Record<string, unknown>): SearchState => {
    const out: SearchState = {};
    if (typeof s["q"] === "string" && s["q"]) out.q = s["q"];
    if (typeof s["category"] === "string" && s["category"]) out.category = s["category"];
    if (typeof s["occasion"] === "string" && s["occasion"]) out.occasion = s["occasion"];
    if (typeof s["area"] === "string" && s["area"]) out.area = s["area"];
    const max = Number(s["max"]);
    if (Number.isFinite(max) && max > 0) out.max = max;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Search Special Moments — የኔ Go" },
      {
        name: "description",
        content:
          "Search and filter gifts, surprises, holiday gifts, catering and decoration by category, occasion, price and location.",
      },
    ],
  }),
  component: SpecialMomentsSearch,
});

const OCCASION_OPTIONS = [...OCCASIONS, ...HOLIDAY_OCCASIONS];

function SpecialMomentsSearch() {
  const { t } = useLanguage();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: categories = [] } = useQuery(serviceCategoriesQuery);

  const [term, setTerm] = useState(search.q ?? "");
  const [area, setArea] = useState(search.area ?? "");
  const [max, setMax] = useState(search.max ? String(search.max) : "");

  useEffect(() => {
    setTerm(search.q ?? "");
    setArea(search.area ?? "");
    setMax(search.max ? String(search.max) : "");
  }, [search.q, search.area, search.max]);

  const filters: ServiceFilters = {
    categoryId: search.category
      ? (categories.find((c) => c.slug === search.category)?.id ?? "__none__")
      : null,
    occasion: search.occasion ?? null,
    search: search.q ?? null,
    maxPrice: search.max ?? null,
    area: search.area ?? null,
  };

  const { data: services = [], isLoading } = useQuery(servicesQuery(filters));

  const setParam = (patch: Partial<SearchState>) => {
    const next: SearchState = { ...search, ...patch };
    for (const key of Object.keys(next) as (keyof SearchState)[]) {
      if (next[key] === undefined) delete next[key];
    }
    void navigate({ to: "/special-moments/search", search: next });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParam({
      q: term.trim() || undefined,
      area: area.trim() || undefined,
      max: max ? Number(max) : undefined,
    });
  };

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-ligo py-8">
          <h1 className="font-display text-3xl font-extrabold">{t("sms_title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("sms_sub")}</p>

          <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={t("sms_placeholder")}
                className="h-11 pl-9"
                aria-label={t("sms_aria_search")}
              />
            </div>
            <Button type="submit" size="lg" className="h-11">
              {t("sms_search")}
            </Button>
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="sm-area" className="text-xs">
                  {t("sms_location")}
                </Label>
                <Input
                  id="sm-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={t("sms_area_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sm-max" className="text-xs">
                  {t("sms_max_price")}
                </Label>
                <Input
                  id="sm-max"
                  type="number"
                  min={0}
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  placeholder={t("sms_any")}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="outline" className="w-full sm:w-auto">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {t("sms_apply")}
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setParam({ category: undefined })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                !search.category
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card",
              )}
            >
              {t("sms_all_categories")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setParam({ category: c.slug })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                  search.category === c.slug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setParam({ occasion: undefined })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                !search.occasion
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {t("sms_any_occasion")}
            </button>
            {OCCASION_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setParam({ occasion: o })}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  search.occasion === o
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {t(OPTION_LABEL_KEY[o] ?? "sms_any_occasion")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container-ligo py-8">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? t("sms_searching")
            : t(services.length === 1 ? "sms_found" : "sms_found_plural", {
                count: services.length,
              })}
        </p>
        {isLoading ? (
          <div className="mt-5">
            <GridSkeleton count={6} />
          </div>
        ) : services.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <Search className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-3 font-display font-bold">{t("sms_no_match")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {t("sms_no_match_text")}
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => void navigate({ to: "/special-moments/search", search: {} })}
            >
              {t("sms_clear")}
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}

        {categories.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-lg font-bold">{t("sms_jump")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((c) => (
                <ServiceCategoryPill key={c.id} category={c} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
