import { ShieldCheck } from "lucide-react";

export const TIER_META: Record<string, { label: string; className: string }> = {
  standard: { label: "Standard", className: "bg-secondary text-secondary-foreground" },
  silver: { label: "Silver tier", className: "bg-slate-200 text-slate-800" },
  gold: { label: "Gold tier", className: "bg-warning/25 text-warning-foreground" },
};

/** Commission tier pill shared between the rider portal and admin views. */
export function TierBadge({ tier }: { tier: string | null | undefined }) {
  const meta = TIER_META[tier ?? "standard"] ?? TIER_META["standard"]!;
  return (
    <span
      className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      <ShieldCheck className="h-3 w-3" /> {meta.label}
    </span>
  );
}
