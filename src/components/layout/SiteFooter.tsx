import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { Phone, Mail, MapPin } from "lucide-react";
import { siteContentQuery } from "@/lib/content";

export function SiteFooter() {
  const { data: c } = useQuery(siteContentQuery);

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="container-ligo grid gap-8 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{c?.footer_tagline}</p>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Explore</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/shops" className="hover:text-foreground">Shops</Link></li>
            <li><Link to="/categories" className="hover:text-foreground">Categories</Link></li>
            <li><Link to="/offers" className="hover:text-foreground">Offers</Link></li>
            <li><Link to="/orders" className="hover:text-foreground">Track order</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Work with us</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/rider/join" className="hover:text-foreground">Become a rider</Link></li>
            <li><Link to="/account" className="hover:text-foreground">My account</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Contact</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{c?.contact_address}</li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <a href={`tel:${(c?.contact_phone ?? "").replace(/\s/g, "")}`} className="hover:text-foreground">{c?.contact_phone}</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a href={`mailto:${c?.contact_email ?? ""}`} className="hover:text-foreground">{c?.contact_email}</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="space-y-1 border-t border-border py-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {c?.brand_name}. All rights reserved.</p>
        <p>Developed by {c?.developer_name} · {c?.company_name}</p>
      </div>
    </footer>
  );
}
