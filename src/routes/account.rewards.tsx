import { translations } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Check, Coins, Copy, Gift, Share2, Sparkles, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchLoyaltyLedger,
  fetchLoyaltySummary,
  LEDGER_LABEL_KEY,
  LOYALTY_FALLBACK,
  pointsForSubtotal,
  referralLink,
  type LoyaltyLedgerEntry,
  type LoyaltySummary,
} from "@/lib/loyalty";
import { ETB } from "@/lib/format";
import { AccountHeader } from "@/components/account/AccountShell";
import { AccountState, ListSkeleton, SignInRequired } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import type { TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/account/rewards")({
  head: () => ({
    meta: [
      { title: translations.en.rw_meta_title },
      { name: "description", content: translations.en.rw_meta_desc },
      { property: "og:title", content: translations.en.rw_meta_title },
      { property: "og:description", content: translations.en.rw_meta_desc },
    ],
  }),
  component: RewardsPage,
});

const summaryQuery = {
  queryKey: ["loyalty", "summary"] as const,
  queryFn: fetchLoyaltySummary,
  staleTime: 30_000,
};

const ledgerQuery = {
  queryKey: ["loyalty", "ledger"] as const,
  queryFn: () => fetchLoyaltyLedger(50),
  staleTime: 30_000,
};

function RewardsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const {
    data: summary = LOYALTY_FALLBACK,
    isLoading,
    isError,
    refetch,
  } = useQuery({ ...summaryQuery, enabled: !!user });
  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    ...ledgerQuery,
    enabled: !!user,
  });

  if (!user) return <SignInRequired title={t("rw_title")} />;

  return (
    <>
      <AccountHeader title={t("rw_title")} description={t("rw_subtitle")} />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <AccountState
          icon={Coins}
          title={t("rw_unavailable_title")}
          description={t("rw_unavailable_desc")}
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              {t("acct_retry")}
            </Button>
          }
        />
      ) : !summary.enabled ? (
        <AccountState
          icon={Sparkles}
          title={t("rw_off_title")}
          description={t("rw_off_desc")}
          action={
            <Button asChild>
              <Link to="/shops">{t("cart_browse")}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <PointsCard summary={summary} />
          <ReferralCard summary={summary} />
          <HowItWorks summary={summary} />
          <LedgerCard entries={ledger} loading={ledgerLoading} />
        </>
      )}
    </>
  );
}

function PointsCard({ summary }: { summary: LoyaltySummary }) {
  const { t } = useLanguage();
  const value = Math.round(summary.points * summary.pointValueEtb);
  const canRedeem = summary.points >= summary.minRedeemPoints;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
            {t("rw_balance_label")}
          </p>
          <p className="mt-1 font-display text-4xl font-extrabold tabular-nums">
            {summary.points.toLocaleString("en-ET")}
          </p>
          <p className="mt-1 text-sm opacity-90">{t("rw_points_worth", { amount: ETB(value) })}</p>
        </div>
        <div className="rounded-lg bg-white/15 px-3 py-2 text-sm backdrop-blur-sm">
          <p className="font-semibold">
            {t("rw_earn_rate", { points: summary.earnPointsPer100Etb })}
          </p>
          <p className="mt-0.5 text-xs opacity-90">
            {t("rw_min_redeem", { points: summary.minRedeemPoints })}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90">
          <Link to="/shops">{t("rw_start_order")}</Link>
        </Button>
        {!canRedeem && (
          <p className="text-xs opacity-90">
            {t("rw_need_more", {
              points: Math.max(summary.minRedeemPoints - summary.points, 0),
            })}
          </p>
        )}
      </div>
    </section>
  );
}

function ReferralCard({ summary }: { summary: LoyaltySummary }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const code = summary.referralCode;
  const link = referralLink(code);

  const copy = async (value: string, which: "code" | "link") => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(which);
      toast.success(t(which === "code" ? "rw_code_copied" : "rw_link_copied"));
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error(t("rw_copy_failed"));
    }
  };

  const share = async () => {
    if (!link) return;
    const shareData = {
      title: t("rw_share_title"),
      text: t("rw_share_text", { points: summary.refereePoints }),
      url: link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Customer dismissed the sheet; fall through to copying the link.
      }
    }
    await copy(link, "link");
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-primary" />
        <h2 className="font-display text-lg font-bold">{t("rw_referral_title")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("rw_referral_desc", {
          referrer: summary.referrerPoints,
          referee: summary.refereePoints,
        })}
      </p>

      {code ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border border-dashed border-primary/50 bg-primary-soft px-4 py-3">
              <span className="truncate font-mono text-xl font-bold tracking-[0.2em] text-primary">
                {code}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => void copy(code, "code")}
                aria-label={t("rw_copy_code")}
              >
                {copied === "code" ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button type="button" onClick={() => void share()} className="shrink-0">
              <Share2 className="mr-2 h-4 w-4" />
              {t("rw_share")}
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {summary.invitedCount > 0
                ? t("rw_invited_count", { count: summary.invitedCount })
                : t("rw_invited_none")}
            </p>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{t("rw_code_pending")}</p>
      )}
    </section>
  );
}

function HowItWorks({ summary }: { summary: LoyaltySummary }) {
  const { t } = useLanguage();
  const sample = pointsForSubtotal(500, summary.earnPointsPer100Etb);

  const steps: { icon: typeof Coins; title: string; body: string }[] = [
    {
      icon: Coins,
      title: t("rw_step1_title"),
      body: t("rw_step1_body", { points: summary.earnPointsPer100Etb }),
    },
    {
      icon: Users,
      title: t("rw_step2_title"),
      body: t("rw_step2_body", { points: summary.refereePoints }),
    },
    {
      icon: TrendingUp,
      title: t("rw_step3_title"),
      body: t("rw_step3_body", { amount: ETB(summary.pointValueEtb) }),
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg font-bold">{t("rw_how_title")}</h2>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <s.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {i + 1}. {s.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        {t("rw_example", {
          spend: ETB(500),
          points: sample,
          amount: ETB(sample * summary.pointValueEtb),
        })}
      </p>
    </section>
  );
}

function LedgerCard({ entries, loading }: { entries: LoyaltyLedgerEntry[]; loading: boolean }) {
  const { t } = useLanguage();

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg font-bold">{t("rw_activity_title")}</h2>
      {loading ? (
        <div className="mt-4">
          <ListSkeleton rows={2} />
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("rw_activity_empty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {entries.map((e) => {
            const labelKey = (LEDGER_LABEL_KEY[e.kind] ?? "rw_kind_earn") as TranslationKey;
            const positive = e.points > 0;
            return (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t(labelKey)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={
                    positive
                      ? "shrink-0 text-sm font-bold tabular-nums text-primary"
                      : "shrink-0 text-sm font-bold tabular-nums text-muted-foreground"
                  }
                >
                  {positive ? "+" : ""}
                  {e.points.toLocaleString("en-ET")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
