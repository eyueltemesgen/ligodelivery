import { AdCarousel } from "@/components/ligo/AdCarousel";

/**
 * Advertisement slot for a named placement. Kept as the storefront-facing
 * wrapper so pages keep their existing `<BannerSlot placement="…" />` calls;
 * the actual display (rotation, transitions, responsive sizing) lives in
 * {@link AdCarousel}. Renders nothing when the placement has no active banner.
 */
export function BannerSlot({
  placement,
  className,
}: {
  /** One placement, or several merged into a single rotating slot. */
  placement: string | readonly string[];
  className?: string | undefined;
}) {
  return <AdCarousel placement={placement} className={className} priority />;
}
