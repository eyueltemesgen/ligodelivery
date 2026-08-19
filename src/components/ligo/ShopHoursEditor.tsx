import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DAY_NAMES, type ShopHoursRow } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type DayDraft = { opens_at: string; closes_at: string; is_closed: boolean };

const buildDraft = (
  rows: ShopHoursRow[],
  fallbackOpen: string,
  fallbackClose: string,
): DayDraft[] =>
  DAY_NAMES.map((_, day) => {
    const row = rows.find((r) => r.day_of_week === day);
    return {
      opens_at: (row?.opens_at ?? fallbackOpen).slice(0, 5),
      closes_at: (row?.closes_at ?? fallbackClose).slice(0, 5),
      is_closed: row?.is_closed ?? false,
    };
  });

export function ShopHoursEditor({
  shopId,
  fallbackOpen = "08:00",
  fallbackClose = "22:00",
}: {
  shopId: string;
  fallbackOpen?: string;
  fallbackClose?: string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DayDraft[] | null>(null);
  const [savingDay, setSavingDay] = useState<number | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["shop-hours", shopId],
    queryFn: async () =>
      ((await supabase.from("shop_hours").select("*").eq("shop_id", shopId)).data ??
        []) as ShopHoursRow[],
  });

  useEffect(() => {
    setDraft(buildDraft(rows, fallbackOpen, fallbackClose));
  }, [rows, fallbackOpen, fallbackClose]);

  if (!draft) return null;

  const setDay = (day: number, patch: Partial<DayDraft>) =>
    setDraft((cur) => (cur ? cur.map((d, i) => (i === day ? { ...d, ...patch } : d)) : cur));

  const saveDay = async (day: number) => {
    const d = draft[day];
    if (!d) return;
    setSavingDay(day);
    const { error } = await supabase.from("shop_hours").upsert(
      {
        shop_id: shopId,
        day_of_week: day,
        opens_at: d.opens_at,
        closes_at: d.closes_at,
        is_closed: d.is_closed,
      },
      { onConflict: "shop_id,day_of_week" },
    );
    setSavingDay(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["shop-hours", shopId] });
    toast.success(`${DAY_NAMES[day]} hours saved`);
  };

  return (
    <div className="space-y-2">
      {draft.map((d, day) => (
        <div
          key={day}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 text-sm"
        >
          <span className="w-24 font-medium">{DAY_NAMES[day]}</span>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Closed
            <Switch checked={d.is_closed} onCheckedChange={(v) => setDay(day, { is_closed: v })} />
          </label>
          {!d.is_closed && (
            <>
              <Input
                type="time"
                className="h-8 w-28"
                value={d.opens_at}
                onChange={(e) => setDay(day, { opens_at: e.target.value })}
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="time"
                className="h-8 w-28"
                value={d.closes_at}
                onChange={(e) => setDay(day, { closes_at: e.target.value })}
              />
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={savingDay === day}
            onClick={() => void saveDay(day)}
          >
            {savingDay === day ? "Saving…" : "Save"}
          </Button>
        </div>
      ))}
    </div>
  );
}
