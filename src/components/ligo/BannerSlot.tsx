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
  includeSpecialMoments = false,
}: {
  placement: string;
  className?: string | undefined;
  /** Also rotate the built-in Special Moments promo (when it has content). */
  includeSpecialMoments?: boolean;
}) {
  return (
    <AdCarousel
      placement={placement}
      className={className}
      priority
      includeSpecialMoments={includeSpecialMoments}
    />
  );
}
