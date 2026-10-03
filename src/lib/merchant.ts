import { supabase } from "@/integrations/supabase/client";
import type { OrderStatus } from "@/lib/orders";

export type MerchantStatus = "pending" | "under_review" | "approved" | "rejected" | "suspended";

export type MerchantProfile = {
  id: string;
  owner_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  business_name: string;
  business_description: string | null;
  category_id: string | null;
  business_phone: string | null;
  address: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  opens_at: string;
  closes_at: string;
  logo_url: string | null;
  cover_url: string | null;
  status: MerchantStatus;
  review_notes: string | null;
  commission_percent: number | null;
  shop_id: string | null;
  created_at: string;
};

export type MerchantOrder = {
  id: string;
  order_code: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  tip: number;
  total: number;
  commission_amount: number;
  merchant_net: number;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  rider_id: string | null;
  shop_id: string | null;
  created_at: string;
};

export type MerchantPayout = {
  id: string;
  merchant_id: string;
  period_start: string | null;
  period_end: string | null;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: "pending" | "processing" | "paid" | "failed";
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
};

export type MerchantPromotion = {
  id: string;
  merchant_id: string;
  shop_id: string | null;
  product_id: string | null;
  kind: "featured_shop" | "featured_product" | "homepage";
  message: string | null;
  status: "pending" | "approved" | "rejected";
  price: number | null;
  admin_notes: string | null;
  created_at: string;
};

export const MERCHANT_STATUS_KEY: Record<MerchantStatus, string> = {
  pending: "merchant.statusPending",
  under_review: "merchant.statusUnderReview",
  approved: "merchant.statusApproved",
  rejected: "merchant.statusRejected",
  suspended: "merchant.statusSuspended",
};

export const PROMOTION_KEY: Record<MerchantPromotion["kind"], string> = {
  featured_shop: "merchant.promoFeaturedShop",
  featured_product: "merchant.promoFeaturedProduct",
  homepage: "merchant.promoHomepage",
};

/** Statuses a shop owner is allowed to move an order through. */
export const MERCHANT_NEXT_STATUS: Partial<
  Record<OrderStatus, { to: OrderStatus; labelKey: string }>
> = {
  pending: { to: "preparing", labelKey: "merchant.nextAcceptPrepare" },
  pending_payment: { to: "preparing", labelKey: "merchant.nextAcceptPrepare" },
  payment_verification: { to: "preparing", labelKey: "merchant.nextAcceptPrepare" },
  confirmed: { to: "preparing", labelKey: "merchant.nextAcceptPrepare" },
  preparing: { to: "ready_for_pickup", labelKey: "merchant.nextReadyPickup" },
};

export const merchantProfileQuery = (uid: string | undefined) => ({
  queryKey: ["merchant-profile", uid],
  enabled: !!uid,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("merchant_profiles")
      .select("*")
      .eq("id", uid!)
      .maybeSingle();
    if (error) throw error;
    return (data as MerchantProfile | null) ?? null;
  },
});

export const ETB_PERCENT = (n: number) => `${Number(n).toFixed(0)}%`;
