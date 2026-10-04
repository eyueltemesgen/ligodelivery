import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { ETB } from "@/lib/format";
import { useLanguage } from "@/hooks/useLanguage";
import type { ProductOption, ProductOptionGroup } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type GroupWithOptions = ProductOptionGroup & { is_active: boolean };

/**
 * Admin editor for a single product's option groups (Size, Extras, …). Reads and
 * writes the real `product_option_groups` / `product_options` tables. Products
 * with no groups stay simple: no variants are forced.
 */
export function ProductOptionsAdmin({ productId }: { productId: string }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [newGroup, setNewGroup] = useState({ name: "", required: false, multi: false });
  const [optionDrafts, setOptionDrafts] = useState<Record<string, { name: string; delta: string }>>(
    {},
  );

  const { data: groups = [] } = useQuery({
    queryKey: ["admin-product-options", productId],
    queryFn: async (): Promise<GroupWithOptions[]> => {
      const { data, error } = await supabase
        .from("product_option_groups")
        .select(
          "id,product_id,name,is_required,is_multi,sort_order,is_active,product_options(id,group_id,name,price_delta,sort_order,is_active)",
        )
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as GroupWithOptions[];
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-product-options", productId] });
    void qc.invalidateQueries({ queryKey: ["product-options", productId] });
  };

  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    const { error } = await supabase.from("product_option_groups").insert({
      product_id: productId,
      name: newGroup.name.trim(),
      is_required: newGroup.required,
      is_multi: newGroup.multi,
      sort_order: groups.length,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewGroup({ name: "", required: false, multi: false });
    invalidate();
    toast.success(t("po_group_added"));
  };

  const patchGroup = async (
    id: string,
    patch: { name?: string; is_required?: boolean; is_multi?: boolean; is_active?: boolean },
  ) => {
    const { error } = await supabase.from("product_option_groups").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
  };

  const removeGroup = async (id: string) => {
    const { error } = await supabase.from("product_option_groups").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
  };

  const addOption = async (groupId: string) => {
    const d = optionDrafts[groupId] ?? { name: "", delta: "0" };
    if (!d.name.trim()) return;
    const group = groups.find((g) => g.id === groupId);
    const { error } = await supabase.from("product_options").insert({
      group_id: groupId,
      name: d.name.trim(),
      price_delta: Number(d.delta) || 0,
      sort_order: group?.product_options.length ?? 0,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setOptionDrafts({ ...optionDrafts, [groupId]: { name: "", delta: "0" } });
    invalidate();
  };

  const patchOption = async (
    id: string,
    patch: { name?: string; price_delta?: number; is_active?: boolean },
  ) => {
    const { error } = await supabase.from("product_options").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
  };

  const removeOption = async (id: string) => {
    const { error } = await supabase.from("product_options").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-secondary/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("po_title")}
      </p>
      {groups.length === 0 && <p className="text-xs text-muted-foreground">{t("po_empty")}</p>}

      {groups.map((g) => (
        <div key={g.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              defaultValue={g.name}
              className="h-8 w-40"
              onBlur={(e) => void patchGroup(g.id, { name: e.target.value })}
            />
            <label className="flex items-center gap-1.5 text-xs">
              {t("po_required")}
              <Switch
                checked={g.is_required}
                onCheckedChange={(v) => void patchGroup(g.id, { is_required: v })}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              {t("po_multi")}
              <Switch
                checked={g.is_multi}
                onCheckedChange={(v) => void patchGroup(g.id, { is_multi: v })}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              {t("dfe_active")}
              <Switch
                checked={g.is_active}
                onCheckedChange={(v) => void patchGroup(g.id, { is_active: v })}
              />
            </label>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="ml-auto text-destructive"
              aria-label={t("aop_delete")}
              onClick={() => void removeGroup(g.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {(g.product_options ?? []).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2">
                <Input
                  defaultValue={o.name}
                  className="h-8 w-40"
                  onBlur={(e) => void patchOption(o.id, { name: e.target.value })}
                />
                <Input
                  type="number"
                  defaultValue={o.price_delta}
                  className="h-8 w-24"
                  onBlur={(e) => void patchOption(o.id, { price_delta: Number(e.target.value) })}
                />
                <span className="text-xs text-muted-foreground">+{ETB(Number(o.price_delta))}</span>
                <Switch
                  checked={(o as ProductOption & { is_active?: boolean }).is_active !== false}
                  onCheckedChange={(v) => void patchOption(o.id, { is_active: v })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  aria-label={t("aop_delete")}
                  onClick={() => void removeOption(o.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Input
              placeholder={t("po_option_name")}
              value={optionDrafts[g.id]?.name ?? ""}
              onChange={(e) =>
                setOptionDrafts({
                  ...optionDrafts,
                  [g.id]: { name: e.target.value, delta: optionDrafts[g.id]?.delta ?? "0" },
                })
              }
              className="h-8 w-40"
            />
            <Input
              type="number"
              placeholder="+ETB"
              value={optionDrafts[g.id]?.delta ?? "0"}
              onChange={(e) =>
                setOptionDrafts({
                  ...optionDrafts,
                  [g.id]: { name: optionDrafts[g.id]?.name ?? "", delta: e.target.value },
                })
              }
              className="h-8 w-24"
            />
            <Button type="button" size="sm" variant="outline" onClick={() => void addOption(g.id)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("po_add_option")}
            </Button>
          </div>
        </div>
      ))}

      <form onSubmit={addGroup} className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">{t("po_group_name")}</Label>
          <Input
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            placeholder={t("po_group_placeholder")}
            className="h-8 w-40"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs">
          {t("po_required")}
          <Switch
            checked={newGroup.required}
            onCheckedChange={(v) => setNewGroup({ ...newGroup, required: v })}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          {t("po_multi")}
          <Switch
            checked={newGroup.multi}
            onCheckedChange={(v) => setNewGroup({ ...newGroup, multi: v })}
          />
        </label>
        <Button type="submit" size="sm">
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t("po_add_group")}
        </Button>
      </form>
    </div>
  );
}
