import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { Phone, Mail, MapPin } from "lucide-react";
import { siteContentQuery } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { data: c } = useQuery(siteContentQuery);
  const { t } = useI18n();

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="container-ligo grid gap-8 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{c?.footer_tagline}</p>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">
            {t("footer.explore")}
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/shops" className="hover:text-foreground">
                {t("nav.shops")}
              </Link>
            </li>
            <li>
              <Link to="/categories" className="hover:text-foreground">
                {t("nav.categories")}
              </Link>
            </li>
            <li>
              <Link to="/offers" className="hover:text-foreground">
                {t("nav.offers")}
              </Link>
            </li>
            <li>
              <Link to="/account/orders" className="hover:text-foreground">
                {t("nav.trackOrder")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">
            {t("footer.workWithUs")}
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/rider/join" className="hover:text-foreground">
                {t("nav.becomeRider")}
              </Link>
            </li>
            <li>
              <Link to="/account" className="hover:text-foreground">
                {t("nav.myAccount")}
              </Link>
            </li>
            <li>
              <Link to="/account/help" className="hover:text-foreground">
                {t("footer.helpSupport")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">
            {t("footer.contact")}
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words">{c?.contact_address}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <a
                href={`tel:${(c?.contact_phone ?? "").replace(/\s/g, "")}`}
                className="hover:text-foreground"
              >
                {c?.contact_phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <a
                href={`mailto:${c?.contact_email ?? ""}`}
                className="min-w-0 break-all hover:text-foreground"
              >
                {c?.contact_email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="space-y-1 border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>
          {t("footer.rights", {
            year: new Date().getFullYear(),
            brand: c?.brand_name ?? t("brand.name"),
          })}
        </p>
        <p>
          {t("footer.developedBy", {
            developer: c?.developer_name ?? "",
            company: c?.company_name ?? "",
          })}
        </p>
      </div>
    </footer>
  );
}
