import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { portalPathFor } from "@/components/auth/guards";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    error: typeof s["error"] === "string" ? (s["error"] as string) : undefined,
    error_description:
      typeof s["error_description"] === "string" ? (s["error_description"] as string) : undefined,
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const { error, error_description } = Route.useSearch();

  // supabase-js exchanges the OAuth code automatically (detectSessionInUrl);
  // once the session lands, send the user to their role home.
  useEffect(() => {
    if (!loading && user) {
      void navigate({ to: portalPathFor(roles), replace: true });
    }
  }, [user, roles, loading, navigate]);

  if (error) {
    return (
      <div className="container-ligo py-16 text-center">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 shadow-card">
          <h1 className="font-display text-2xl font-extrabold">Sign-in failed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error_description ?? "Google sign-in was cancelled or could not be completed."}
          </p>
          <div className="mt-6">
            <Button asChild variant="outline">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-ligo py-16 text-center text-muted-foreground">
      Completing sign-in…
    </div>
  );
}
