import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, FileText, NotebookText, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/orders";
import { useI18n } from "@/lib/i18n";
import { useMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/format";
import { RiderDossier } from "@/components/admin/RiderDossier";
import { IdentityAvatar } from "@/components/ligo/IdentityAvatar";
import { TierBadge } from "@/components/ligo/TierBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/riders")({
  head: () => ({
    meta: [
      { title: "Rider approvals — የኔ Go" },
      {
        name: "description",
        content: "Review rider applications, verify documents and approve riders.",
      },
      { property: "og:title", content: "Rider approvals — የኔ Go" },
      { property: "og:description", content: "Rider verification queue for የኔ Go admins." },
    ],
  }),
  component: RiderApprovalQueue,
});

type RiderRow = {
  id: string;
  is_approved: boolean;
  is_online: boolean;
  vehicle_type: string;
  national_id: string | null;
  notes: string | null;
  id_document_url: string | null;
  license_document_url: string | null;
  payout_method: string;
  payout_account: string | null;
  payout_account_name: string | null;
  verification_status: string;
  review_notes: string | null;
  commission_tier: string;
  created_at: string;
  profile?:
    | { full_name: string; phone: string | null; email: string | null; avatar_url: string | null }
    | undefined;
};

const COMMISSION_TIERS = [
  { key: "standard", labelKey: "ariders.tierStandard" },
  { key: "silver", labelKey: "ariders.tierSilver" },
  { key: "gold", labelKey: "ariders.tierGold" },
];

const STATUS_BADGE: Record<string, { labelKey: string; className: string }> = {
  pending_verification: {
    labelKey: "ariders.statusPending",
    className: "bg-warning/20 text-warning-foreground",
  },
  approved: { labelKey: "ariders.statusApproved", className: "bg-primary-soft text-accent-foreground" },
  rejected: { labelKey: "ariders.statusRejected", className: "bg-destructive/10 text-destructive" },
};

function RiderApprovalQueue() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [rejectTarget, setRejectTarget] = useState<RiderRow | null>(null);
  const [dossierTarget, setDossierTarget] = useState<RiderRow | null>(null);

  const { data: riders = [] } = useQuery({
    queryKey: ["admin-riders-full"],
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("*");
      const ids = (data ?? []).map((r) => r.id);
      const { data: profiles } = ids.length
        ? await supabase
            .from("profiles")
            .select("id,full_name,phone,email,avatar_url")
            .in("id", ids)
        : { data: [] };
      return ((data ?? []) as RiderRow[])
        .map((r) => ({ ...r, profile: profiles?.find((p) => p.id === r.id) }))
        .sort((a, b) => {
          const rank = (r: RiderRow) => (r.verification_status === "pending_verification" ? 0 : 1);
          return rank(a) - rank(b) || b.created_at.localeCompare(a.created_at);
        });
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-riders-rt-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "riders" }, () => {
        void qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const approve = async (r: RiderRow) => {
    const { error } = await supabase
      .from("riders")
      .update({ is_approved: true, verification_status: "approved", review_notes: null })
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notify(
      r.id,
      t("ariders.approvedNotifyTitle"),
      t("ariders.approvedNotifyBody"),
      "rider",
    );
    void qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
    toast.success(t("ariders.approvedToast"));
  };

  const setCommissionTier = async (r: RiderRow, tier: string) => {
    const { error } = await supabase
      .from("riders")
      .update({ commission_tier: tier })
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
    const tierKey = COMMISSION_TIERS.find((c) => c.key === tier)?.labelKey;
    toast.success(t("ariders.tierSetToast", { tier: tierKey ? t(tierKey) : tier }));
  };

  const pendingCount = riders.filter(
    (r) => r.verification_status === "pending_verification",
  ).length;

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {pendingCount === 1
          ? t("ariders.awaitingReview", { count: pendingCount })
          : t("ariders.awaitingReviewPlural", { count: pendingCount })}
      </p>
      <div className="mt-4 space-y-3">
        {riders.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("ariders.none")}</p>
        )}
        {riders.map((r) => {
          const badge =
            STATUS_BADGE[r.verification_status] ?? STATUS_BADGE["pending_verification"]!;
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <IdentityAvatar
                      path={r.profile?.avatar_url}
                      name={r.profile?.full_name}
                      className="h-11 w-11 text-base"
                    />
                    <span
                      aria-label={r.is_online ? t("ariders.online") : t("ariders.offline")}
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${
                        r.is_online ? "bg-primary" : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{r.profile?.full_name || t("rider.defaultName")}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.profile?.phone ?? "—"} · {r.profile?.email ?? "—"} ·{" "}
                      {t("ariders.joined", { date: formatDate(r.created_at) })}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          r.is_online ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                      {r.is_online ? t("ariders.onlineNow") : t("ariders.offline")} ·{" "}
                      <span className="capitalize">{r.vehicle_type}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}
                  >
                    {t(badge.labelKey)}
                  </span>
                  <DocTag ok={!!r.id_document_url} label={t("ariders.docId")} />
                  <DocTag ok={!!r.license_document_url} label={t("ariders.docLicense")} />
                  <TierBadge tier={r.commission_tier} />
                </div>
              </div>

              <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">{t("ariders.vehicle")}:</span>{" "}
                  <span className="capitalize">{r.vehicle_type}</span> ·{" "}
                  <span className="text-muted-foreground">{t("ariders.nationalId")}:</span>{" "}
                  {r.national_id || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("ariders.payout")}:</span>{" "}
                  {r.payout_method === "telebirr" ? t("payMethod.telebirr") : t("ariders.bankAccount")}{" "}
                  · {r.payout_account || "—"} ({r.payout_account_name || "—"})
                </p>
              </div>
              {r.notes && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("ariders.notes")}: {r.notes}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <DocLink path={r.id_document_url} label={t("ariders.docNationalId")} />
                <DocLink path={r.license_document_url} label={t("ariders.docDriversLicense")} />
              </div>

              {r.review_notes && (
                <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  {t("ariders.reviewFeedback")}: {r.review_notes}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setDossierTarget(r)}>
                  <NotebookText className="mr-2 h-4 w-4" /> {t("ariders.viewDossier")}
                </Button>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("ariders.commissionTier")}</span>
                  <Select
                    value={r.commission_tier}
                    onValueChange={(tier) => void setCommissionTier(r, tier)}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMISSION_TIERS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          {t(c.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!r.is_approved && (
                  <Button size="sm" onClick={() => void approve(r)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> {t("ariders.approve")}
                  </Button>
                )}
                {r.is_approved && (
                  <Button size="sm" variant="outline" onClick={() => setRejectTarget(r)}>
                    {t("ariders.suspend")}
                  </Button>
                )}
                {!r.is_approved && (
                  <Button size="sm" variant="outline" onClick={() => setRejectTarget(r)}>
                    <XCircle className="mr-2 h-4 w-4" /> {t("ariders.reject")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <RiderDossier
        riderId={dossierTarget?.id ?? null}
        riderName={dossierTarget?.profile?.full_name || t("rider.defaultName")}
        identity={{
          avatarUrl: dossierTarget?.profile?.avatar_url,
          vehicleType: dossierTarget?.vehicle_type,
          isOnline: dossierTarget?.is_online,
          verificationStatus: dossierTarget?.verification_status,
          commissionTier: dossierTarget?.commission_tier,
        }}
        open={!!dossierTarget}
        onOpenChange={(open) => !open && setDossierTarget(null)}
      />
      <RejectDialog
        rider={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onDone={() => {
          setRejectTarget(null);
          void qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
        }}
      />
    </div>
  );
}

function DocTag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        ok ? "bg-primary-soft text-accent-foreground" : "bg-warning/20 text-warning-foreground"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function DocLink({ path, label }: { path: string | null; label: string }) {
  const url = useMediaUrl(path);
  const { t } = useI18n();
  if (!path) return <span className="text-muted-foreground">{label}: —</span>;
  if (!url) return <span className="text-muted-foreground">{label}: {t("ariders.loading")}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1 font-medium text-primary underline"
    >
      <FileText className="h-4 w-4" /> {label}
    </a>
  );
}

function RejectDialog({
  rider,
  onClose,
  onDone,
}: {
  rider: RiderRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setNotes(rider?.review_notes ?? "");
  }, [rider]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rider) return;
    if (!notes.trim()) {
      toast.error(t("ariders.feedbackRequired"));
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("riders")
      .update({ is_approved: false, verification_status: "rejected", review_notes: notes.trim() })
      .eq("id", rider.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await notify(
      rider.id,
      t("ariders.notifyAttentionTitle"),
      t("ariders.notifyAttentionBody", { notes: notes.trim() }),
      "rider",
    );
    toast.success(t("ariders.feedbackSent"));
    onDone();
  };

  return (
    <Dialog open={!!rider} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ariders.reject")}</DialogTitle>
          <DialogDescription>
            {t("ariders.rejectDesc", {
              name: rider?.profile?.full_name || t("rider.defaultName"),
            })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("ariders.feedbackNotes")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("ariders.feedbackPlaceholder")}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy ? t("ariders.sending") : t("ariders.sendFeedback")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
