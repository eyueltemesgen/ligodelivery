import { createFileRoute } from "@tanstack/react-router";
import { FinancialsPanel, PayoutsAdmin } from "@/routes/admin.ops";

export const Route = createFileRoute("/admin/financials")({
  head: () => ({
    meta: [
      { title: "Financials & Earnings — የኔ Go Admin" },
      { name: "description", content: "የኔ Go revenue ledger, commissions and payout management." },
      { property: "og:title", content: "Financials & Earnings — የኔ Go Admin" },
      { property: "og:description", content: "የኔ Go financial ledger." },
    ],
  }),
  component: FinancialsPage,
});

function FinancialsPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-2xl font-extrabold">Financials &amp; Earnings</h1>
        <FinancialsPanel />
      </section>
      <section>
        <h2 className="font-display text-lg font-bold">Rider cashout requests</h2>
        <PayoutsAdmin />
      </section>
    </div>
  );
}
