/**
 * Server-side report aggregation.
 *
 * Reads the platform's real tables and reduces them to a single `ReportPayload`.
 * The dashboard, the Excel workbook and the PDF all render from this one
 * payload, so the numbers can never disagree.
 *
 * The caller passes an RLS-enforced Supabase client carrying the admin's own
 * JWT, so the database itself also restricts the reads to admins (defence in
 * depth on top of the explicit `is_admin()` check in the server function).
 *
 * `.server.ts` keeps this module out of the browser bundle.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Language } from "@/lib/i18n";
import {
  buildBuckets,
  deliveryStatusLabel,
  paymentMethodLabel,
  PAYMENT_METHODS,
  SUCCESSFUL_PAYMENT_STATUSES,
  PENDING_PAYMENT_STATUSES,
  FAILED_PAYMENT_STATUSES,
  type CustomerSection,
  type PaymentMethodRow,
  type ProductReportRow,
  type ReportOrderRow,
  type ReportPayload,
  type ReportPeriod,
  type RiderReportRow,
  type SalesPoint,
  type SalesSection,
  type ShopReportRow,
  type SummaryMetrics,
} from "@/lib/reports";

export type ReportClient = SupabaseClient<Database>;

export type GenerateReportInput = {
  period: ReportPeriod;
  /** Admin display name, recorded on the report. */
  generatedBy?: string | null;
  /** Language for server-rendered export labels (dashboard localizes itself). */
  language?: Language | undefined;
};

/** Supabase caps a single response; page through so large periods stay exact. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

const num = (value: unknown) => Number(value ?? 0);
const round2 = (value: number) => Math.round(value * 100) / 100;

export async function generateReport(
  client: ReportClient,
  input: GenerateReportInput,
): Promise<ReportPayload> {
  const { period } = input;
  const { startIso, endIso } = period;

  // One round of queries for the period, one for the customer baseline.
  const [orders, orderItems, payments, riderRows, profileRows, shops, products] = await Promise.all(
    [
      fetchAll<{
        id: string;
        order_code: string;
        customer_id: string;
        customer_name: string | null;
        shop_id: string | null;
        rider_id: string | null;
        status: string;
        payment_method: string;
        payment_status: string;
        subtotal: number;
        delivery_fee: number;
        discount: number;
        total: number;
        created_at: string;
      }>((from, to) =>
        client
          .from("orders")
          .select(
            "id,order_code,customer_id,customer_name,shop_id,rider_id,status,payment_method,payment_status,subtotal,delivery_fee,discount,total,created_at",
          )
          .gte("created_at", startIso)
          .lt("created_at", endIso)
          .order("created_at", { ascending: true })
          .range(from, to),
      ),
      fetchAll<{
        order_id: string;
        product_id: string | null;
        product_name: string;
        unit_price: number;
        quantity: number;
      }>((from, to) =>
        client
          .from("order_items")
          .select("order_id,product_id,product_name,unit_price,quantity")
          .gte("created_at", startIso)
          .lt("created_at", endIso)
          .order("created_at", { ascending: true })
          .range(from, to),
      ),
      fetchAll<{
        id: string;
        order_id: string;
        method: string;
        amount: number | null;
        status: string;
        created_at: string;
      }>((from, to) =>
        client
          .from("payment_proofs")
          .select("id,order_id,method,amount,status,created_at")
          .gte("created_at", startIso)
          .lt("created_at", endIso)
          .order("created_at", { ascending: true })
          .range(from, to),
      ),
      fetchAll<{ id: string; is_approved: boolean }>((from, to) =>
        client.from("riders").select("id,is_approved").range(from, to),
      ),
      fetchAll<{ id: string; full_name: string; created_at: string }>((from, to) =>
        client.from("profiles").select("id,full_name,created_at").range(from, to),
      ),
      fetchAll<{ id: string; name: string }>((from, to) =>
        client.from("shops").select("id,name").range(from, to),
      ),
      fetchAll<{ id: string; name: string; shop_id: string }>((from, to) =>
        client.from("products").select("id,name,shop_id").range(from, to),
      ),
    ],
  );

  const orderById = new Map(orders.map((o) => [o.id, o]));
  const shopName = new Map(shops.map((s) => [s.id, s.name]));
  const productById = new Map(products.map((p) => [p.id, p]));
  const riderName = new Map(riderRows.map((r) => [r.id, r.id]));

  // Rider display names come from profiles (riders have no name column).
  const profileById = new Map(profileRows.map((p) => [p.id, p]));
  const riderDisplayName = (riderId: string) =>
    profileById.get(riderId)?.full_name?.trim() || "Unnamed rider";

  const completedOrders = orders.filter((o) => o.status === "delivered");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");
  const pendingOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");

  // Sales recognise delivered orders only; that is the platform's definition of
  // realised revenue (mirrors the admin dashboard and merchant portal).
  const grossSales = round2(completedOrders.reduce((s, o) => s + num(o.total), 0));
  const deliveryFees = round2(completedOrders.reduce((s, o) => s + num(o.delivery_fee), 0));
  const discounts = round2(completedOrders.reduce((s, o) => s + num(o.discount), 0));
  const refunds = round2(
    orders.filter((o) => o.payment_status === "refunded").reduce((s, o) => s + num(o.total), 0),
  );

  const paymentMethodIds = new Set<string>(PAYMENT_METHODS.map((m) => m.id));
  const extraMethods = new Set<string>();
  for (const o of orders) if (o.payment_method) extraMethods.add(o.payment_method);
  for (const p of payments) if (p.method) extraMethods.add(p.method);
  const methods = [
    ...PAYMENT_METHODS.map((m) => m.id),
    ...[...extraMethods].filter((m) => !paymentMethodIds.has(m)).sort(),
  ];

  const paymentsByMethod: PaymentMethodRow[] = methods.map((method) => {
    const methodOrders = orders.filter((o) => o.payment_method === method);
    const methodProofs = payments.filter((p) => p.method === method);
    const proofsAmount = methodProofs.reduce((s, p) => s + num(p.amount), 0);
    // Prefer recorded proof amounts; fall back to order totals when a method
    // (e.g. cash) has no receipt rows.
    const amount =
      methodProofs.length > 0 ? proofsAmount : methodOrders.reduce((s, o) => s + num(o.total), 0);
    const orderStatuses = methodOrders.map((o) => o.payment_status);
    const proofStatuses = methodProofs.map((p) => p.status);
    const statuses = [...orderStatuses, ...proofStatuses];
    return {
      method,
      label: paymentMethodLabel(method),
      transactions: methodOrders.length + methodProofs.length,
      amount: round2(amount),
      successful: statuses.filter((s) => SUCCESSFUL_PAYMENT_STATUSES.includes(s)).length,
      pending: statuses.filter((s) => PENDING_PAYMENT_STATUSES.includes(s)).length,
      failed: statuses.filter((s) => FAILED_PAYMENT_STATUSES.includes(s)).length,
    };
  });

  const totalPayments = round2(paymentsByMethod.reduce((s, m) => s + m.amount, 0));

  // Customers: profiles joined to their order history. A customer is "new" when
  // the profile was created inside the period, otherwise "returning" once they
  // have at least one order in the period.
  const ordersByCustomer = new Map<string, typeof orders>();
  for (const o of orders) {
    const list = ordersByCustomer.get(o.customer_id);
    if (list) list.push(o);
    else ordersByCustomer.set(o.customer_id, [o]);
  }
  const customerIdsInPeriod = new Set(orders.map((o) => o.customer_id));
  const newCustomers = profileRows.filter(
    (p) => p.created_at >= startIso && p.created_at < endIso,
  ).length;
  const returningCustomers = [...customerIdsInPeriod].filter((id) => {
    const profile = profileById.get(id);
    return !profile || profile.created_at < startIso;
  }).length;

  const customers: CustomerSection = {
    totalCustomers: profileRows.length,
    newCustomers,
    returningCustomers,
    totalOrders: orders.length,
    totalSpending: grossSales,
  };

  const sales = buildSalesSection(period, completedOrders);

  const reportOrders: ReportOrderRow[] = orders
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map((o) => ({
      id: o.id,
      orderCode: o.order_code,
      createdAt: o.created_at,
      customer: o.customer_name?.trim() || "Customer",
      shop: o.shop_id ? (shopName.get(o.shop_id) ?? "—") : "—",
      total: num(o.total),
      paymentMethodId: o.payment_method,
      paymentMethod: paymentMethodLabel(o.payment_method),
      paymentStatus: o.payment_status,
      status: o.status,
      deliveryStatus: deliveryStatusLabel(o.status),
      rider: o.rider_id ? riderDisplayName(o.rider_id) : "—",
    }));

  const shopsReport: ShopReportRow[] = shops
    .map((shop) => {
      const shopOrders = orders.filter((o) => o.shop_id === shop.id);
      const done = shopOrders.filter((o) => o.status === "delivered");
      const salesValue = round2(done.reduce((s, o) => s + num(o.total), 0));
      return {
        shopId: shop.id,
        name: shop.name,
        orders: shopOrders.length,
        sales: salesValue,
        avgOrderValue: done.length ? round2(salesValue / done.length) : 0,
        completed: done.length,
        cancelled: shopOrders.filter((o) => o.status === "cancelled").length,
        deliveryFees: round2(done.reduce((s, o) => s + num(o.delivery_fee), 0)),
      };
    })
    .sort((a, b) => b.sales - a.sales || b.orders - a.orders);

  const productAgg = new Map<string, ProductReportRow>();
  for (const item of orderItems) {
    const order = orderById.get(item.order_id);
    // Only count items whose parent order was actually delivered.
    if (!order || order.status !== "delivered") continue;
    const key = item.product_id ?? `name:${item.product_name}`;
    const catalog = item.product_id ? productById.get(item.product_id) : undefined;
    const existing = productAgg.get(key);
    const revenue = num(item.unit_price) * num(item.quantity);
    if (existing) {
      existing.unitsSold += num(item.quantity);
      existing.revenue = round2(existing.revenue + revenue);
      existing.orders += 1;
    } else {
      productAgg.set(key, {
        productId: item.product_id,
        name: catalog?.name ?? item.product_name,
        shop: catalog
          ? (shopName.get(catalog.shop_id) ?? "—")
          : order.shop_id
            ? (shopName.get(order.shop_id) ?? "—")
            : "—",
        unitsSold: num(item.quantity),
        revenue: round2(revenue),
        orders: 1,
      });
    }
  }
  const productsReport = [...productAgg.values()].sort(
    (a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold,
  );

  const ridersReport: RiderReportRow[] = riderRows
    .map((rider) => {
      const assigned = orders.filter((o) => o.rider_id === rider.id);
      const done = assigned.filter((o) => o.status === "delivered");
      const cancelled = assigned.filter((o) => o.status === "cancelled");
      const settled = done.length + cancelled.length;
      return {
        riderId: rider.id,
        name: riderDisplayName(rider.id),
        assigned: assigned.length,
        completed: done.length,
        cancelled: cancelled.length,
        completionRate: settled ? Math.round((done.length / settled) * 1000) / 10 : 0,
      };
    })
    .filter((r) => r.assigned > 0 || riderName.has(r.riderId))
    .sort((a, b) => b.completed - a.completed || b.assigned - a.assigned);

  const summary: SummaryMetrics = {
    totalOrders: orders.length,
    completedOrders: completedOrders.length,
    pendingOrders: pendingOrders.length,
    cancelledOrders: cancelledOrders.length,
    totalSales: grossSales,
    deliveryFees,
    totalPayments,
    refunds,
    netRevenue: round2(grossSales - refunds),
    newCustomers,
    activeCustomers: customerIdsInPeriod.size,
    shops: shops.length,
    products: products.length,
    riderOrders: orders.filter((o) => o.rider_id).length,
  };

  return {
    period,
    generatedAt: new Date().toISOString(),
    generatedBy: input.generatedBy?.trim() || null,
    summary,
    sales,
    orders: reportOrders,
    payments: paymentsByMethod,
    shops: shopsReport,
    products: productsReport,
    customers,
    riders: ridersReport,
  };
}

function buildSalesSection(
  period: ReportPeriod,
  completedOrders: { total: number; delivery_fee: number; discount: number; created_at: string }[],
): SalesSection {
  const { granularity, buckets } = buildBuckets(period);
  const points: SalesPoint[] = buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    orders: 0,
    gross: 0,
    deliveryFees: 0,
    discounts: 0,
    refunds: 0,
    net: 0,
  }));

  for (const order of completedOrders) {
    const ms = new Date(order.created_at).getTime();
    const bucket = buckets.find((b) => ms >= b.startMs && ms < b.endMs);
    if (!bucket) continue;
    const point = points.find((p) => p.key === bucket.key);
    if (!point) continue;
    point.orders += 1;
    point.gross = round2(point.gross + num(order.total));
    point.deliveryFees = round2(point.deliveryFees + num(order.delivery_fee));
    point.discounts = round2(point.discounts + num(order.discount));
  }

  for (const point of points) point.net = round2(point.gross - point.refunds);

  const totals = points.reduce(
    (acc, p) => {
      acc.gross = round2(acc.gross + p.gross);
      acc.deliveryFees = round2(acc.deliveryFees + p.deliveryFees);
      acc.discounts = round2(acc.discounts + p.discounts);
      acc.refunds = round2(acc.refunds + p.refunds);
      acc.net = round2(acc.net + p.net);
      acc.orders += p.orders;
      return acc;
    },
    { gross: 0, deliveryFees: 0, discounts: 0, refunds: 0, net: 0, orders: 0, avgOrderValue: 0 },
  );
  totals.avgOrderValue = totals.orders ? round2(totals.gross / totals.orders) : 0;

  return { granularity, points, totals };
}
