import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isMissingTable } from "@/lib/supa-error";
import { useI18n } from "./I18nProvider";
import type { LanguageCode } from "./core";

/**
 * Dynamic content translations.
 *
 * English remains the source of truth in the base tables (shops, products,
 * services, categories, offers). Optional Amharic / Afaan Oromoo values live in
 * `public.content_translations`, keyed by (entity_type, entity_id, field,
 * language) — records are never duplicated. When a translation is missing the
 * English value is returned unchanged, so the storefront never shows blank text.
 *
 * The table arrives in an additive migration, so reads degrade to no-op while
 * it is still rolling out.
 */

export type ContentEntityType =
  "shop" | "product" | "service" | "service_category" | "category" | "offer";

export const TRANSLATABLE_FIELDS = ["name", "description", "tagline"] as const;
export type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number];

export type Translatable = {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  tagline?: string | null;
};

export type TranslationMap = Record<string, string>;

const fieldKey = (id: string, field: string) => `${id}:${field}`;

export function contentTranslationsQuery(entityType: ContentEntityType, lang: LanguageCode) {
  return {
    queryKey: ["content-translations", entityType, lang],
    enabled: lang !== "en",
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TranslationMap> => {
      const { data, error } = await supabase
        .from("content_translations")
        .select("entity_id,field,value")
        .eq("entity_type", entityType)
        .eq("language", lang);
      if (error) {
        if (isMissingTable(error)) return {};
        throw error;
      }
      return (data ?? []).reduce<TranslationMap>((acc, row) => {
        if (row.value) acc[fieldKey(row.entity_id, row.field)] = row.value;
        return acc;
      }, {});
    },
  };
}

/** Apply a translation map over an entity, keeping English for missing fields. */
export function localizeEntity<T extends Translatable>(
  entity: T,
  map: TranslationMap | undefined,
): T {
  const id = entity.id;
  if (!id || !map) return entity;
  let changed = false;
  const out: Translatable = { ...entity };
  for (const field of TRANSLATABLE_FIELDS) {
    const value = map[fieldKey(id, field)];
    if (value) {
      out[field] = value;
      changed = true;
    }
  }
  return changed ? (out as T) : entity;
}

/** Collection-level hook: fetch once, then localize each record on render. */
export function useContentTranslations(entityType: ContentEntityType) {
  const { lang } = useI18n();
  const { data } = useQuery(contentTranslationsQuery(entityType, lang));

  const localize = useCallback(
    <T extends Translatable>(entity: T): T => localizeEntity(entity, data),
    [data],
  );

  return useMemo(() => ({ lang, localize, map: data }), [lang, localize, data]);
}

/** Convenience hook for a single entity rendered outside a collection. */
export function useLocalizedEntity<T extends Translatable>(
  entityType: ContentEntityType,
  entity: T,
): T {
  const { localize } = useContentTranslations(entityType);
  return localize(entity);
}
