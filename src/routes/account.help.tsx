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

export const Route = createFileRoute("/account/help")({
  head: () => ({
    meta: [
      { title: "Help & support — Ligo Delivery" },
      { name: "description", content: "Get help with your Ligo orders, payments and deliveries." },
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
  {
    q: "How do I track my order?",
    a: "Open My orders and tap any order to see its live status timeline and, once a rider is assigned, their location on the map.",
  },
  {
    q: "How do I pay with Telebirr, CBE or BOA?",
    a: "Choose your method at checkout, place the order, then open the order to see the account details. Send the exact total and upload a screenshot of your receipt. Our team verifies it before the order is confirmed.",
  },
  {
    q: "Can I cancel an order?",
    a: "Yes — you can cancel from the order until it's handed to a rider. Once it's out for delivery, contact support and we'll help.",
  },
  {
    q: "How do I add or change my delivery address?",
    a: "Go to Addresses in your account. You can add, edit, delete and set a default address, then pick it at checkout.",
  },
  {
    q: "What if an item is missing or wrong?",
    a: "Contact support with your order number and a short description. We'll review it with the shop and make it right.",
  },
];

const TOPICS = [
  { id: "orders", label: "Order issues", icon: Package },
  { id: "delivery", label: "Delivery & tracking", icon: Truck },
  { id: "payments", label: "Payments & refunds", icon: CreditCard },
  { id: "account", label: "Account & security", icon: HelpCircle },
] as const;

function HelpPage() {
  const { user } = useAuth();
  const { order } = Route.useSearch();
  const { data: orders = [] } = useQuery(ordersQuery(user?.id));
  const { data: c } = useQuery(siteContentQuery);

  const recentOrders = orders.slice(0, 5);
  const phone = c?.contact_phone ?? "";
  const email = c?.contact_email ?? "";

  return (
    <>
      <AccountHeader
        title="Help & support"
        description="Answers to common questions, and ways to reach the Ligo team."
      />

      {order && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft/60 p-4 text-sm">
          <p className="font-semibold">Help with order {order}</p>
          <p className="mt-0.5 text-muted-foreground">
            Include this order number when you contact us so we can help faster.
          </p>
        </div>
      )}

      {/* Contact */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title="Contact us" description="We're here for you across Bishoftu." />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
          >
            <Phone className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Call</p>
              <p className="truncate text-xs text-muted-foreground">{phone || "—"}</p>
            </div>
          </a>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(order ? `Support for order ${order}` : "Ligo support")}`}
            className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
          >
            <Mail className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Email</p>
              <p className="truncate text-xs text-muted-foreground">{email || "—"}</p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <MapPin className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Visit</p>
              <p className="truncate text-xs text-muted-foreground">
                {c?.contact_address ?? "Bishoftu, Oromia"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Order-related support */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading
          title="Order-related support"
          description="Pick the order you need help with."
        />
        {recentOrders.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            You have no orders yet.{" "}
            <Link to="/shops" className="font-medium text-primary">
              Start shopping
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
                    View order
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <a
              key={t.id}
              href={`mailto:${email}?subject=${encodeURIComponent(`Ligo support — ${t.label}${order ? ` (order ${order})` : ""}`)}`}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40"
            >
              <t.icon className="h-4 w-4 text-primary" />
              {t.label}
              <MessageCircle className="ml-auto h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title="Frequently asked questions" />
        <Accordion type="single" collapsible className="mt-2">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title="Still need help?" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <a href={`tel:${phone.replace(/\s/g, "")}`}>
              <Phone className="mr-2 h-4 w-4" />
              Call support
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/account/orders">
              <RefreshCw className="mr-2 h-4 w-4" />
              Review my orders
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
