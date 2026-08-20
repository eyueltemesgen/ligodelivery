import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminGate } from "@/components/auth/guards";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — LIGO Delivery" },
      { name: "description", content: "Operations control center for LIGO Delivery." },
      { property: "og:title", content: "Admin — LIGO Delivery" },
      { property: "og:description", content: "Operations control center for LIGO Delivery." },
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
