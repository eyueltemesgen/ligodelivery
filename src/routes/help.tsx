import { translations } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Mail, MapPin, Phone } from "lucide-react";
import { siteContentQuery } from "@/lib/content";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

/**
 * Public help and FAQ.
 *
 * The account help page is behind `RequireAuth`, so a visitor who has not signed
 * up — the majority of first-time visitors — could not read the FAQ, the contact
 * details or the payment instructions without creating an account first. This
 * page is the same content without the gate, and the header and footer link here
 * so it is reachable and indexable. It reads only public data (`site_content`),
 * so it needs no session.
 */
export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: translations.en.help_title },
      { name: "description", content: translations.en.help_desc },
      { property: "og:title", content: translations.en.help_title },
      { property: "og:description", content: translations.en.help_desc },
    ],
  }),
  component: PublicHelpPage,
});

const FAQ = [
  { qKey: "help_faq_q1", aKey: "help_faq_a1" },
  { qKey: "help_faq_q2", aKey: "help_faq_a2" },
  { qKey: "help_faq_q3", aKey: "help_faq_a3" },
  { qKey: "help_faq_q4", aKey: "help_faq_a4" },
  { qKey: "help_faq_q5", aKey: "help_faq_a5" },
] as const;

const PAYMENTS = ["pay_telebirr", "pay_cbe", "pay_boa", "pay_cash"] as const;

function PublicHelpPage() {
  const { t } = useLanguage();
  const { data: c } = useQuery(siteContentQuery);

  const phone = c?.contact_phone ?? "";
  const email = c?.contact_email ?? "";

  return (
    <div className="container-ligo py-10">
      <h1 className="font-display text-3xl font-extrabold">{t("help_title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("help_desc")}</p>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">{t("help_contact")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("help_contact_desc")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
          >
            <Phone className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("help_call")}</p>
              <p className="truncate text-xs text-muted-foreground">{phone || "—"}</p>
            </div>
          </a>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent("የኔ Go support")}`}
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
          >
            <Mail className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("help_email")}</p>
              <p className="truncate text-xs text-muted-foreground">{email || "—"}</p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <MapPin className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("help_visit")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {c?.contact_address ?? t("help_visit_default")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <CreditCard className="h-5 w-5 text-primary" />
          {t("help_faq_q2")}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {PAYMENTS.map((key) => (
            <li
              key={key}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium"
            >
              {t(key)}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">{t("help_faq_a2")}</p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">{t("help_faq")}</h2>
        <Accordion type="single" collapsible className="mt-2">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.qKey} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm font-semibold">
                {t(f.qKey)}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {t(f.aKey)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">{t("help_still_need")}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <a href={`tel:${phone.replace(/\s/g, "")}`}>
              <Phone className="mr-2 h-4 w-4" />
              {t("help_call_support")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/shops">{t("cart_browse")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
