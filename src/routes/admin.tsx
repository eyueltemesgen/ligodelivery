import { translations } from "@/lib/i18n";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminGate } from "@/components/auth/guards";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: translations.en.admin_meta_title },
      { name: "description", content: translations.en.admin_meta_desc },
      { property: "og:title", content: translations.en.admin_meta_title },
      { property: "og:description", content: translations.en.admin_meta_desc },
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
