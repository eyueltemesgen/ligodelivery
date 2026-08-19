import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, UserCheck } from "lucide-react";
import { AdminGate } from "@/components/auth/guards";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Ligo Delivery" },
      { name: "description", content: "Operations console for Ligo Delivery." },
      { property: "og:title", content: "Admin — Ligo Delivery" },
      { property: "og:description", content: "Operations console for Ligo Delivery." },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/riders", label: "Rider approvals", icon: UserCheck, exact: false },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AdminGate>
      <div className="container-ligo py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-extrabold">Admin dashboard</h1>
          <nav className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-colors ${
                    active ? "bg-background text-foreground shadow" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </AdminGate>
  );
}
