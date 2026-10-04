/**
 * Admin Reports dashboard.
 *
 * Everything on screen is rendered from a single server-generated
 * `ReportPayload`, and the Excel/PDF exports are built from that same payload
 * server-side — so the dashboard and the exported files always agree.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  AlertCircle,
  ArrowDownRight,
  Banknote,
  Bike,
  CalendarRange,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  formatReportDateTime,
  money,
  orderStatuses,
  periodRangeLabel,
  RANGE_PRESETS,
  resolvePeriod,
  statusLabel,
  toLocalDateString,
  type ReportExportKind,
  type ReportOrderRow,
  type ReportPayload,
  type ReportRangeKey,
  type ReportRequest,
} from "@/lib/reports";
import { exportReportFn, generateReportFn, reportHistoryFn } from "@/lib/reports.functions";

type Draft = { range: ReportRangeKey; start: string; end: string };

const ORDERS_PAGE_SIZE = 25;

export function ReportsAdmin() {
  const { user, profile, isAdmin } = useAuth();
  const today = toLocalDateString(Date.now());

  const [draft, setDraft] = useState<Draft>({ range: "today", start: today, end: today });
  const [applied, setApplied] = useState<ReportRequest & { record?: boolean; nonce: number }>({
    range: "today",
    record: false,
    nonce: 0,
  });
  const [exporting, setExporting] = useState<ReportExportKind | null>(null);

  const {
    data: report,
    isFetching,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "admin-report",
      applied.range,
      applied.start ?? "",
      applied.end ?? "",
      applied.nonce,
    ],
    enabled: isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await generateReportFn({ data: applied });
      return res as ReportPayload;
    },
  });

  const generate = () => {
    if (draft.range === "custom") {
      if (!draft.start || !draft.end) {
        toast.error("Select both a start and an end date.");
        return;
      }
      const resolved = resolvePeriod({ range: "custom", start: draft.start, end: draft.end });
      if ("error" in resolved) {
        toast.error(resolved.error);
        return;
      }
    }
    setApplied((prev) => ({ ...draft, record: true, nonce: prev.nonce + 1 }));
  };

  const runExport = async (kind: "excel" | "pdf") => {
    if (!report) return;
    setExporting(kind);
    try {
      const result = await exportReportFn({
        data: {
          range: applied.range,
          ...(applied.start ? { start: applied.start } : {}),
          ...(applied.end ? { end: applied.end } : {}),
          kind,
        },
      });
      const binary = atob(result.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: result.mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`${kind === "excel" ? "Excel" : "PDF"} report downloaded`);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : `Could not export the ${kind === "excel" ? "Excel" : "PDF"} report.`,
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Business analytics and exports generated from live platform data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void runExport("excel")}
            disabled={!report || exporting !== null}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "excel" ? "Building…" : "Export Excel"}
          </Button>
          <Button
            variant="outline"
            onClick={() => void runExport("pdf")}
            disabled={!report || exporting !== null}
          >
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? "Building…" : "Export PDF"}
          </Button>
        </div>
      </header>

      <ReportFilters
        draft={draft}
        setDraft={setDraft}
        onGenerate={generate}
        busy={isFetching}
        periodLabel={report ? periodRangeLabel(report.period) : null}
        generatedAt={report?.generatedAt ?? null}
        generatedBy={report?.generatedBy ?? profile?.full_name ?? null}
        onRefresh={() => void refetch()}
      />

      {isLoading ? (
        <ReportSkeleton />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Could not generate the report."}
          onRetry={() => void refetch()}
        />
      ) : report ? (
        <ReportBody report={report} onExport={runExport} exporting={exporting} />
      ) : null}

      {isAdmin && user && <ReportHistory />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function ReportFilters({
  draft,
  setDraft,
  onGenerate,
  busy,
  periodLabel,
  generatedAt,
  generatedBy,
  onRefresh,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onGenerate: () => void;
  busy: boolean;
  periodLabel: string | null;
  generatedAt: string | null;
  generatedBy: string | null;
  onRefresh: () => void;
}) {
  const customInvalid =
    draft.range === "custom" && draft.start !== "" && draft.end !== "" && draft.start > draft.end;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-range">Reporting period</Label>
            <Select
              value={draft.range}
              onValueChange={(v) => setDraft({ ...draft, range: v as ReportRangeKey })}
            >
              <SelectTrigger id="report-range">
                <SelectValue placeholder="Choose a period" />
              </SelectTrigger>
              <SelectContent>
                {RANGE_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-start">Start date</Label>
            <Input
              id="report-start"
              type="date"
              value={draft.start}
              max={draft.end || undefined}
              disabled={draft.range !== "custom"}
              onChange={(e) => setDraft({ ...draft, start: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-end">End date</Label>
            <Input
              id="report-end"
              type="date"
              value={draft.end}
              min={draft.start || undefined}
              disabled={draft.range !== "custom"}
              onChange={(e) => setDraft({ ...draft, end: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onGenerate}
            disabled={busy || customInvalid}
            className="w-full sm:w-auto"
          >
            <CalendarRange className="h-4 w-4" />
            {busy ? "Generating…" : "Generate Report"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh report"
            onClick={onRefresh}
            disabled={busy}
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {draft.range === "custom" && (
        <p
          className={`mt-3 text-xs ${customInvalid ? "text-destructive" : "text-muted-foreground"}`}
        >
          {customInvalid
            ? "Start date cannot be after end date."
            : "Pick any start and end date, then generate the report."}
        </p>
      )}

      {periodLabel && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{periodLabel}</span>
          {generatedAt && <span>Generated {formatReportDateTime(generatedAt)}</span>}
          <span>By {generatedBy ?? "—"}</span>
          <span>Timezone: Africa/Addis_Ababa</span>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Report body
// ---------------------------------------------------------------------------

function ReportBody({
  report,
  onExport,
  exporting,
}: {
  report: ReportPayload;
  onExport: (kind: "excel" | "pdf") => void;
  exporting: ReportExportKind | null;
}) {
  const hasData = report.summary.totalOrders > 0;

  return (
    <div className="space-y-6">
      <SummaryGrid report={report} />

      {!hasData && (
        <EmptyState
          title="No orders in this period"
          body="There is no activity for the selected dates. Choose a different period to see sales, payments and performance data."
        />
      )}

      {hasData && <ChartsSection report={report} />}

      <Tabs defaultValue="sales" className="space-y-4">
        <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max min-w-full justify-start gap-1">
            <TabsTrigger value="sales" className="min-h-9">
              Sales
            </TabsTrigger>
            <TabsTrigger value="orders" className="min-h-9">
              Orders
            </TabsTrigger>
            <TabsTrigger value="payments" className="min-h-9">
              Payments
            </TabsTrigger>
            <TabsTrigger value="shops" className="min-h-9">
              Shops
            </TabsTrigger>
            <TabsTrigger value="products" className="min-h-9">
              Products
            </TabsTrigger>
            <TabsTrigger value="customers" className="min-h-9">
              Customers
            </TabsTrigger>
            <TabsTrigger value="riders" className="min-h-9">
              Riders
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="sales">
          <SalesTab report={report} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab report={report} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab report={report} />
        </TabsContent>
        <TabsContent value="shops">
          <ShopsTab report={report} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab report={report} />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersTab report={report} />
        </TabsContent>
        <TabsContent value="riders">
          <RidersTab report={report} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => onExport("excel")} disabled={exporting !== null}>
          <Download className="h-4 w-4" />
          {exporting === "excel" ? "Building…" : "Export Excel"}
        </Button>
        <Button variant="outline" onClick={() => onExport("pdf")} disabled={exporting !== null}>
          <Download className="h-4 w-4" />
          {exporting === "pdf" ? "Building…" : "Export PDF"}
        </Button>
      </div>
    </div>
  );
}

function SummaryGrid({ report }: { report: ReportPayload }) {
  const s = report.summary;
  const cards: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    tone?: string;
  }[] = [
    { label: "Total Orders", value: s.totalOrders.toLocaleString(), icon: ShoppingBag },
    {
      label: "Completed Orders",
      value: s.completedOrders.toLocaleString(),
      icon: CheckCircle2,
      tone: "text-primary",
    },
    {
      label: "Pending Orders",
      value: s.pendingOrders.toLocaleString(),
      icon: Clock,
      tone: "text-warning",
    },
    {
      label: "Cancelled Orders",
      value: s.cancelledOrders.toLocaleString(),
      icon: XCircle,
      tone: "text-destructive",
    },
    { label: "Total Sales", value: money(s.totalSales), icon: TrendingUp },
    { label: "Delivery Fees", value: money(s.deliveryFees), icon: Bike },
    { label: "Total Payments", value: money(s.totalPayments), icon: Wallet },
    { label: "Refunds", value: money(s.refunds), icon: ArrowDownRight },
    { label: "Net Revenue", value: money(s.netRevenue), icon: Banknote },
    { label: "New Customers", value: s.newCustomers.toLocaleString(), icon: Users },
    { label: "Active Customers", value: s.activeCustomers.toLocaleString(), icon: Users },
    { label: "Shops", value: s.shops.toLocaleString(), icon: Store },
    { label: "Products", value: s.products.toLocaleString(), icon: Package },
    { label: "Rider Orders", value: s.riderOrders.toLocaleString(), icon: Bike },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <c.icon className={`h-3.5 w-3.5 ${c.tone ?? ""}`} />
            <p className="text-[11px] font-semibold uppercase tracking-wide">{c.label}</p>
          </div>
          <p className="mt-2 font-display text-lg font-extrabold tabular-nums sm:text-xl">
            {c.value}
          </p>
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

const CHART_COLORS = ["#059669", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#6366f1"];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-3">
        <h3 className="font-display text-sm font-bold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="h-60 w-full">{children}</div>
    </div>
  );
}

function ChartsSection({ report }: { report: ReportPayload }) {
  const salesData = report.sales.points.map((p) => ({
    label: p.label,
    gross: p.gross,
    net: p.net,
    orders: p.orders,
  }));

  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of report.orders) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
    return [...counts.entries()]
      .map(([status, value]) => ({ name: statusLabel(status), value }))
      .sort((a, b) => b.value - a.value);
  }, [report.orders]);

  const paymentData = report.payments
    .filter((p) => p.transactions > 0 || p.amount > 0)
    .map((p) => ({ name: p.label, amount: p.amount, transactions: p.transactions }));

  const topShops = report.shops.slice(0, 8).map((s) => ({ name: s.name, sales: s.sales }));
  const topProducts = report.products
    .slice(0, 8)
    .map((p) => ({ name: p.name, revenue: p.revenue }));

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Sales over time" subtitle={`Gross vs net by ${report.sales.granularity}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} width={64} />
            <Tooltip formatter={(v: number) => money(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="gross"
              name="Gross"
              stroke="#059669"
              fill="url(#grossFill)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="#0ea5e9"
              fill="transparent"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Orders over time" subtitle="Order volume per bucket">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="orders"
              name="Orders"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Orders by status" subtitle="All statuses recorded in the period">
        {statusData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={2}
              >
                {statusData.map((entry, i) => (
                  <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>

      <ChartCard title="Payment methods" subtitle="Amount collected per method">
        {paymentData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paymentData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-12}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 11 }} width={64} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="amount" name="Amount" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>

      <ChartCard title="Top shops" subtitle="By delivered sales">
        {topShops.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topShops}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="sales" name="Sales" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>

      <ChartCard title="Top products" subtitle="By revenue">
        {topProducts.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topProducts}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>
    </section>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No data for this period
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function TableShell({
  children,
  minWidth = "min-w-[720px]",
}: {
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
      <table className={`w-full ${minWidth} text-sm`}>{children}</table>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 ${align === "right" ? "text-right tabular-nums" : ""} ${className}`}>
      {children}
    </td>
  );
}

function NoRows({ span, label }: { span: number; label: string }) {
  return (
    <tr>
      <td colSpan={span} className="px-4 py-10 text-center text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

function SalesTab({ report }: { report: ReportPayload }) {
  const t = report.sales.totals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["Gross sales", money(t.gross)],
          ["Delivery fees", money(t.deliveryFees)],
          ["Discounts", money(t.discounts)],
          ["Refunds", money(t.refunds)],
          ["Net sales", money(t.net)],
          ["Orders", t.orders.toLocaleString()],
          ["Avg order value", money(t.avgOrderValue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 font-display text-base font-extrabold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <TableShell minWidth="min-w-[760px]">
        <thead>
          <tr className="border-b border-border">
            <Th>Period</Th>
            <Th align="right">Orders</Th>
            <Th align="right">Gross</Th>
            <Th align="right">Delivery fees</Th>
            <Th align="right">Discounts</Th>
            <Th align="right">Net</Th>
          </tr>
        </thead>
        <tbody>
          {report.sales.points.map((p) => (
            <tr key={p.key} className="border-b border-border last:border-0">
              <Td className="font-medium">{p.label}</Td>
              <Td align="right">{p.orders}</Td>
              <Td align="right">{money(p.gross)}</Td>
              <Td align="right">{money(p.deliveryFees)}</Td>
              <Td align="right">{money(p.discounts)}</Td>
              <Td align="right" className="font-semibold">
                {money(p.net)}
              </Td>
            </tr>
          ))}
          <tr className="border-t-2 border-border bg-secondary/50 font-semibold">
            <Td>Total</Td>
            <Td align="right">{t.orders}</Td>
            <Td align="right">{money(t.gross)}</Td>
            <Td align="right">{money(t.deliveryFees)}</Td>
            <Td align="right">{money(t.discounts)}</Td>
            <Td align="right">{money(t.net)}</Td>
          </tr>
        </tbody>
      </TableShell>
    </div>
  );
}

const PAYMENT_STATUS_TONE: Record<string, string> = {
  paid: "bg-primary-soft text-accent-foreground",
  verified: "bg-primary-soft text-accent-foreground",
  unpaid: "bg-warning/20 text-warning-foreground",
  pending: "bg-warning/20 text-warning-foreground",
  pending_verification: "bg-warning/20 text-warning-foreground",
  rejected: "bg-destructive/10 text-destructive",
  refunded: "bg-destructive/10 text-destructive",
};

function OrdersTab({ report }: { report: ReportPayload }) {
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<"createdAt" | "total" | "orderCode">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = report.orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!q) return true;
      return (
        o.orderCode.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.shop.toLowerCase().includes(q) ||
        o.rider.toLowerCase().includes(q)
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return rows.slice().sort((a, b) => {
      if (sortKey === "total") return (a.total - b.total) * dir;
      if (sortKey === "orderCode") return a.orderCode.localeCompare(b.orderCode) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
  }, [report.orders, status, query, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    current * ORDERS_PAGE_SIZE,
    current * ORDERS_PAGE_SIZE + ORDERS_PAGE_SIZE,
  );

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search order, customer, shop, rider…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {orderStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length.toLocaleString()} of {report.orders.length.toLocaleString()} orders
        </span>
      </div>

      <TableShell minWidth="min-w-[980px]">
        <thead>
          <tr className="border-b border-border">
            <Th>
              <button className="uppercase" onClick={() => toggleSort("orderCode")}>
                Order ID
              </button>
            </Th>
            <Th>
              <button className="uppercase" onClick={() => toggleSort("createdAt")}>
                Date
              </button>
            </Th>
            <Th>Customer</Th>
            <Th>Shop</Th>
            <Th align="right">
              <button className="uppercase" onClick={() => toggleSort("total")}>
                Total
              </button>
            </Th>
            <Th>Payment</Th>
            <Th>Order status</Th>
            <Th>Delivery</Th>
            <Th>Rider</Th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
          {pageRows.length === 0 && <NoRows span={9} label="No orders match these filters." />}
        </tbody>
      </TableShell>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {current + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: ReportOrderRow }) {
  return (
    <tr className="border-b border-border last:border-0">
      <Td className="font-medium">{order.orderCode}</Td>
      <Td className="whitespace-nowrap text-muted-foreground">
        {formatReportDateTime(order.createdAt)}
      </Td>
      <Td>{order.customer}</Td>
      <Td>{order.shop}</Td>
      <Td align="right" className="font-semibold">
        {money(order.total)}
      </Td>
      <Td>
        <div className="flex flex-col gap-1">
          <span>{order.paymentMethod}</span>
          <span
            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              PAYMENT_STATUS_TONE[order.paymentStatus] ?? "bg-secondary text-secondary-foreground"
            }`}
          >
            {order.paymentStatus.replace(/_/g, " ")}
          </span>
        </div>
      </Td>
      <Td>{statusLabel(order.status)}</Td>
      <Td className="text-muted-foreground">{order.deliveryStatus}</Td>
      <Td>{order.rider}</Td>
    </tr>
  );
}

function PaymentsTab({ report }: { report: ReportPayload }) {
  const rows = report.payments.filter((p) => p.transactions > 0 || p.amount > 0);
  const total = rows.reduce((s, p) => s + p.amount, 0);
  return (
    <TableShell minWidth="min-w-[720px]">
      <thead>
        <tr className="border-b border-border">
          <Th>Payment method</Th>
          <Th align="right">Transactions</Th>
          <Th align="right">Total amount</Th>
          <Th align="right">Successful</Th>
          <Th align="right">Pending</Th>
          <Th align="right">Failed</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.method} className="border-b border-border last:border-0">
            <Td className="font-medium">{p.label}</Td>
            <Td align="right">{p.transactions}</Td>
            <Td align="right" className="font-semibold">
              {money(p.amount)}
            </Td>
            <Td align="right">{p.successful}</Td>
            <Td align="right">{p.pending}</Td>
            <Td align="right">{p.failed}</Td>
          </tr>
        ))}
        {rows.length === 0 && <NoRows span={6} label="No payment records for this period." />}
        {rows.length > 0 && (
          <tr className="border-t-2 border-border bg-secondary/50 font-semibold">
            <Td>Total</Td>
            <Td align="right">{rows.reduce((s, p) => s + p.transactions, 0)}</Td>
            <Td align="right">{money(total)}</Td>
            <Td align="right">{rows.reduce((s, p) => s + p.successful, 0)}</Td>
            <Td align="right">{rows.reduce((s, p) => s + p.pending, 0)}</Td>
            <Td align="right">{rows.reduce((s, p) => s + p.failed, 0)}</Td>
          </tr>
        )}
      </tbody>
    </TableShell>
  );
}

type ShopSort = "sales" | "orders" | "name";

function ShopsTab({ report }: { report: ReportPayload }) {
  const [sort, setSort] = useState<ShopSort>("sales");
  const rows = useMemo(() => {
    const list = report.shops.filter((s) => s.orders > 0);
    if (sort === "name") return list.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "orders") return list.slice().sort((a, b) => b.orders - a.orders);
    return list.slice().sort((a, b) => b.sales - a.sales);
  }, [report.shops, sort]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Sort by</Label>
        <Select value={sort} onValueChange={(v) => setSort(v as ShopSort)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Sales (high → low)</SelectItem>
            <SelectItem value="orders">Orders (high → low)</SelectItem>
            <SelectItem value="name">Shop name (A → Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <TableShell minWidth="min-w-[760px]">
        <thead>
          <tr className="border-b border-border">
            <Th>Shop</Th>
            <Th align="right">Orders</Th>
            <Th align="right">Sales</Th>
            <Th align="right">Avg order value</Th>
            <Th align="right">Completed</Th>
            <Th align="right">Cancelled</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.shopId} className="border-b border-border last:border-0">
              <Td className="font-medium">{s.name}</Td>
              <Td align="right">{s.orders}</Td>
              <Td align="right" className="font-semibold">
                {money(s.sales)}
              </Td>
              <Td align="right">{money(s.avgOrderValue)}</Td>
              <Td align="right">{s.completed}</Td>
              <Td align="right">{s.cancelled}</Td>
            </tr>
          ))}
          {rows.length === 0 && <NoRows span={6} label="No shop activity for this period." />}
        </tbody>
      </TableShell>
    </div>
  );
}

function ProductsTab({ report }: { report: ReportPayload }) {
  return (
    <TableShell minWidth="min-w-[720px]">
      <thead>
        <tr className="border-b border-border">
          <Th>Product</Th>
          <Th>Shop</Th>
          <Th align="right">Units sold</Th>
          <Th align="right">Revenue</Th>
          <Th align="right">Orders</Th>
        </tr>
      </thead>
      <tbody>
        {report.products.map((p) => (
          <tr key={p.productId ?? p.name} className="border-b border-border last:border-0">
            <Td className="font-medium">{p.name}</Td>
            <Td className="text-muted-foreground">{p.shop}</Td>
            <Td align="right">{p.unitsSold}</Td>
            <Td align="right" className="font-semibold">
              {money(p.revenue)}
            </Td>
            <Td align="right">{p.orders}</Td>
          </tr>
        ))}
        {report.products.length === 0 && (
          <NoRows span={5} label="No product sales for this period." />
        )}
      </tbody>
    </TableShell>
  );
}

function CustomersTab({ report }: { report: ReportPayload }) {
  const c = report.customers;
  const cards: [string, string][] = [
    ["Total customers", c.totalCustomers.toLocaleString()],
    ["New customers", c.newCustomers.toLocaleString()],
    ["Returning customers", c.returningCustomers.toLocaleString()],
    ["Orders in period", c.totalOrders.toLocaleString()],
    ["Total spending", money(c.totalSpending)],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 font-display text-lg font-extrabold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Customer reports aggregate order behaviour only — no private customer details are exposed.
      </p>
    </div>
  );
}

function RidersTab({ report }: { report: ReportPayload }) {
  const rows = report.riders.filter((r) => r.assigned > 0);
  return (
    <TableShell minWidth="min-w-[640px]">
      <thead>
        <tr className="border-b border-border">
          <Th>Rider</Th>
          <Th align="right">Assigned orders</Th>
          <Th align="right">Completed</Th>
          <Th align="right">Cancelled</Th>
          <Th align="right">Completion rate</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.riderId} className="border-b border-border last:border-0">
            <Td className="font-medium">{r.name}</Td>
            <Td align="right">{r.assigned}</Td>
            <Td align="right">{r.completed}</Td>
            <Td align="right">{r.cancelled}</Td>
            <Td align="right" className="font-semibold">
              {r.completionRate}%
            </Td>
          </tr>
        ))}
        {rows.length === 0 && <NoRows span={5} label="No rider activity for this period." />}
      </tbody>
    </TableShell>
  );
}

// ---------------------------------------------------------------------------
// History + states
// ---------------------------------------------------------------------------

function ReportHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-report-history"],
    queryFn: async () => reportHistoryFn({ data: { limit: 15 } }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Generated Reports</h2>
        <Skeleton className="h-24 w-full" />
      </section>
    );
  }
  if (!data?.available) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold">Generated Reports</h2>
      </div>
      {data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No reports generated yet. Generate or export a report to record it here.
        </p>
      ) : (
        <TableShell minWidth="min-w-[720px]">
          <thead>
            <tr className="border-b border-border">
              <Th>Report</Th>
              <Th>Date range</Th>
              <Th>Generated</Th>
              <Th>Generated by</Th>
              <Th>Export</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <Td className="font-medium">{item.reportType}</Td>
                <Td className="text-muted-foreground">
                  {item.startDate === item.endDate
                    ? item.startDate
                    : `${item.startDate} → ${item.endDate}`}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatReportDateTime(item.createdAt)}
                </Td>
                <Td>{item.generatedBy ?? "—"}</Td>
                <Td>
                  <Badge variant="secondary" className="capitalize">
                    {item.exportType}
                  </Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </section>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px] w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center shadow-card">
      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
      <h3 className="mt-3 font-display text-lg font-bold">Could not generate the report</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
