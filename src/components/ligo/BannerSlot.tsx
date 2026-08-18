import { useQuery } from "@tanstack/react-query";
import { bannersQuery } from "@/lib/content";
import { StorageImage } from "@/lib/media";

export function BannerSlot({ placement, className }: { placement: string; className?: string }) {
  const { data: banners = [] } = useQuery(bannersQuery(placement));
  if (banners.length === 0) return null;

  return (
    <section className={className ?? "container-ligo py-6"}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((b) => {
          const inner = (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-pop">
              {b.image_url && <StorageImage path={b.image_url} alt={b.title} className="h-40 w-full object-cover" />}
              <div className="p-4">
                <p className="font-display text-lg font-bold">{b.title}</p>
                {b.subtitle && <p className="mt-1 text-sm text-muted-foreground">{b.subtitle}</p>}
                {b.cta_label && <p className="mt-3 text-sm font-semibold text-primary">{b.cta_label}</p>}
              </div>
            </div>
          );
          return b.link_url ? (
            <a key={b.id} href={b.link_url} className="block">{inner}</a>
          ) : (
            <div key={b.id}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
