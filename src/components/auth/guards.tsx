import { Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, ShieldAlert, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

function Loading() {
  const { t } = useLanguage();
  return <div className="container-ligo py-16 text-muted-foreground">{t("common_loading")}</div>;
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
  const { t } = useLanguage();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/admin/login" />;
  if (!isAdmin)
    return (
      <Message
        icon={ShieldAlert}
        title={t("guard_admins_only")}
        body={t("guard_admins_only_body")}
        action={
          <Button asChild variant="outline">
            <Link to="/">{t("guard_back_to_app")}</Link>
          </Button>
        }
      />
    );
  return <>{children}</>;
}

/** /rider/* — rider role; approved riders see the portal, others see their verification state. */
export function RiderGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isRider } = useAuth();
  const { t } = useLanguage();
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
        title={t("guard_not_rider")}
        action={
          <Button asChild>
            <Link to="/register" search={{ role: "rider" }}>
              {t("guard_apply_rider")}
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
        title={rejected ? t("guard_application_attention") : t("guard_approval_pending")}
        body={
          rejected
            ? t("guard_review_notes", { notes: rider?.review_notes ?? t("guard_review_default") })
            : t("guard_under_review")
        }
        action={
          rejected ? (
            <Button asChild>
              <Link to="/rider/join">{t("guard_update_resubmit")}</Link>
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
  const { t } = useLanguage();
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
        title={t("guard_merchants_only")}
        body={t("guard_merchants_only_body")}
        action={
          <Button asChild variant="outline">
            <Link to="/">{t("guard_back_to_app")}</Link>
          </Button>
        }
      />
    );
  if (!isAdmin) {
    if (shops.length === 0)
      return <Message icon={Store} title={t("guard_no_shop")} body={t("guard_no_shop_body")} />;
    if (!shops.some((s) => s.is_active))
      return (
        <Message icon={Clock} title={t("guard_shop_pending")} body={t("guard_shop_pending_body")} />
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
