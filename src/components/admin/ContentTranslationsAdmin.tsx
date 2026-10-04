import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isMissingTable, supabaseErrorMessage } from "@/lib/supa-error";
import { LANGUAGES, TRANSLATABLE_FIELDS, useI18n } from "@/lib/i18n";
import type { ContentEntityType, TranslatableField } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EntityOption = { id: string; label: string };

type EntityConfig = {
  type: ContentEntityType;
  table: "shops" | "products" | "categories" | "services" | "service_categories" | "offers";
  labelField: "name" | "title";
  fields: TranslatableField[];
  labelKey: string;
};

const ENTITY_CONFIGS: EntityConfig[] = [
  {
    type: "shop",
    table: "shops",
    labelField: "name",
    fields: ["name", "description"],
    labelKey: "admin.entityShop",
  },
  {
    type: "product",
    table: "products",
    labelField: "name",
    fields: ["name", "description"],
    labelKey: "admin.entityProduct",
  },
  {
    type: "category",
    table: "categories",
    labelField: "name",
    fields: ["name"],
    labelKey: "admin.entityCategory",
  },
  {
    type: "service",
    table: "services",
    labelField: "name",
    fields: ["name", "description"],
    labelKey: "admin.entityService",
  },
  {
    type: "service_category",
    table: "service_categories",
    labelField: "name",
    fields: ["name", "tagline", "description"],
    labelKey: "admin.entityServiceCategory",
  },
  {
    type: "offer",
    table: "offers",
    labelField: "title",
    fields: ["name", "description"],
    labelKey: "admin.entityOffer",
  },
];

const FIELD_LABEL_KEYS: Record<TranslatableField, string> = {
  name: "admin.fieldName",
  description: "admin.fieldDescription",
  tagline: "admin.fieldTagline",
};

/**
 * Admin editor for optional dynamic-content translations. English stays the
 * source of truth in the base tables; each row here overrides one field for one
 * language and the storefront falls back to English when a value is absent.
 */
export function ContentTranslationsAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [entityType, setEntityType] = useState<ContentEntityType>("shop");
  const [entityId, setEntityId] = useState("");
  const [lang, setLang] = useState("am");
  const [draft, setDraft] = useState<Partial<Record<TranslatableField, string>>>({});
  const [saving, setSaving] = useState(false);

  const config = ENTITY_CONFIGS.find((c) => c.type === entityType) ?? ENTITY_CONFIGS[0]!;

  const { data: entities = [] } = useQuery({
    queryKey: ["translation-entities", config.table],
    queryFn: async (): Promise<EntityOption[]> => {
      const { data, error } = await supabase
        .from(config.table)
        .select(`id,${config.labelField}`)
        .order(config.labelField)
        .limit(500);
      if (error) {
        if (isMissingTable(error)) return [];
        throw error;
      }
      return (data ?? []).map((row) => {
        const record = row as unknown as Record<string, string>;
        return { id: record["id"]!, label: record[config.labelField] ?? record["id"]! };
      });
    },
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["translation-values", entityType, entityId, lang],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_translations")
        .select("field,value")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("language", lang);
      if (error) {
        if (isMissingTable(error)) return [];
        throw error;
      }
      return data ?? [];
    },
  });

  useEffect(() => {
    const next: Partial<Record<TranslatableField, string>> = {};
    for (const row of existing) {
      if ((TRANSLATABLE_FIELDS as readonly string[]).includes(row.field)) {
        next[row.field as TranslatableField] = row.value;
      }
    }
    setDraft(next);
  }, [existing]);

  const languageOptions = useMemo(() => LANGUAGES.filter((l) => l.code !== "en"), []);

  const save = async () => {
    if (!entityId) return;
    setSaving(true);
    try {
      const rows = config.fields
        .map((field) => ({ field, value: (draft[field] ?? "").trim() }))
        .filter((row) => row.value.length > 0);
      if (rows.length === 0) {
        toast.error(t("admin.translationEmpty"));
        return;
      }
      const { error } = await supabase.from("content_translations").upsert(
        rows.map((row) => ({
          entity_type: entityType,
          entity_id: entityId,
          field: row.field,
          language: lang,
          value: row.value,
        })),
        { onConflict: "entity_type,entity_id,field,language" },
      );
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: ["translation-values"] });
      void qc.invalidateQueries({ queryKey: ["content-translations"] });
      toast.success(t("admin.translationSaved"));
    } catch (err) {
      toast.error(supabaseErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (field: TranslatableField) => {
    if (!entityId) return;
    const { error } = await supabase
      .from("content_translations")
      .delete()
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("field", field)
      .eq("language", lang);
    if (error) {
      toast.error(supabaseErrorMessage(error));
      return;
    }
    void qc.invalidateQueries({ queryKey: ["translation-values"] });
    void qc.invalidateQueries({ queryKey: ["content-translations"] });
    toast.success(t("admin.translationDeleted"));
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <h3 className="font-display font-bold">{t("admin.languageSection")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.languageSectionDesc")}</p>
      </div>

      <div className="space-y-5 rounded-xl border border-border bg-card p-4 shadow-card">
        <div>
          <h3 className="font-display font-bold">{t("admin.contentTranslations")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.contentTranslationsDesc")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ct-type">{t("admin.entityType")}</Label>
            <select
              id="ct-type"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value as ContentEntityType);
                setEntityId("");
                setDraft({});
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ENTITY_CONFIGS.map((c) => (
                <option key={c.type} value={c.type}>
                  {t(c.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-entity">{t("admin.selectEntity")}</Label>
            <select
              id="ct-entity"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("admin.selectEntity")}</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-lang">{t("admin.translationLanguage")}</Label>
            <select
              id="ct-lang"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {languageOptions.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native}
                </option>
              ))}
            </select>
          </div>
        </div>

        {entityId && (
          <div className="space-y-4">
            {config.fields.map((field) => (
              <div key={field} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`ct-field-${field}`}>{t(FIELD_LABEL_KEYS[field])}</Label>
                  {draft[field] && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-destructive hover:text-destructive"
                      onClick={() => void remove(field)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("admin.deleteTranslation")}
                    </Button>
                  )}
                </div>
                {field === "name" || field === "tagline" ? (
                  <Input
                    id={`ct-field-${field}`}
                    value={draft[field] ?? ""}
                    placeholder={t("admin.translationValue")}
                    onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  />
                ) : (
                  <Textarea
                    id={`ct-field-${field}`}
                    value={draft[field] ?? ""}
                    placeholder={t("admin.translationValue")}
                    onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? t("admin.saving") : t("admin.saveTranslation")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
