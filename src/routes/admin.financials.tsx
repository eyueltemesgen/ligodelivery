import { translations } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { FinancialsPanel, PayoutsAdmin } from "@/routes/admin.ops";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/admin/financials")({
  head: () => ({
    meta: [
      { title: translations.en.fin_meta_title },
      { name: "description", content: translations.en.fin_meta_desc },
      { property: "og:title", content: translations.en.fin_meta_og_title },
      { property: "og:description", content: translations.en.fin_meta_og_desc },
    ],
  }),
  component: FinancialsPage,
});

function FinancialsPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-2xl font-extrabold">{t("shell_financials")}</h1>
        <FinancialsPanel />
      </section>
      <section>
        <h2 className="font-display text-lg font-bold">{t("fin_rider_cashout")}</h2>
        <PayoutsAdmin />
      </section>
    </div>
  );
}
