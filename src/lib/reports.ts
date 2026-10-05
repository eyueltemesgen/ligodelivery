/**
 * Shared report model and pure helpers.
 *
 * This module is intentionally dependency-light so it can be imported by both
 * the browser (Reports dashboard, exports) and the server aggregation layer.
 * All status labels come from the app's single status system in `lib/orders`.
 */
import { ORDER_STATUSES, STATUS_LABEL, STATUS_LABEL_KEY, type OrderStatus } from "@/lib/orders";
import type { TranslationKey } from "@/lib/i18n";
import { ETB } from "@/lib/format";

/**
 * Reports use the platform's operating timezone. Ethiopia observes no daylight
 * saving, so a fixed UTC+03:00 offset is exact and keeps bucket boundaries
 * stable regardless of the server's own timezone.
 */
export const REPORT_TZ = "Africa/Addis_Ababa";
export const REPORT_TZ_OFFSET_MIN = 180;

export type ReportRangeKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "custom";

export type ReportRequest = {
  range: ReportRangeKey;
  /** Inclusive local start date (YYYY-MM-DD) for custom ranges. */
  start?: string;
  /** Inclusive local end date (YYYY-MM-DD) for custom ranges. */
  end?: string;
};

export type ReportPeriod = {
  key: ReportRangeKey;
  label: string;
  /** Inclusive lower bound, epoch ms. */
  startMs: number;
  /** Exclusive upper bound, epoch ms. */
  endMs: number;
  startIso: string;
  endIso: string;
  startDate: string;
  endDate: string;
  /** Display label for the inclusive final day. */
  endDateInclusive: string;
};

export type SummaryMetrics = {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalSales: number;
  deliveryFees: number;
  totalPayments: number;
  refunds: number;
  netRevenue: number;
  newCustomers: number;
  activeCustomers: number;
  shops: number;
  products: number;
  riderOrders: number;
};

export type SalesPoint = {
  key: string;
  label: string;
  orders: number;
  gross: number;
  deliveryFees: number;
  discounts: number;
  refunds: number;
  net: number;
};

export type SalesTotals = {
  gross: number;
  deliveryFees: number;
  discounts: number;
  refunds: number;
  net: number;
  orders: number;
  avgOrderValue: number;
};

export type SalesSection = {
  granularity: "hour" | "day" | "week" | "month";
  points: SalesPoint[];
  totals: SalesTotals;
};

export type ReportOrderRow = {
  id: string;
  orderCode: string;
  createdAt: string;
  customer: string;
  shop: string;
  total: number;
  /** Raw payment method id (e.g. "telebirr"); use for localized display. */
  paymentMethodId: string;
  /** English payment method label; fallback when the id is unknown. */
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  deliveryStatus: string;
  rider: string;
};

export type PaymentMethodRow = {
  method: string;
  label: string;
  transactions: number;
  amount: number;
  successful: number;
  pending: number;
  failed: number;
};

export type ShopReportRow = {
  shopId: string;
  name: string;
  orders: number;
  sales: number;
  avgOrderValue: number;
  completed: number;
  cancelled: number;
  deliveryFees: number;
};

export type ProductReportRow = {
  productId: string | null;
  name: string;
  shop: string;
  unitsSold: number;
  revenue: number;
  orders: number;
};

export type CustomerSection = {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  totalOrders: number;
  totalSpending: number;
};

export type RiderReportRow = {
  riderId: string;
  name: string;
  assigned: number;
  completed: number;
  cancelled: number;
  completionRate: number;
};

export type ReportPayload = {
  period: ReportPeriod;
  generatedAt: string;
  generatedBy: string | null;
  summary: SummaryMetrics;
  sales: SalesSection;
  orders: ReportOrderRow[];
  payments: PaymentMethodRow[];
  shops: ShopReportRow[];
  products: ProductReportRow[];
  customers: CustomerSection;
  riders: RiderReportRow[];
};

export type ReportExportKind = "view" | "excel" | "pdf";

export const RANGE_PRESETS: { key: ReportRangeKey; label: string; short: string }[] = [
  { key: "today", label: "Today", short: "Today" },
  { key: "yesterday", label: "Yesterday", short: "Yesterday" },
  { key: "this_week", label: "This Week", short: "This week" },
  { key: "last_week", label: "Last Week", short: "Last week" },
  { key: "this_month", label: "This Month", short: "This month" },
  { key: "last_month", label: "Last Month", short: "Last month" },
  { key: "this_year", label: "This Year", short: "This year" },
  { key: "last_year", label: "Last Year", short: "Last year" },
  { key: "custom", label: "Custom Range", short: "Custom" },
];

/** Payment methods the application actually supports (see `place_order`). */
export const PAYMENT_METHODS: { id: string; label: string }[] = [
  { id: "cash", label: "Cash on delivery" },
  { id: "telebirr", label: "Telebirr" },
  { id: "cbe", label: "CBE Birr" },
  { id: "boa", label: "Bank of Abyssinia" },
  { id: "mobile_money", label: "Mobile Money" },
  { id: "chapa", label: "Chapa" },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((m) => [m.id, m.label]),
);

export const paymentMethodLabel = (method: string) =>
  PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, " ");

export const statusLabel = (status: string) =>
  STATUS_LABEL[status as OrderStatus] ?? status.replace(/_/g, " ");

export const orderStatuses = ORDER_STATUSES;

/** Payment statuses treated as money actually collected. */
export const SUCCESSFUL_PAYMENT_STATUSES = ["paid", "verified"];
/** Payment statuses still awaiting settlement. */
export const PENDING_PAYMENT_STATUSES = ["unpaid", "pending", "pending_verification"];
/** Payment statuses that failed or were returned. */
export const FAILED_PAYMENT_STATUSES = ["rejected", "refunded"];

/** Human-readable delivery stage derived from the order status (no new system). */
export function deliveryStatusLabel(status: string): string {
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  if (["confirmed", "preparing", "ready_for_pickup"].includes(status)) return "Preparing";
  if (
    [
      "dispatched",
      "accepted",
      "rider_assigned",
      "arrived_at_merchant",
      "picked_up",
      "on_the_way",
    ].includes(status)
  )
    return "In transit";
  return "Awaiting payment";
}

/** Delivery-stage buckets derived from an order status. */
export type DeliveryBucket =
  | "delivered"
  | "cancelled"
  | "preparing"
  | "in_transit"
  | "awaiting_payment";

export function deliveryStatusBucket(status: string): DeliveryBucket {
  if (status === "delivered") return "delivered";
  if (status === "cancelled") return "cancelled";
  if (["confirmed", "preparing", "ready_for_pickup"].includes(status)) return "preparing";
  if (
    [
      "dispatched",
      "accepted",
      "rider_assigned",
      "arrived_at_merchant",
      "picked_up",
      "on_the_way",
    ].includes(status)
  )
    return "in_transit";
  return "awaiting_payment";
}

const DELIVERY_BUCKET_KEY: Record<DeliveryBucket, TranslationKey> = {
  delivered: "rp_delivery_delivered",
  cancelled: "rp_delivery_cancelled",
  preparing: "rp_delivery_processing",
  in_transit: "rp_delivery_in_transit",
  awaiting_payment: "rp_delivery_awaiting_payment",
};

/** Localized delivery-stage label key. */
export function deliveryStatusKey(status: string): TranslationKey {
  return DELIVERY_BUCKET_KEY[deliveryStatusBucket(status)];
}

export { STATUS_LABEL_KEY };

// ---------------------------------------------------------------------------
// Date helpers (local platform time)
// ---------------------------------------------------------------------------

type LocalParts = { y: number; m: number; d: number; h: number };

const shifted = (ms: number) => new Date(ms + REPORT_TZ_OFFSET_MIN * 60_000);

function localParts(ms: number): LocalParts {
  const s = shifted(ms);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate(), h: s.getUTCHours() };
}

/** Epoch ms for local midnight of the given local Y/M/D. */
function localMidnightMs(y: number, m: number, d: number): number {
  return Date.UTC(y, m, d, 0, 0, 0, 0) - REPORT_TZ_OFFSET_MIN * 60_000;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (p: { y: number; m: number; d: number }) => `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;

export const toLocalDateString = (ms: number) => ymd(localParts(ms));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function humanDate(ms: number): string {
  const p = localParts(ms);
  return `${p.d} ${MONTHS[p.m]} ${p.y}`;
}

function addDays(p: LocalParts, days: number): LocalParts {
  const base = new Date(Date.UTC(p.y, p.m, p.d));
  base.setUTCDate(base.getUTCDate() + days);
  return {
    y: base.getUTCFullYear(),
    m: base.getUTCMonth(),
    d: base.getUTCDate(),
    h: 0,
  };
}

/** Monday-based start of the local week containing `p`. */
function startOfWeek(p: LocalParts): LocalParts {
  const base = new Date(Date.UTC(p.y, p.m, p.d));
  const dow = (base.getUTCDay() + 6) % 7; // Mon=0
  return addDays({ ...p, h: 0 }, -dow);
}

/** Parse a YYYY-MM-DD string into local parts, or null when invalid. */
export function parseLocalDate(value: string | undefined | null): LocalParts | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const probe = new Date(Date.UTC(y, m, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m || probe.getUTCDate() !== d) {
    return null;
  }
  return { y, m, d, h: 0 };
}

/** Resolve a report request into concrete local-time boundaries. */
export function resolvePeriod(
  request: ReportRequest,
  now: number = Date.now(),
): { period: ReportPeriod } | { error: string } {
  const today = localParts(now);
  let start: LocalParts;
  let endExclusive: LocalParts;
  let label: string;

  switch (request.range) {
    case "today":
      start = { ...today, h: 0 };
      endExclusive = addDays(start, 1);
      label = "Today";
      break;
    case "yesterday": {
      start = addDays(today, -1);
      endExclusive = addDays(today, 0);
      label = "Yesterday";
      break;
    }
    case "this_week":
      start = startOfWeek(today);
      endExclusive = addDays(start, 7);
      label = "This Week";
      break;
    case "last_week":
      start = addDays(startOfWeek(today), -7);
      endExclusive = addDays(start, 7);
      label = "Last Week";
      break;
    case "this_month":
      start = { y: today.y, m: today.m, d: 1, h: 0 };
      endExclusive = { y: today.y, m: today.m + 1, d: 1, h: 0 };
      label = "This Month";
      break;
    case "last_month":
      start = { y: today.y, m: today.m - 1, d: 1, h: 0 };
      endExclusive = { y: today.y, m: today.m, d: 1, h: 0 };
      label = "Last Month";
      break;
    case "this_year":
      start = { y: today.y, m: 0, d: 1, h: 0 };
      endExclusive = { y: today.y + 1, m: 0, d: 1, h: 0 };
      label = "This Year";
      break;
    case "last_year":
      start = { y: today.y - 1, m: 0, d: 1, h: 0 };
      endExclusive = { y: today.y, m: 0, d: 1, h: 0 };
      label = "Last Year";
      break;
    case "custom": {
      const s = parseLocalDate(request.start);
      const e = parseLocalDate(request.end);
      if (!s) return { error: "Enter a valid start date." };
      if (!e) return { error: "Enter a valid end date." };
      const startMs = localMidnightMs(s.y, s.m, s.d);
      const endMs = localMidnightMs(e.y, e.m, e.d);
      if (startMs > endMs) return { error: "Start date cannot be after end date." };
      start = s;
      endExclusive = addDays(e, 1);
      label = "Custom Range";
      break;
    }
    default:
      return { error: "Choose a reporting period." };
  }

  const startMs = localMidnightMs(start.y, start.m, start.d);
  const endMs = localMidnightMs(endExclusive.y, endExclusive.m, endExclusive.d);
  const inclusiveEndMs = endMs - 1;

  return {
    period: {
      key: request.range,
      label,
      startMs,
      endMs,
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(endMs).toISOString(),
      startDate: ymd(start),
      endDate: ymd(endExclusive),
      endDateInclusive: ymd(localParts(inclusiveEndMs)),
    },
  };
}

/** Human label such as "3 Oct 2026" or "1 Oct 2026 – 3 Oct 2026". */
export function periodRangeLabel(period: ReportPeriod): string {
  const a = humanDate(period.startMs);
  const b = humanDate(period.endMs - 1);
  return a === b ? a : `${a} – ${b}`;
}

/** Bucket labels for the sales timeline. */
export function buildBuckets(period: ReportPeriod): {
  granularity: SalesSection["granularity"];
  buckets: { key: string; label: string; startMs: number; endMs: number }[];
} {
  const daySpan = Math.round((period.endMs - period.startMs) / 86_400_000);
  const granularity: SalesSection["granularity"] =
    daySpan <= 1 ? "hour" : daySpan <= 31 ? "day" : daySpan <= 120 ? "week" : "month";

  const buckets: { key: string; label: string; startMs: number; endMs: number }[] = [];

  if (granularity === "hour") {
    for (let h = 0; h < 24; h++) {
      const startMs = period.startMs + h * 3_600_000;
      buckets.push({ key: `h${h}`, label: `${pad(h)}:00`, startMs, endMs: startMs + 3_600_000 });
    }
    return { granularity, buckets };
  }

  if (granularity === "day") {
    for (let ms = period.startMs; ms < period.endMs;) {
      const p = localParts(ms);
      const next = localMidnightMs(p.y, p.m, p.d + 1);
      buckets.push({
        key: ymd(p),
        label: `${p.d} ${MONTHS[p.m]}`,
        startMs: ms,
        endMs: next,
      });
      ms = next;
    }
    return { granularity, buckets };
  }

  if (granularity === "week") {
    for (let ms = period.startMs; ms < period.endMs;) {
      const p = localParts(ms);
      const nextP = addDays(p, 7);
      const next = localMidnightMs(nextP.y, nextP.m, nextP.d);
      const end = Math.min(next, period.endMs);
      buckets.push({
        key: ymd(p),
        label: `${p.d} ${MONTHS[p.m]}`,
        startMs: ms,
        endMs: end,
      });
      ms = next;
    }
    return { granularity, buckets };
  }

  for (let ms = period.startMs; ms < period.endMs;) {
    const p = localParts(ms);
    const nextP = { y: p.y, m: p.m + 1, d: 1, h: 0 };
    const next = localMidnightMs(nextP.y, nextP.m, nextP.d);
    buckets.push({
      key: `${p.y}-${pad(p.m + 1)}`,
      label: `${MONTHS[p.m]} ${p.y}`,
      startMs: ms,
      endMs: Math.min(next, period.endMs),
    });
    ms = next;
  }
  return { granularity, buckets };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export const money = (value: number | string | null | undefined) => ETB(value);

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: REPORT_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_ONLY = new Intl.DateTimeFormat("en-GB", {
  timeZone: REPORT_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatReportDateTime = (value: string | number | Date) =>
  DATE_TIME.format(new Date(value));

export const formatReportDate = (value: string | number | Date) =>
  DATE_ONLY.format(new Date(value));

/** platform-report-YYYY-MM-DD.ext or platform-report-START-to-END.ext */
export function reportFileName(period: ReportPeriod, ext: string): string {
  const start = period.startDate;
  const end = period.endDateInclusive;
  const base = start === end ? `platform-report-${start}` : `platform-report-${start}-to-${end}`;
  return `${base}.${ext}`;
}
