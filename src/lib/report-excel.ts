/**
 * Excel export for the Reports system.
 *
 * Renders a professional multi-sheet workbook from the same `ReportPayload`
 * the dashboard uses, so exported figures always match the on-screen report.
 * Runs on the server (Node) where exceljs is available.
 */
import ExcelJS from "exceljs";
import {
  deliveryStatusBucket,
  formatReportDateTimeLocalized,
  periodRangeLabel,
  reportFileName,
  type ReportPayload,
} from "@/lib/reports";
import { REPORT_COPY, fill, type ReportCopy } from "@/lib/report-copy";
import type { Language } from "@/lib/i18n";
import type { ExportResult } from "@/lib/reports.functions";

const MONEY_FMT = "#,##0.00";
const DATE_FMT = "dd mmm yyyy hh:mm";
const HEADER_FILL = "FF0F5132";
const TOTAL_FILL = "FFE7F0EA";
const BORDER = { style: "thin" as const, color: { argb: "FFD9E2DC" } };

const currency = (value: number) => Number(value ?? 0);

function styleHeader(sheet: ExcelJS.Worksheet, columns: number, rowNumber = 1) {
  const row = sheet.getRow(rowNumber);
  for (let i = 1; i <= columns; i++) {
    const cell = row.getCell(i);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
  }
  row.height = 20;
  sheet.views = [{ state: "frozen", ySplit: rowNumber }];
}

function addTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string) {
  sheet.mergeCells("A1:D1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF0F5132" } };
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").font = { size: 10, color: { argb: "FF6B7280" } };
  sheet.getRow(1).height = 22;
}

function addTotalRow(sheet: ExcelJS.Worksheet, label: string, totals: Record<number, number>) {
  const row = sheet.addRow([label]);
  for (const [colIndex, value] of Object.entries(totals)) {
    row.getCell(Number(colIndex)).value = currency(value);
    row.getCell(Number(colIndex)).numFmt = MONEY_FMT;
  }
  row.font = { bold: true };
  for (let i = 1; i <= sheet.columnCount; i++) {
    row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
    row.getCell(i).border = { top: BORDER, bottom: BORDER };
  }
}

export async function buildReportWorkbook(
  payload: ReportPayload,
  language: Language = "en",
): Promise<ExportResult> {
  const c: ReportCopy = REPORT_COPY[language] ?? REPORT_COPY.en;
  const wb = new ExcelJS.Workbook();
  wb.creator = "የኔ Go Admin";
  wb.created = new Date(payload.generatedAt);
  const periodLabel = periodRangeLabel(payload.period, c);

  // ---- Summary -----------------------------------------------------------
  const summary = wb.addWorksheet(c.sheetSummary);
  addTitle(
    summary,
    fill(c.exTitle, { brand: "የኔ Go" }),
    fill(c.exSubtitle, { period: periodLabel }),
  );
  summary.addRow([]);
  const metaRows: [string, string][] = [
    [c.platform, "የኔ Go"],
    [c.reportPeriod, periodLabel],
    [c.generatedAtLabel, formatReportDateTimeLocalized(payload.generatedAt, c)],
    [c.generatedBy, payload.generatedBy ?? "—"],
  ];
  for (const [label, value] of metaRows) {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  }
  summary.addRow([]);
  summary.addRow([c.metric, c.value]).font = { bold: true };
  const summaryStart = summary.rowCount;
  const metrics: [string, number | string, boolean][] = [
    [c.statTotalOrders, payload.summary.totalOrders, false],
    [c.statCompleted, payload.summary.completedOrders, false],
    [c.statPending, payload.summary.pendingOrders, false],
    [c.statCancelled, payload.summary.cancelledOrders, false],
    [`${c.statTotalSales} (ETB)`, payload.summary.totalSales, true],
    [`${c.statDeliveryFees} (ETB)`, payload.summary.deliveryFees, true],
    [`${c.statTotalPayments} (ETB)`, payload.summary.totalPayments, true],
    [`${c.statRefunds} (ETB)`, payload.summary.refunds, true],
    [`${c.statNetRevenue} (ETB)`, payload.summary.netRevenue, true],
    [c.statNewCustomers, payload.summary.newCustomers, false],
    [c.statActiveCustomers, payload.summary.activeCustomers, false],
    [c.sheetShops, payload.summary.shops, false],
    [c.sheetProducts, payload.summary.products, false],
    [c.statRiderOrders, payload.summary.riderOrders, false],
  ];
  for (const [label, value, isMoney] of metrics) {
    const row = summary.addRow([label, value]);
    if (isMoney) row.getCell(2).numFmt = MONEY_FMT;
  }
  styleHeader(summary, 2, summaryStart);
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 24;

  // ---- Orders ------------------------------------------------------------
  const orders = wb.addWorksheet(c.sheetOrders);
  orders.columns = [
    { header: c.colOrder, key: "orderCode", width: 16 },
    { header: c.colDate, key: "createdAt", width: 20 },
    { header: c.colCustomer, key: "customer", width: 22 },
    { header: c.colShop, key: "shop", width: 24 },
    { header: `${c.colTotal} (ETB)`, key: "total", width: 14 },
    { header: c.colPayment, key: "paymentMethod", width: 18 },
    { header: `${c.colPayment} · ${c.colStatus}`, key: "paymentStatus", width: 18 },
    { header: c.colStatus, key: "status", width: 16 },
    { header: c.colDeliveryStage, key: "deliveryStatus", width: 16 },
    { header: c.colRider, key: "rider", width: 20 },
  ];
  for (const o of payload.orders) {
    const row = orders.addRow({
      orderCode: o.orderCode,
      createdAt: new Date(o.createdAt),
      customer: o.customer,
      shop: o.shop,
      total: currency(o.total),
      paymentMethod: c.paymentMethod[o.paymentMethodId] ?? o.paymentMethod,
      paymentStatus: c.paymentStatus[o.paymentStatus] ?? o.paymentStatus.replace(/_/g, " "),
      status: c.orderStatus[o.status] ?? o.status,
      deliveryStatus: c.deliveryStatus[deliveryStatusBucket(o.status)] ?? o.status,
      rider: o.rider,
    });
    row.getCell("createdAt").numFmt = DATE_FMT;
    row.getCell("total").numFmt = MONEY_FMT;
  }
  styleHeader(orders, 10);
  addTotalRow(orders, c.total, { 5: payload.orders.reduce((s, o) => s + o.total, 0) });

  // ---- Sales -------------------------------------------------------------
  const sales = wb.addWorksheet(c.sheetSales);
  sales.columns = [
    { header: c.colPeriod, key: "label", width: 18 },
    { header: c.colOrders, key: "orders", width: 12 },
    { header: `${c.colGross} (ETB)`, key: "gross", width: 18 },
    { header: `${c.colDeliveryFees} (ETB)`, key: "deliveryFees", width: 20 },
    { header: `${c.colDiscounts} (ETB)`, key: "discounts", width: 16 },
    { header: `${c.statRefunds} (ETB)`, key: "refunds", width: 14 },
    { header: `${c.colNet} (ETB)`, key: "net", width: 18 },
  ];
  for (const point of payload.sales.points) {
    const row = sales.addRow({
      label: point.label,
      orders: point.orders,
      gross: currency(point.gross),
      deliveryFees: currency(point.deliveryFees),
      discounts: currency(point.discounts),
      refunds: currency(point.refunds),
      net: currency(point.net),
    });
    for (const col of ["gross", "deliveryFees", "discounts", "refunds", "net"]) {
      row.getCell(col).numFmt = MONEY_FMT;
    }
  }
  styleHeader(sales, 7);
  const salesTotals = payload.sales.totals;
  addTotalRow(sales, c.total, {
    2: salesTotals.orders,
    3: salesTotals.gross,
    4: salesTotals.deliveryFees,
    5: salesTotals.discounts,
    6: salesTotals.refunds,
    7: salesTotals.net,
  });
  sales.addRow([]);
  sales.addRow([c.exAvgOrderValue, salesTotals.avgOrderValue]).getCell(2).numFmt = MONEY_FMT;

  // ---- Payments ----------------------------------------------------------
  const payments = wb.addWorksheet(c.sheetPayments);
  payments.columns = [
    { header: c.colMethod, key: "label", width: 22 },
    { header: c.colTransactions, key: "transactions", width: 14 },
    { header: `${c.colAmount} (ETB)`, key: "amount", width: 20 },
    { header: c.colSuccessful, key: "successful", width: 13 },
    { header: c.colPending, key: "pending", width: 12 },
    { header: c.colFailed, key: "failed", width: 12 },
  ];
  for (const p of payload.payments) {
    const row = payments.addRow({ ...p, amount: currency(p.amount) });
    row.getCell("amount").numFmt = MONEY_FMT;
  }
  styleHeader(payments, 6);
  addTotalRow(payments, c.total, {
    2: payload.payments.reduce((s, p) => s + p.transactions, 0),
    3: payload.payments.reduce((s, p) => s + p.amount, 0),
  });

  // ---- Shops -------------------------------------------------------------
  const shops = wb.addWorksheet(c.sheetShops);
  shops.columns = [
    { header: c.colShop, key: "name", width: 28 },
    { header: c.colOrders, key: "orders", width: 12 },
    { header: `${c.colSales} (ETB)`, key: "sales", width: 16 },
    { header: `${c.colAvgOrder} (ETB)`, key: "avgOrderValue", width: 20 },
    { header: c.colCompleted, key: "completed", width: 12 },
    { header: c.colCancelled, key: "cancelled", width: 12 },
  ];
  for (const s of payload.shops) {
    const row = shops.addRow({
      ...s,
      sales: currency(s.sales),
      avgOrderValue: currency(s.avgOrderValue),
    });
    row.getCell("sales").numFmt = MONEY_FMT;
    row.getCell("avgOrderValue").numFmt = MONEY_FMT;
  }
  styleHeader(shops, 6);
  addTotalRow(shops, c.total, {
    2: payload.shops.reduce((s, r) => s + r.orders, 0),
    3: payload.shops.reduce((s, r) => s + r.sales, 0),
  });

  // ---- Products ----------------------------------------------------------
  const products = wb.addWorksheet(c.sheetProducts);
  products.columns = [
    { header: c.colProduct, key: "name", width: 30 },
    { header: c.colShop, key: "shop", width: 26 },
    { header: c.colUnitsSold, key: "unitsSold", width: 12 },
    { header: `${c.colRevenue} (ETB)`, key: "revenue", width: 16 },
    { header: c.colOrders, key: "orders", width: 12 },
  ];
  for (const p of payload.products) {
    const row = products.addRow({ ...p, revenue: currency(p.revenue) });
    row.getCell("revenue").numFmt = MONEY_FMT;
  }
  styleHeader(products, 5);
  addTotalRow(products, c.total, {
    3: payload.products.reduce((s, p) => s + p.unitsSold, 0),
    4: payload.products.reduce((s, p) => s + p.revenue, 0),
  });

  // ---- Customers ---------------------------------------------------------
  const customers = wb.addWorksheet(c.sheetCustomers);
  customers.columns = [
    { header: c.metric, key: "metric", width: 30 },
    { header: c.value, key: "value", width: 18 },
  ];
  const customerRows: [string, number, boolean][] = [
    [c.custTotal, payload.customers.totalCustomers, false],
    [c.custNew, payload.customers.newCustomers, false],
    [c.custReturning, payload.customers.returningCustomers, false],
    [c.custOrders, payload.customers.totalOrders, false],
    [`${c.custSpending} (ETB)`, payload.customers.totalSpending, true],
  ];
  for (const [metric, value, isMoney] of customerRows) {
    const row = customers.addRow({ metric, value });
    if (isMoney) row.getCell("value").numFmt = MONEY_FMT;
  }
  styleHeader(customers, 2);

  // ---- Riders ------------------------------------------------------------
  const riders = wb.addWorksheet(c.sheetRiders);
  riders.columns = [
    { header: c.colRider, key: "name", width: 24 },
    { header: c.colAssigned, key: "assigned", width: 16 },
    { header: c.colCompleted, key: "completed", width: 20 },
    { header: c.colCancelled, key: "cancelled", width: 20 },
    { header: `${c.colCompletionRate} (%)`, key: "completionRate", width: 18 },
  ];
  for (const r of payload.riders) {
    riders.addRow({ ...r });
  }
  styleHeader(riders, 5);
  addTotalRow(riders, c.total, {
    2: payload.riders.reduce((s, r) => s + r.assigned, 0),
    3: payload.riders.reduce((s, r) => s + r.completed, 0),
    4: payload.riders.reduce((s, r) => s + r.cancelled, 0),
  });

  const buffer = await wb.xlsx.writeBuffer();
  return {
    filename: reportFileName(payload.period, "xlsx"),
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    base64: Buffer.from(buffer).toString("base64"),
  };
}
