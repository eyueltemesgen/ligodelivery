import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/auth/guards";
import { ReportsAdmin } from "@/components/admin/ReportsAdmin";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — የኔ Go Admin" },
      {
        name: "description",
        content: "Business analytics, sales, payment and performance reports for የኔ Go.",
      },
      { property: "og:title", content: "Reports — የኔ Go Admin" },
      { property: "og:description", content: "Business reports and exports for የኔ Go." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportsPage,
});

// The /admin layout also guards this route; the gate here keeps the report
// surface itself behind admin auth even if the route is mounted in isolation.
function ReportsPage() {
  return (
    <AdminGate>
      <ReportsAdmin />
    </AdminGate>
  );
}
