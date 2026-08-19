import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/orders";
import { useMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
      { title: "Rider approvals — Ligo Delivery" },
      {
        name: "description",
        content: "Review rider applications, verify documents and approve riders.",
      },
      { property: "og:title", content: "Rider approvals — Ligo Delivery" },
      { property: "og:description", content: "Rider verification queue for Ligo admins." },
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
  created_at: string;
  profile?: { full_name: string; phone: string | null; email: string | null } | undefined;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending_verification: {
    label: "Pending review",
    className: "bg-warning/20 text-warning-foreground",
  },
  approved: { label: "Approved", className: "bg-primary-soft text-accent-foreground" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
};

function RiderApprovalQueue() {
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<RiderRow | null>(null);

  const { data: riders = [] } = useQuery({
    queryKey: ["admin-riders-full"],
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("*");
      const ids = (data ?? []).map((r) => r.id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id,full_name,phone,email").in("id", ids)
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
      .channel("admin-riders-rt")
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
      "Rider approved",
      "You're verified! Go online to start receiving orders.",
      "rider",
    );
    void qc.invalidateQueries({ queryKey: ["admin-riders-full"] });
    toast.success("Rider approved — they can now go online");
  };

  const pendingCount = riders.filter(
    (r) => r.verification_status === "pending_verification",
  ).length;

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {pendingCount} application{pendingCount === 1 ? "" : "s"} awaiting review
      </p>
      <div className="mt-4 space-y-3">
        {riders.length === 0 && (
          <p className="text-sm text-muted-foreground">No rider applications yet.</p>
        )}
        {riders.map((r) => {
          const badge =
            STATUS_BADGE[r.verification_status] ?? STATUS_BADGE["pending_verification"]!;
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.profile?.full_name || "Rider"}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.profile?.phone} · {r.profile?.email} · {formatDate(r.created_at)}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              </div>

              <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Vehicle:</span> {r.vehicle_type} ·{" "}
                  <span className="text-muted-foreground">National ID:</span> {r.national_id || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Payout:</span>{" "}
                  {r.payout_method === "telebirr" ? "Telebirr" : "Bank account"} ·{" "}
                  {r.payout_account || "—"} ({r.payout_account_name || "—"})
                </p>
              </div>
              {r.notes && <p className="mt-1 text-sm text-muted-foreground">Notes: {r.notes}</p>}

              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <DocLink path={r.id_document_url} label="National ID document" />
                <DocLink path={r.license_document_url} label="Driver's license" />
              </div>

              {r.review_notes && (
                <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                  Review feedback: {r.review_notes}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {!r.is_approved && (
                  <Button size="sm" onClick={() => void approve(r)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve rider
                  </Button>
                )}
                {r.is_approved && (
                  <Button size="sm" variant="outline" onClick={() => setRejectTarget(r)}>
                    Suspend
                  </Button>
                )}
                {!r.is_approved && (
                  <Button size="sm" variant="outline" onClick={() => setRejectTarget(r)}>
                    <XCircle className="mr-2 h-4 w-4" /> Reject / request resubmission
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

function DocLink({ path, label }: { path: string | null; label: string }) {
  const url = useMediaUrl(path);
  if (!path) return <span className="text-muted-foreground">{label}: —</span>;
  if (!url) return <span className="text-muted-foreground">{label}: loading…</span>;
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

  useEffect(() => {
    setNotes(rider?.review_notes ?? "");
  }, [rider]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rider) return;
    if (!notes.trim()) {
      toast.error("Add feedback notes so the rider knows what to fix");
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
      "Rider application needs attention",
      `Please review and resubmit: ${notes.trim()}`,
      "rider",
    );
    toast.success("Feedback sent to the rider");
    onDone();
  };

  return (
    <Dialog open={!!rider} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject / request resubmission</DialogTitle>
          <DialogDescription>
            Tell {rider?.profile?.full_name || "the rider"} what to fix. They'll see this message on
            their pending-approval screen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Feedback notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. License photo is blurry — please upload a clearer picture."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy ? "Sending…" : "Send feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
