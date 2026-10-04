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
import { useLanguage } from "@/hooks/useLanguage";

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
  { qKey: "help_faq_q1", aKey: "help_faq_a1" },
  { qKey: "help_faq_q2", aKey: "help_faq_a2" },
  { qKey: "help_faq_q3", aKey: "help_faq_a3" },
  { qKey: "help_faq_q4", aKey: "help_faq_a4" },
  { qKey: "help_faq_q5", aKey: "help_faq_a5" },
] as const;

const TOPICS = [
  { id: "orders", labelKey: "help_topic_orders", icon: Package },
  { id: "delivery", labelKey: "help_topic_delivery", icon: Truck },
  { id: "payments", labelKey: "help_topic_payments", icon: CreditCard },
  { id: "account", labelKey: "help_topic_account", icon: HelpCircle },
] as const;

function HelpPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { order } = Route.useSearch();
  const { data: orders = [] } = useQuery(ordersQuery(user?.id));
  const { data: c } = useQuery(siteContentQuery);

  const recentOrders = orders.slice(0, 5);
  const phone = c?.contact_phone ?? "";
  const email = c?.contact_email ?? "";

  return (
    <>
      <AccountHeader title={t("help_title")} description={t("help_desc")} />

      {order && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft/60 p-4 text-sm">
          <p className="font-semibold">{t("help_order_banner", { order })}</p>
          <p className="mt-0.5 text-muted-foreground">{t("help_order_banner_desc")}</p>
        </div>
      )}

      {/* Contact */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("help_contact")} description={t("help_contact_desc")} />
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
            href={`mailto:${email}?subject=${encodeURIComponent(order ? `Support for order ${order}` : "የኔ Go support")}`}
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

      {/* Order-related support */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("help_order_support")} description={t("help_order_support_desc")} />
        {recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("help_no_orders")}{" "}
            <Link to="/shops" className="font-medium text-primary">
              {t("help_start_shopping")}
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
                    {t("oc_view_order")}
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
              href={`mailto:${email}?subject=${encodeURIComponent(`የኔ Go support — ${t(topic.labelKey)}${order ? ` (order ${order})` : ""}`)}`}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40"
            >
              <topic.icon className="h-4 w-4 text-primary" />
              {t(topic.labelKey)}
              <MessageCircle className="ml-auto h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("help_faq")} />
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

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("help_still_need")} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <a href={`tel:${phone.replace(/\s/g, "")}`}>
              <Phone className="mr-2 h-4 w-4" />
              {t("help_call_support")}
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/account/orders">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("help_review_orders")}
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
