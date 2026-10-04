import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const TIER_META: Record<string, { labelKey: string; className: string }> = {
  standard: { labelKey: "tier.standard", className: "bg-secondary text-secondary-foreground" },
  silver: { labelKey: "tier.silver", className: "bg-slate-200 text-slate-800" },
  gold: { labelKey: "tier.gold", className: "bg-warning/25 text-warning-foreground" },
};

/** Commission tier pill shared between the rider portal and admin views. */
export function TierBadge({ tier }: { tier: string | null | undefined }) {
  const { t } = useI18n();
  const meta = TIER_META[tier ?? "standard"] ?? TIER_META["standard"]!;
  return (
    <span
      className={`flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      <ShieldCheck className="h-3 w-3" /> {t(meta.labelKey)}
    </span>
  );
}
