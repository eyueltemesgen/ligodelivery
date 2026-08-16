import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bike, Clock, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/rider/join")({
  head: () => ({
    meta: [
      { title: "Become a Ligo rider in Bishoftu" },
      { name: "description", content: "Earn with Ligo — deliver food and groceries around Bishoftu on your own schedule." },
      { property: "og:title", content: "Become a Ligo rider" },
      { property: "og:description", content: "Deliver with Ligo in Bishoftu and earn on your schedule." },
    ],
  }),
  component: RiderJoin,
});

function RiderJoin() {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState("motorbike");
  const [nationalId, setNationalId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("riders")
      .upsert({ id: user.id, vehicle_type: vehicle, national_id: nationalId, notes }, { onConflict: "id" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted — an admin will review it shortly.");
  };

  return (
    <div className="container-ligo py-10">
      <div className="rounded-2xl bg-primary-soft p-8">
        <h1 className="font-display text-3xl font-extrabold">Become a Ligo rider</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Deliver across Bishoftu, keep your own hours and get paid for every completed order.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Wallet, t: "Weekly payouts", d: "Reliable earnings per delivery" },
            { icon: Clock, t: "Flexible hours", d: "Go online whenever you want" },
            { icon: Bike, t: "Any vehicle", d: "Motorbike, bicycle or on foot" },
          ].map((b) => (
            <div key={b.t} className="rounded-xl bg-card p-4 shadow-card">
              <b.icon className="h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold">{b.t}</p>
              <p className="text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 max-w-lg">
        {!user ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center shadow-card">
            <p className="font-semibold">Create a rider account to apply</p>
            <Button asChild className="mt-4">
              <Link to="/auth" search={{ mode: "register", role: "rider" }}>Register as rider</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={apply} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-bold">Rider application</h2>
            <div className="space-y-1.5">
              <Label htmlFor="v">Vehicle type</Label>
              <Input id="v" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="motorbike / bicycle / foot" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nid">National ID number</Label>
              <Input id="nid" value={nationalId} onChange={(e) => setNationalId(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt">Anything else?</Label>
              <Textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit application"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
