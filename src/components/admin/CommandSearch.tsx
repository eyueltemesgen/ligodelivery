import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bike, ClipboardList, Store, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Result = {
  group: "Orders" | "Riders" | "Customers" | "Shops";
  label: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
};

export function AdminCommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const pattern = `%${q}%`;
        const [orders, profiles, shops] = await Promise.all([
          supabase
            .from("orders")
            .select("id,order_code,customer_name,status,total")
            .or(`order_code.ilike.${pattern},customer_name.ilike.${pattern}`)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("profiles")
            .select("id,full_name,phone,email")
            .or(`full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
            .limit(8),
          supabase.from("shops").select("id,name,address").ilike("name", pattern).limit(5),
        ]);
        if (cancelled) return;
        const profileRows = profiles.data ?? [];
        const riderIds = profileRows.map((p) => p.id);
        const { data: riderRows } = riderIds.length
          ? await supabase.from("riders").select("id").in("id", riderIds)
          : { data: [] };
        const riderIdSet = new Set((riderRows ?? []).map((r) => r.id));
        if (cancelled) return;
        const out: Result[] = [];
        for (const o of orders.data ?? [])
          out.push({
            group: "Orders",
            label: o.order_code,
            detail: `${o.customer_name ?? "Customer"} · ${o.status} · ${o.total} ETB`,
            to: `/orders/${o.id}`,
          });
        for (const p of profileRows) {
          if (riderIdSet.has(p.id))
            out.push({
              group: "Riders",
              label: p.full_name || "Rider",
              detail: p.phone ?? p.email ?? "",
              to: "/admin/riders",
            });
          else
            out.push({
              group: "Customers",
              label: p.full_name || "Customer",
              detail: p.phone ?? p.email ?? "",
              to: "/admin/ops",
            });
        }
        for (const s of shops.data ?? [])
          out.push({
            group: "Shops",
            label: s.name,
            detail: s.address ?? "",
            to: `/shops/${s.id}`,
          });
        setResults(out);
      })();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const GROUP_ICONS = { Orders: ClipboardList, Riders: Bike, Customers: Users, Shops: Store };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search orders, riders, customers, shops…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {query.length < 2 ? "Type at least 2 characters…" : "No results found."}
        </CommandEmpty>
        {(["Orders", "Riders", "Customers", "Shops"] as const).map((group) => {
          const items = results.filter((r) => r.group === group);
          if (items.length === 0) return null;
          const Icon = GROUP_ICONS[group];
          return (
            <CommandGroup key={group} heading={group}>
              {items.map((r, i) => (
                <CommandItem
                  key={`${group}-${i}`}
                  value={`${group} ${r.label} ${r.detail}`}
                  onSelect={() => {
                    onOpenChange(false);
                    void navigate({ to: r.to as "/" });
                  }}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{r.label}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">{r.detail}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
