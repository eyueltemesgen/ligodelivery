import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { bannersQuery } from "@/lib/content";
import { StorageImage } from "@/lib/media";
import { useLanguage } from "@/hooks/useLanguage";
import { RotatingSlides } from "@/components/ligo/RotatingCarousel";

/**
 * Database-driven banner placement. All active banners for `placement` rotate
 * through one slot instead of stacking, so several banners share the same
 * screen space.
 */
export function BannerSlot({ placement, className }: { placement: string; className?: string }) {
  const { t } = useLanguage();
  const { data: banners = [] } = useQuery(bannersQuery(placement));
  if (banners.length === 0) return null;

  return (
    <section className={className ?? "container-ligo py-6"}>
      <RotatingSlides
        ariaLabel={t("banner_carousel_aria")}
        className="rounded-2xl border border-border bg-card shadow-card"
      >
        {banners.map((b) => (
          <BannerSlide
            key={b.id}
            title={b.title}
            subtitle={b.subtitle}
            imagePath={b.image_url}
            linkUrl={b.link_url}
            ctaLabel={b.cta_label}
          />
        ))}
      </RotatingSlides>
    </section>
  );
}

function BannerSlide({
  title,
  subtitle,
  imagePath,
  linkUrl,
  ctaLabel,
}: {
  title: string;
  subtitle: string | null;
  imagePath: string | null;
  linkUrl: string | null;
  ctaLabel: string | null;
}) {
  const body = (
    <div className="grid min-w-0 sm:grid-cols-[1.35fr_1fr]">
      {imagePath && (
        <StorageImage
          path={imagePath}
          alt={title}
          priority
          width={1080}
          height={540}
          className="aspect-[16/9] w-full sm:aspect-auto sm:min-h-56"
        />
      )}
      <div className="flex min-w-0 flex-col justify-center gap-1 p-5 pb-8 sm:p-6">
        <p className="break-words font-display text-xl font-bold leading-tight sm:text-2xl">
          {title}
        </p>
        {subtitle && <p className="break-words text-sm text-muted-foreground">{subtitle}</p>}
        {ctaLabel && (
          <span className="mt-3 inline-flex w-fit rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
            {ctaLabel}
          </span>
        )}
      </div>
    </div>
  );

  if (!linkUrl) return body;
  const external = /^https?:/.test(linkUrl);
  if (external) {
    return (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block">
        {body}
      </a>
    );
  }
  return (
    <Link to={linkUrl} className="block">
      {body}
    </Link>
  );
}
