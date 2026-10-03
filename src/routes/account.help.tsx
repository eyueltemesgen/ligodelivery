import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  CreditCard,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  Truck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ordersQuery } from "@/lib/account";
import { siteContentQuery } from "@/lib/content";
import { AccountHeader } from "@/components/account/AccountShell";
import { SectionHeading } from "@/components/account/States";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/account/help")({
  head: () => ({
    meta: [
      { title: "Help & support — የኔ Go" },
      { name: "description", content: "Get help with your የኔ Go orders, payments and deliveries." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => {
    const out: { order?: string } = {};
    if (typeof s["order"] === "string") out.order = s["order"];
    return out;
  },
  component: HelpPage,
});

const FAQ = [
  { q: "help.faq1Q", a: "help.faq1A" },
  { q: "help.faq2Q", a: "help.faq2A" },
  { q: "help.faq3Q", a: "help.faq3A" },
  { q: "help.faq4Q", a: "help.faq4A" },
  { q: "help.faq5Q", a: "help.faq5A" },
];

const TOPICS = [
  { id: "orders", label: "help.topicOrders", icon: Package },
  { id: "delivery", label: "help.topicDelivery", icon: Truck },
  { id: "payments", label: "help.topicPayments", icon: CreditCard },
  { id: "account", label: "help.topicAccount", icon: HelpCircle },
] as const;

function HelpPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { order } = Route.useSearch();
  const { data: orders = [] } = useQuery(ordersQuery(user?.id));
  const { data: c } = useQuery(siteContentQuery);

  const recentOrders = orders.slice(0, 5);
  const phone = c?.contact_phone ?? "";
  const email = c?.contact_email ?? "";

  return (
    <>
      <AccountHeader title={t("help.title")} description={t("help.subtitle")} />

      {order && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft/60 p-4 text-sm">
          <p className="font-semibold">{t("help.helpWithOrder", { order })}</p>
          <p className="mt-0.5 text-muted-foreground">{t("help.helpWithOrderBody")}</p>
        </div>
      )}

      {/* Contact */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("help.contactUs")} description={t("help.contactUsDesc")} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
          >
            <Phone className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("help.call")}</p>
              <p className="truncate text-xs text-muted-foreground">{phone || "—"}</p>
            </div>
          </a>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(order ? t("help.helpWithOrder", { order }) : "የኔ Go")}`}
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
          >
            <Mail className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("help.email")}</p>
              <p className="truncate text-xs text-muted-foreground">{email || "—"}</p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <MapPin className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("help.visit")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {c?.contact_address ?? "Bishoftu, Oromia"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Order-related support */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("help.orderSupport")} description={t("help.orderSupportDesc")} />
        {recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("help.noOrdersYet")}{" "}
            <Link to="/shops" className="font-medium text-primary">
              {t("help.startShopping")}
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recentOrders.map((o) => (
              <li key={o.id}>
                <Link
                  to="/account/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <span className="font-medium">{o.order_code}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {t("action.viewOrder")}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {TOPICS.map((topic) => (
            <a
              key={topic.id}
              href={`mailto:${email}?subject=${encodeURIComponent(`የኔ Go — ${t(topic.label)}${order ? ` (${order})` : ""}`)}`}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40"
            >
              <topic.icon className="h-4 w-4 text-primary" />
              {t(topic.label)}
              <MessageCircle className="ml-auto h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("help.faq")} />
        <Accordion type="single" collapsible className="mt-2">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm font-semibold">
                {t(f.q)}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{t(f.a)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("help.stillNeed")} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <a href={`tel:${phone.replace(/\s/g, "")}`}>
              <Phone className="mr-2 h-4 w-4" />
              {t("help.callSupport")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/account/orders">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("help.reviewOrders")}
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
