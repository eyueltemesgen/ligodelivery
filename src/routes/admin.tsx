import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminGate } from "@/components/auth/guards";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — የኔ Go" },
      { name: "description", content: "Operations control center for የኔ Go." },
      { property: "og:title", content: "Admin — የኔ Go" },
      { property: "og:description", content: "Operations control center for የኔ Go." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminGate>
      <AdminShell>
        <Outlet />
      </AdminShell>
    </AdminGate>
  );
}
