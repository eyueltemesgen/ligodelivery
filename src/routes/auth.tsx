import { createFileRoute, Navigate } from "@tanstack/react-router";

// Backward-compatible shim: /auth?mode=login|register -> /login | /register
export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: s["mode"] === "register" ? ("register" as const) : ("login" as const),
    role: (["customer", "merchant", "rider"].includes(String(s["role"]))
      ? s["role"]
      : "customer") as "customer" | "merchant" | "rider",
  }),
  component: AuthRedirect,
});

function AuthRedirect() {
  const { mode, role } = Route.useSearch();
  if (mode === "register") return <Navigate to="/register" search={{ role }} replace />;
  return <Navigate to="/login" replace />;
}
