import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Phone, Mail, MapPin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="container-ligo grid gap-8 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Ligo delivers food, groceries and essentials across Bishoftu — fast, local and reliable.
          </p>
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
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Bishoftu, Oromia</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />+251 900 000 000</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />hello@ligo.et</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ligo Delivery. All rights reserved.
      </div>
    </footer>
  );
}
