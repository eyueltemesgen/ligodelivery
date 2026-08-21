import { Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, ShieldAlert, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

function Loading() {
  return <div className="container-ligo py-16 text-muted-foreground">Loading…</div>;
}

function Message({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="container-ligo py-16 text-center">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
        <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-extrabold">{title}</h1>
        {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

/** Requires any authenticated user; everyone else is sent to the customer sign-in. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

/** /admin/* — admin role in user_roles only. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/admin/login" />;
  if (!isAdmin)
    return (
      <Message
        icon={ShieldAlert}
        title="Admins only"
        body="This area is restricted to Ligo operations staff."
        action={
          <Button asChild variant="outline">
            <Link to="/">Back to the app</Link>
          </Button>
        }
      />
    );
  return <>{children}</>;
}

/** /rider/* — rider role; approved riders see the portal, others see their verification state. */
export function RiderGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isRider } = useAuth();
  const { data: rider, isLoading } = useQuery({
    queryKey: ["rider-me", user?.id],
    enabled: !!user && isRider,
    queryFn: async () => {
      const { data } = await supabase.from("riders").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  if (loading || (isRider && isLoading)) return <Loading />;
  if (!user) return <Navigate to="/rider/login" />;
  if (!isRider)
    return (
      <Message
        icon={ShieldAlert}
        title="You're not registered as a rider"
        action={
          <Button asChild>
            <Link to="/register" search={{ role: "rider" }}>
              Apply to become a rider
            </Link>
          </Button>
        }
      />
    );
  if (!rider?.is_approved) {
    const rejected = rider?.verification_status === "rejected";
    return (
      <Message
        icon={Clock}
        title={rejected ? "Application needs attention" : "Approval pending"}
        body={
          rejected
            ? `Our team reviewed your application: ${rider?.review_notes ?? "please update your details and resubmit."}`
            : "Your rider account is under review. You'll be able to go online as soon as an admin approves your documents."
        }
        action={
          rejected ? (
            <Button asChild>
              <Link to="/rider/join">Update & resubmit application</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }
  return <>{children}</>;
}

/** /merchant/* — merchant role with an admin-verified (active) shop. */
export function MerchantGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isMerchant, isAdmin } = useAuth();
  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["merchant-gate-shops", user?.id],
    enabled: !!user && isMerchant && !isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("shops").select("id,is_active").eq("owner_id", user!.id);
      return data ?? [];
    },
  });

  if (loading || isLoading) return <Loading />;
  if (!user) return <Navigate to="/merchant/login" />;
  if (!isMerchant && !isAdmin)
    return (
      <Message
        icon={ShieldAlert}
        title="Merchants only"
        body="Shop accounts are set up by the Ligo team — contact us to onboard your store."
        action={
          <Button asChild variant="outline">
            <Link to="/">Back to the app</Link>
          </Button>
        }
      />
    );
  if (!isAdmin) {
    if (shops.length === 0)
      return (
        <Message
          icon={Store}
          title="No shop linked to your account"
          body="The Ligo team will link your shop after onboarding. Contact us if you think this is a mistake."
        />
      );
    if (!shops.some((s) => s.is_active))
      return (
        <Message
          icon={Clock}
          title="Shop verification pending"
          body="Your shop is being reviewed by the Ligo team. You'll be able to manage it here as soon as it's verified."
        />
      );
  }
  return <>{children}</>;
}

/** Where a user lands after login, based on their verified role. */
export function portalPathFor(roles: Role[]): "/admin" | "/rider" | "/merchant" | "/" {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("rider")) return "/rider";
  if (roles.includes("merchant")) return "/merchant";
  return "/";
}
