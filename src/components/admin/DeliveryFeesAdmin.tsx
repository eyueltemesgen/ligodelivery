import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { ETB } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Rule = {
  id: string;
  min_distance: number;
  max_distance: number | null;
  fee: number;
  label: string | null;
  is_active: boolean;
  priority: number;
};

type DeliverySettings = {
  pricing_method: "brackets" | "base_plus_km";
  base_fee: number;
  per_km: number;
  max_distance_km: number | null;
  enabled: boolean;
};

const DEFAULTS: DeliverySettings = {
  pricing_method: "brackets",
  base_fee: 25,
  per_km: 10,
  max_distance_km: 10,
  enabled: true,
};

type Draft = {
  min: string;
  max: string;
  fee: string;
  label: string;
};

const EMPTY_DRAFT: Draft = { min: "0", max: "", fee: "", label: "" };

export function DeliveryFeesAdmin() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [savingSettings, setSavingSettings] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ["admin-delivery-rules"],
    queryFn: async () =>
      ((
        await supabase
          .from("delivery_fee_rules")
          .select("*")
          .order("priority")
          .order("min_distance")
      ).data ?? []) as Rule[],
  });

  const { data: loaded } = useQuery({
    queryKey: ["admin-delivery-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "delivery")
        .maybeSingle();
      return { ...DEFAULTS, ...((data?.value ?? {}) as Partial<DeliverySettings>) };
    },
  });

  useEffect(() => {
    if (loaded && !settings) setSettings(loaded);
  }, [loaded, settings]);

  const value = settings ?? loaded ?? DEFAULTS;

  /** Reject overlapping / inverted ranges before they reach the database. */
  const validateDraft = (d: Draft, ignoreId?: string): string | null => {
    const min = Number(d.min);
    const max = d.max.trim() === "" ? null : Number(d.max);
    const fee = Number(d.fee);
    if (Number.isNaN(min) || min < 0) return t("dfe_err_min");
    if (max != null && (Number.isNaN(max) || max <= min)) return t("dfe_err_range");
    if (Number.isNaN(fee) || fee < 0) return t("dfe_err_fee");
    for (const r of rules) {
      if (r.id === ignoreId) continue;
      const rMin = Number(r.min_distance);
      const rMax = r.max_distance == null ? Infinity : Number(r.max_distance);
      const dMax = max == null ? Infinity : max;
      if (min < rMax && rMin < dMax) return t("dfe_err_overlap", { range: rangeLabel(r) });
    }
    return null;
  };

  const rangeLabel = (r: { min_distance: number; max_distance: number | null }) =>
    r.max_distance == null ? `${r.min_distance}+ km` : `${r.min_distance}-${r.max_distance} km`;

  const addRule = async () => {
    const err = validateDraft(draft);
    if (err) {
      toast.error(err);
      return;
    }
    const max = draft.max.trim() === "" ? null : Number(draft.max);
    const { error } = await supabase.from("delivery_fee_rules").insert({
      min_distance: Number(draft.min),
      max_distance: max,
      fee: Number(draft.fee),
      label:
        draft.label.trim() || rangeLabel({ min_distance: Number(draft.min), max_distance: max }),
      priority: rules.length + 1,
      is_active: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft(EMPTY_DRAFT);
    void qc.invalidateQueries({ queryKey: ["admin-delivery-rules"] });
    void qc.invalidateQueries({ queryKey: ["delivery-fee-rules"] });
    toast.success(t("dfe_rule_added"));
  };

  const updateRule = async (r: Rule, patch: Partial<Rule>) => {
    const merged = { ...r, ...patch };
    const err = validateDraft(
      {
        min: String(merged.min_distance),
        max: merged.max_distance == null ? "" : String(merged.max_distance),
        fee: String(merged.fee),
        label: merged.label ?? "",
      },
      r.id,
    );
    if (err) {
      toast.error(err);
      return;
    }
    const { error } = await supabase.from("delivery_fee_rules").update(patch).eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-delivery-rules"] });
    void qc.invalidateQueries({ queryKey: ["delivery-fee-rules"] });
  };

  const removeRule = async (id: string) => {
    const { error } = await supabase.from("delivery_fee_rules").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-delivery-rules"] });
    void qc.invalidateQueries({ queryKey: ["delivery-fee-rules"] });
    toast.success(t("dfe_rule_deleted"));
  };

  /** Swap priority with the neighbour to reorder brackets. */
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rules.length) return;
    const a = rules[index]!;
    const b = rules[target]!;
    await Promise.all([
      supabase.from("delivery_fee_rules").update({ priority: b.priority }).eq("id", a.id),
      supabase.from("delivery_fee_rules").update({ priority: a.priority }).eq("id", b.id),
    ]);
    void qc.invalidateQueries({ queryKey: ["admin-delivery-rules"] });
    void qc.invalidateQueries({ queryKey: ["delivery-fee-rules"] });
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "delivery", value: value as never, is_public: true }, { onConflict: "key" });
    setSavingSettings(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-delivery-settings"] });
    void qc.invalidateQueries({ queryKey: ["settings", "public"] });
    toast.success(t("dfe_saved"));
  };

  const preview = useMemo(() => {
    if (value.pricing_method === "base_plus_km")
      return [1, 3, 6].map((km) => ({
        km,
        fee: Math.round(value.base_fee + value.per_km * km),
      }));
    return [];
  }, [value]);

  return (
    <div className="mt-6 space-y-6">
      <form
        onSubmit={saveSettings}
        className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <h3 className="font-display text-lg font-bold">{t("dfe_title")}</h3>
        <p className="text-sm text-muted-foreground">{t("dfe_desc")}</p>

        <div className="space-y-1.5">
          <Label>{t("dfe_method")}</Label>
          <div className="flex flex-wrap gap-2">
            {(["brackets", "base_plus_km"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSettings({ ...value, pricing_method: m })}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  value.pricing_method === m ? "border-primary bg-primary-soft" : "border-border"
                }`}
              >
                {m === "brackets" ? t("dfe_method_brackets") : t("dfe_method_base_km")}
              </button>
            ))}
          </div>
        </div>

        {value.pricing_method === "base_plus_km" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dfe-base">{t("dfe_base_fee")}</Label>
              <Input
                id="dfe-base"
                type="number"
                min={0}
                value={value.base_fee}
                onChange={(e) => setSettings({ ...value, base_fee: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dfe-perkm">{t("dfe_per_km")}</Label>
              <Input
                id="dfe-perkm"
                type="number"
                min={0}
                value={value.per_km}
                onChange={(e) => setSettings({ ...value, per_km: Number(e.target.value) || 0 })}
              />
            </div>
            {preview.length > 0 && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                {preview.map((p) => `${p.km} km → ${ETB(p.fee)}`).join(" · ")}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="dfe-max">{t("dfe_max_distance")}</Label>
          <Input
            id="dfe-max"
            type="number"
            min={0}
            value={value.max_distance_km ?? ""}
            onChange={(e) =>
              setSettings({
                ...value,
                max_distance_km: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <p className="text-xs text-muted-foreground">{t("dfe_max_hint")}</p>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm font-medium">
          {t("dfe_enabled")}
          <Switch
            checked={value.enabled}
            onCheckedChange={(v) => setSettings({ ...value, enabled: v })}
          />
        </label>

        <Button type="submit" disabled={savingSettings}>
          {savingSettings ? t("aop_saving") : t("dfe_save")}
        </Button>
      </form>

      {value.pricing_method === "brackets" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-bold">{t("dfe_brackets")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("dfe_brackets_hint")}</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2">{t("dfe_from")}</th>
                  <th className="pb-2">{t("dfe_to")}</th>
                  <th className="pb-2">{t("dfe_fee")}</th>
                  <th className="pb-2">{t("dfe_label")}</th>
                  <th className="pb-2">{t("dfe_active")}</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r, i) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        defaultValue={r.min_distance}
                        className="h-9 w-24"
                        onBlur={(e) => void updateRule(r, { min_distance: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        defaultValue={r.max_distance ?? ""}
                        placeholder={t("dfe_open_ended")}
                        className="h-9 w-24"
                        onBlur={(e) =>
                          void updateRule(r, {
                            max_distance: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        defaultValue={r.fee}
                        className="h-9 w-24"
                        onBlur={(e) => void updateRule(r, { fee: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.label ?? rangeLabel(r)}</td>
                    <td className="py-2 pr-2">
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={(v) => void updateRule(r, { is_active: v })}
                      />
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={t("dfe_move_up")}
                          onClick={() => void move(i, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={t("dfe_move_down")}
                          onClick={() => void move(i, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          aria-label={t("aop_delete")}
                          onClick={() => void removeRule(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg bg-secondary/50 p-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("dfe_from")}</Label>
              <Input
                type="number"
                value={draft.min}
                onChange={(e) => setDraft({ ...draft, min: e.target.value })}
                className="h-9 w-24"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("dfe_to")}</Label>
              <Input
                type="number"
                value={draft.max}
                onChange={(e) => setDraft({ ...draft, max: e.target.value })}
                placeholder={t("dfe_open_ended")}
                className="h-9 w-24"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("dfe_fee")}</Label>
              <Input
                type="number"
                value={draft.fee}
                onChange={(e) => setDraft({ ...draft, fee: e.target.value })}
                className="h-9 w-24"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("dfe_label")}</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className="h-9 w-40"
              />
            </div>
            <Button type="button" onClick={() => void addRule()}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("dfe_add_rule")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
