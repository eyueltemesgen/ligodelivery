import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — Ligo Delivery" },
      {
        name: "description",
        content: "Manage your Ligo profile, phone number and delivery details.",
      },
      { property: "og:title", content: "My account — Ligo Delivery" },
      { property: "og:description", content: "Manage your Ligo Delivery profile." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, profile, refresh, loading, isAdmin, isRider, isMerchant } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  if (loading) return <div className="container-ligo py-16 text-muted-foreground">Loading…</div>;
  if (!user)
    return (
      <div className="container-ligo py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sign in to view your account</h1>
        <Button asChild className="mt-6">
          <Link to="/auth" search={{ mode: "login", role: "customer" }}>
            Sign in
          </Link>
        </Button>
      </div>
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refresh();
    toast.success("Profile updated");
  };

  return (
    <div className="container-ligo max-w-2xl py-10">
      <h1 className="font-display text-3xl font-extrabold">My account</h1>
      <form
        onSubmit={save}
        className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <div className="space-y-1.5">
          <Label htmlFor="fn">Full name</Label>
          <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ph">Phone</Label>
          <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user.email ?? ""} disabled />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/orders">My orders</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/notifications">Notifications</Link>
        </Button>
        {isRider && (
          <Button asChild variant="outline">
            <Link to="/rider">Rider portal</Link>
          </Button>
        )}
        {isMerchant && (
          <Button asChild variant="outline">
            <Link to="/merchant">Merchant portal</Link>
          </Button>
        )}
        {isAdmin && (
          <Button asChild variant="outline">
            <Link to="/admin">Admin dashboard</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
