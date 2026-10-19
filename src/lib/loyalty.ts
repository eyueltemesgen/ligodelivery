import { supabase } from "@/integrations/supabase/client";
import { isMissingRpc, isMissingTable } from "@/lib/supa-error";

/**
 * Customer-facing rewards: loyalty points and the referral code.
 *
 * All balances come from SECURITY DEFINER RPCs (`my_loyalty`,
 * `my_loyalty_ledger`) — the client never reads or writes a wallet row, so a
 * customer cannot inflate their own points. Every function here degrades to an
 * empty/absent result when the migration has not been applied yet, so the
 * storefront keeps working on a project that predates it.
 */

export type LoyaltySummary = {
  enabled: boolean;
  points: number;
  lifetimePoints: number;
  referralCode: string | null;
  referredBy: string | null;
  invitedCount: number;
  pointValueEtb: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
  earnPointsPer100Etb: number;
  referrerPoints: number;
  refereePoints: number;
};

export type LoyaltyLedgerEntry = {
  id: string;
  orderId: string | null;
  kind: LoyaltyLedgerKind;
  points: number;
  note: string | null;
  createdAt: string;
};

export type LoyaltyLedgerKind =
  "earn" | "redeem" | "referral_bonus" | "referral_welcome" | "signup_bonus" | "admin_adjust";

/** The ledger `kind` maps to an i18n key so no English leaks from the DB. */
export const LEDGER_LABEL_KEY: Record<LoyaltyLedgerKind, string> = {
  earn: "rw_kind_earn",
  redeem: "rw_kind_redeem",
  referral_bonus: "rw_kind_referral_bonus",
  referral_welcome: "rw_kind_referral_welcome",
  signup_bonus: "rw_kind_signup_bonus",
  admin_adjust: "rw_kind_admin_adjust",
};

type RawSummary = {
  enabled?: boolean;
  points?: number;
  lifetime_points?: number;
  referral_code?: string | null;
  referred_by?: string | null;
  invited_count?: number;
  point_value_etb?: number;
  min_redeem_points?: number;
  max_redeem_percent?: number;
  earn_points_per_100_etb?: number;
  referrer_points?: number;
  referee_points?: number;
};

/** Defaults used before the settings row exists, and for the disabled state. */
export const LOYALTY_FALLBACK: LoyaltySummary = {
  enabled: false,
  points: 0,
  lifetimePoints: 0,
  referralCode: null,
  referredBy: null,
  invitedCount: 0,
  pointValueEtb: 0.5,
  minRedeemPoints: 100,
  maxRedeemPercent: 20,
  earnPointsPer100Etb: 5,
  referrerPoints: 100,
  refereePoints: 100,
};

export function normalizeSummary(raw: RawSummary | null | undefined): LoyaltySummary {
  if (!raw) return LOYALTY_FALLBACK;
  return {
    enabled: raw.enabled ?? false,
    points: Number(raw.points ?? 0),
    lifetimePoints: Number(raw.lifetime_points ?? 0),
    referralCode: raw.referral_code ?? null,
    referredBy: raw.referred_by ?? null,
    invitedCount: Number(raw.invited_count ?? 0),
    pointValueEtb: Number(raw.point_value_etb ?? LOYALTY_FALLBACK.pointValueEtb),
    minRedeemPoints: Number(raw.min_redeem_points ?? LOYALTY_FALLBACK.minRedeemPoints),
    maxRedeemPercent: Number(raw.max_redeem_percent ?? LOYALTY_FALLBACK.maxRedeemPercent),
    earnPointsPer100Etb: Number(
      raw.earn_points_per_100_etb ?? LOYALTY_FALLBACK.earnPointsPer100Etb,
    ),
    referrerPoints: Number(raw.referrer_points ?? LOYALTY_FALLBACK.referrerPoints),
    refereePoints: Number(raw.referee_points ?? LOYALTY_FALLBACK.refereePoints),
  };
}

/** Loads the signed-in customer's points, code and invite count. Never throws. */
export async function fetchLoyaltySummary(): Promise<LoyaltySummary> {
  const { data, error } = await supabase.rpc("my_loyalty");
  if (error) {
    if (!isMissingRpc(error)) console.warn("[loyalty] summary unavailable", error.message);
    return LOYALTY_FALLBACK;
  }
  return normalizeSummary(data as RawSummary);
}

/** Recent points activity, newest first. Never throws. */
export async function fetchLoyaltyLedger(limit = 50): Promise<LoyaltyLedgerEntry[]> {
  const { data, error } = await supabase.rpc("my_loyalty_ledger", { p_limit: limit });
  if (error) {
    if (!isMissingRpc(error)) console.warn("[loyalty] ledger unavailable", error.message);
    return [];
  }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r["id"]),
    orderId: (r["order_id"] as string | null) ?? null,
    kind: String(r["kind"]) as LoyaltyLedgerKind,
    points: Number(r["points"] ?? 0),
    note: (r["note"] as string | null) ?? null,
    createdAt: String(r["created_at"]),
  }));
}

/**
 * Validates a referral code before signup so a typo is caught on the form
 * rather than silently producing an unlinked account.
 */
export async function lookupReferralCode(
  code: string,
): Promise<{ valid: boolean; userId: string | null }> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false, userId: null };
  const { data, error } = await supabase.rpc("loyalty_lookup_code", { p_code: trimmed });
  if (error) {
    // Migration absent: accept the code so signup is never blocked by rewards.
    if (isMissingRpc(error) || isMissingTable(error)) return { valid: false, userId: null };
    return { valid: false, userId: null };
  }
  const r = (data ?? {}) as { valid?: boolean; user_id?: string };
  return { valid: !!r.valid, userId: r.user_id ?? null };
}

export type AdminLoyaltyOverview = {
  outstandingPoints: number;
  issuedPoints: number;
  redeemedPoints: number;
  referralCount: number;
  wallets: {
    userId: string;
    points: number;
    lifetimePoints: number;
    referralCode: string | null;
    referredBy: string | null;
    referralCredited: boolean;
    invitedCount: number;
    fullName: string | null;
    phone: string | null;
  }[];
};

/** Admin console view of every wallet. Never throws; returns null when absent. */
export async function fetchAdminLoyalty(limit = 100): Promise<AdminLoyaltyOverview | null> {
  const { data, error } = await supabase.rpc("admin_loyalty_overview", { p_limit: limit });
  if (error) {
    if (!isMissingRpc(error)) console.warn("[loyalty] admin overview unavailable", error.message);
    return null;
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    outstandingPoints: Number(r["outstanding_points"] ?? 0),
    issuedPoints: Number(r["issued_points"] ?? 0),
    redeemedPoints: Number(r["redeemed_points"] ?? 0),
    referralCount: Number(r["referral_count"] ?? 0),
    wallets: ((r["wallets"] ?? []) as Record<string, unknown>[]).map((w) => ({
      userId: String(w["user_id"]),
      points: Number(w["points"] ?? 0),
      lifetimePoints: Number(w["lifetime_points"] ?? 0),
      referralCode: (w["referral_code"] as string | null) ?? null,
      referredBy: (w["referred_by"] as string | null) ?? null,
      referralCredited: !!w["referral_credited"],
      invitedCount: Number(w["invited_count"] ?? 0),
      fullName: (w["full_name"] as string | null) ?? null,
      phone: (w["phone"] as string | null) ?? null,
    })),
  };
}

export async function adjustLoyaltyPoints(
  userId: string,
  points: number,
  note?: string,
): Promise<{ ok: boolean; error?: unknown }> {
  const { error } = await supabase.rpc("admin_adjust_loyalty", {
    p_user_id: userId,
    p_points: points,
    ...(note ? { p_note: note } : {}),
  });
  return error ? { ok: false, error } : { ok: true };
}

/** The shareable link a customer sends to a friend. */
export function referralLink(code: string | null, origin?: string): string {
  if (!code) return "";
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/register?ref=${encodeURIComponent(code)}`;
}

/**
 * How many points a given order value will earn. Mirrors the server rule in
 * `loyalty_grant_for_order` (floor of subtotal x points-per-100); shown as a
 * preview only — the grant itself is always server-side.
 */
export function pointsForSubtotal(subtotal: number, pointsPer100: number): number {
  return Math.floor((Math.max(subtotal, 0) * pointsPer100) / 100);
}

/**
 * The largest number of points a customer may spend on an order, mirroring the
 * server cap. The server re-checks and wins; this only keeps the slider honest.
 */
export function maxRedeemablePoints(
  summary: Pick<
    LoyaltySummary,
    "points" | "minRedeemPoints" | "maxRedeemPercent" | "pointValueEtb"
  >,
  orderValue: number,
): number {
  if (summary.pointValueEtb <= 0) return 0;
  const capEtb = (Math.max(orderValue, 0) * summary.maxRedeemPercent) / 100;
  const byCap = Math.floor(capEtb / summary.pointValueEtb);
  const allowed = Math.min(summary.points, byCap);
  return allowed >= summary.minRedeemPoints ? allowed : 0;
}
