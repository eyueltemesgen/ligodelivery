/**
 * Admin Reports dashboard.
 *
 * Everything on screen is rendered from a single server-generated
 * `ReportPayload`, and the Excel/PDF exports are built from that same payload
 * server-side — so the dashboard and the exported files always agree.
 */
import { useEffect, useMemo, useState } from "react";
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
  Languages,
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
import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, LANGUAGE_LABELS, type Language } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import {
  formatReportDateTime,
  money,
  orderStatuses,
  periodRangeLabel,
  RANGE_PRESETS,
  resolvePeriod,
  STATUS_LABEL_KEY,
  deliveryStatusKey,
  toLocalDateString,
  type ReportExportKind,
  type ReportOrderRow,
  type ReportPayload,
  type ReportRangeKey,
  type ReportRequest,
} from "@/lib/reports";
import type { OrderStatus } from "@/lib/orders";
import {
  paymentLabelKey,
  paymentStatusLabelKey,
  paymentStatusLabel,
} from "@/components/account/OrderCard";
import { exportReportFn, generateReportFn, reportHistoryFn } from "@/lib/reports.functions";

type Draft = { range: ReportRangeKey; start: string; end: string };

const ORDERS_PAGE_SIZE = 25;

const RANGE_KEY: Record<string, TranslationKey> = {
  today: "rp_range_today",
  yesterday: "rp_range_yesterday",
  this_week: "rp_range_this_week",
  last_week: "rp_range_last_week",
  this_month: "rp_range_this_month",
  last_month: "rp_range_last_month",
  this_year: "rp_range_this_year",
  last_year: "rp_range_last_year",
  custom: "rp_range_custom",
};

const GRANULARITY_KEY: Record<string, TranslationKey> = {
  hour: "rp_gran_hour",
  day: "rp_gran_day",
  week: "rp_gran_week",
  month: "rp_gran_month",
};

export function ReportsAdmin() {
  const { t, language } = useLanguage();
  const { user, profile, isAdmin } = useAuth();
  const today = toLocalDateString(Date.now());

  // Language the report is rendered/exported in. Defaults to the UI language so
  // the report matches the dashboard, but an admin can export in another one.
  const [reportLang, setReportLang] = useState<Language>(language);
  useEffect(() => setReportLang(language), [language]);

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
      reportLang,
    ],
    enabled: isAdmin,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await generateReportFn({ data: { ...applied, language: reportLang } });
      return res as ReportPayload;
    },
  });

  const generate = () => {
    if (draft.range === "custom") {
      if (!draft.start || !draft.end) {
        toast.error(t("rp_select_dates"));
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
          language: reportLang,
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
      toast.success(t("rp_export_downloaded", { kind: kind === "excel" ? "Excel" : "PDF" }));
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : t("rp_export_failed", { kind: kind === "excel" ? "Excel" : "PDF" }),
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold">{t("rp_page_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("rp_subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="report-language" className="sr-only">
              {t("rp_language")}
            </Label>
            <Select value={reportLang} onValueChange={(v) => setReportLang(v as Language)}>
              <SelectTrigger id="report-language" className="h-7 w-[9.5rem] border-0 px-1 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => void runExport("excel")}
            disabled={!report || exporting !== null}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "excel" ? t("rp_building") : t("rp_export_excel")}
          </Button>
          <Button
            variant="outline"
            onClick={() => void runExport("pdf")}
            disabled={!report || exporting !== null}
          >
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? t("rp_building") : t("rp_export_pdf")}
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
          message={error instanceof Error ? error.message : t("rp_generate_failed")}
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
  const { t } = useLanguage();
  const customInvalid =
    draft.range === "custom" && draft.start !== "" && draft.end !== "" && draft.start > draft.end;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-range">{t("rp_period")}</Label>
            <Select
              value={draft.range}
              onValueChange={(v) => setDraft({ ...draft, range: v as ReportRangeKey })}
            >
              <SelectTrigger id="report-range">
                <SelectValue placeholder={t("rp_choose_period")} />
              </SelectTrigger>
              <SelectContent>
                {RANGE_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {t(RANGE_KEY[p.key] ?? "rp_range_custom")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-start">{t("rp_start_date")}</Label>
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
            <Label htmlFor="report-end">{t("rp_end_date")}</Label>
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
            {busy ? t("rp_generating") : t("rp_generate")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("rp_refresh")}
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
          {customInvalid ? t("rp_custom_invalid") : t("rp_custom_hint")}
        </p>
      )}

      {periodLabel && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{periodLabel}</span>
          {generatedAt && <span>{t("rp_generated", { date: formatReportDateTime(generatedAt) })}</span>}
          <span>{t("rp_by", { name: generatedBy ?? "—" })}</span>
          <span>{t("rp_timezone")}</span>
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
  const { t } = useLanguage();
  const hasData = report.summary.totalOrders > 0;

  return (
    <div className="space-y-6">
      <SummaryGrid report={report} />

      {!hasData && (
        <EmptyState title={t("rp_empty_title")} body={t("rp_empty_body")} />
      )}

      {hasData && <ChartsSection report={report} />}

      <Tabs defaultValue="sales" className="space-y-4">
        <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max min-w-full justify-start gap-1">
            <TabsTrigger value="sales" className="min-h-9">
              {t("rp_tab_sales")}
            </TabsTrigger>
            <TabsTrigger value="orders" className="min-h-9">
              {t("rp_tab_orders")}
            </TabsTrigger>
            <TabsTrigger value="payments" className="min-h-9">
              {t("rp_tab_payments")}
            </TabsTrigger>
            <TabsTrigger value="shops" className="min-h-9">
              {t("rp_tab_shops")}
            </TabsTrigger>
            <TabsTrigger value="products" className="min-h-9">
              {t("rp_tab_products")}
            </TabsTrigger>
            <TabsTrigger value="customers" className="min-h-9">
              {t("rp_tab_customers")}
            </TabsTrigger>
            <TabsTrigger value="riders" className="min-h-9">
              {t("rp_tab_riders")}
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
          {exporting === "excel" ? t("rp_building") : t("rp_export_excel")}
        </Button>
        <Button variant="outline" onClick={() => onExport("pdf")} disabled={exporting !== null}>
          <Download className="h-4 w-4" />
          {exporting === "pdf" ? t("rp_building") : t("rp_export_pdf")}
        </Button>
      </div>
    </div>
  );
}

function SummaryGrid({ report }: { report: ReportPayload }) {
  const { t } = useLanguage();
  const s = report.summary;
  const cards: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    tone?: string;
  }[] = [
    { label: t("rp_sum_total_orders"), value: s.totalOrders.toLocaleString(), icon: ShoppingBag },
    {
      label: t("rp_sum_completed_orders"),
      value: s.completedOrders.toLocaleString(),
      icon: CheckCircle2,
      tone: "text-primary",
    },
    {
      label: t("rp_sum_pending_orders"),
      value: s.pendingOrders.toLocaleString(),
      icon: Clock,
      tone: "text-warning",
    },
    {
      label: t("rp_sum_cancelled_orders"),
      value: s.cancelledOrders.toLocaleString(),
      icon: XCircle,
      tone: "text-destructive",
    },
    { label: t("rp_sum_total_sales"), value: money(s.totalSales), icon: TrendingUp },
    { label: t("rp_sum_delivery_fees"), value: money(s.deliveryFees), icon: Bike },
    { label: t("rp_sum_total_payments"), value: money(s.totalPayments), icon: Wallet },
    { label: t("rp_sum_refunds"), value: money(s.refunds), icon: ArrowDownRight },
    { label: t("rp_sum_net_revenue"), value: money(s.netRevenue), icon: Banknote },
    { label: t("rp_sum_new_customers"), value: s.newCustomers.toLocaleString(), icon: Users },
    { label: t("rp_sum_active_customers"), value: s.activeCustomers.toLocaleString(), icon: Users },
    { label: t("rp_sum_shops"), value: s.shops.toLocaleString(), icon: Store },
    { label: t("rp_sum_products"), value: s.products.toLocaleString(), icon: Package },
    { label: t("rp_sum_rider_orders"), value: s.riderOrders.toLocaleString(), icon: Bike },
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
  const { t } = useLanguage();
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
      .map(([status, value]) => ({ name: t(STATUS_LABEL_KEY[status as OrderStatus]), value }))
      .sort((a, b) => b.value - a.value);
  }, [report.orders, t]);

  const paymentData = report.payments
    .filter((p) => p.transactions > 0 || p.amount > 0)
    .map((p) => ({ name: p.label, amount: p.amount, transactions: p.transactions }));

  const topShops = report.shops.slice(0, 8).map((s) => ({ name: s.name, sales: s.sales }));
  const topProducts = report.products
    .slice(0, 8)
    .map((p) => ({ name: p.name, revenue: p.revenue }));

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <ChartCard title={t("rp_chart_sales_over_time")}
        subtitle={t("rp_chart_gross_vs_net", { granularity: t(GRANULARITY_KEY[report.sales.granularity] ?? "rp_gran_day") })}>
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
              name={t("rp_chart_gross")}
              stroke="#059669"
              fill="url(#grossFill)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="net"
              name={t("rp_chart_net")}
              stroke="#0ea5e9"
              fill="transparent"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("rp_chart_orders_over_time")} subtitle={t("rp_chart_order_volume")}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="orders"
              name={t("rp_chart_orders")}
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={t("rp_chart_orders_by_status")} subtitle={t("rp_chart_all_statuses")}>
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

      <ChartCard title={t("rp_chart_payment_methods")} subtitle={t("rp_chart_amount_per_method")}>
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
              <Bar dataKey="amount" name={t("rp_chart_amount")} fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>

      <ChartCard title={t("rp_chart_top_shops")} subtitle={t("rp_chart_by_delivered_sales")}>
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
              <Bar dataKey="sales" name={t("rp_chart_sales")} fill="#0ea5e9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty />
        )}
      </ChartCard>

      <ChartCard title={t("rp_chart_top_products")} subtitle={t("rp_chart_by_revenue")}>
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
              <Bar dataKey="revenue" name={t("rp_chart_revenue")} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
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
  const { t } = useLanguage();
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {t("rp_chart_no_data")}
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
  const { t } = useLanguage();
  const totals = report.sales.totals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          [t("rp_sales_gross"), money(totals.gross)],
          [t("rp_sales_delivery_fees"), money(totals.deliveryFees)],
          [t("rp_sales_discounts"), money(totals.discounts)],
          [t("rp_sales_refunds"), money(totals.refunds)],
          [t("rp_sales_net"), money(totals.net)],
          [t("rp_sales_orders"), totals.orders.toLocaleString()],
          [t("rp_sales_avg_order_value"), money(totals.avgOrderValue)],
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
            <Th>{t("rp_col_period")}</Th>
            <Th align="right">{t("rp_col_orders")}</Th>
            <Th align="right">{t("rp_col_gross")}</Th>
            <Th align="right">{t("rp_col_delivery_fees")}</Th>
            <Th align="right">{t("rp_col_discounts")}</Th>
            <Th align="right">{t("rp_col_net")}</Th>
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
            <Td>{t("rp_total")}</Td>
            <Td align="right">{totals.orders}</Td>
            <Td align="right">{money(totals.gross)}</Td>
            <Td align="right">{money(totals.deliveryFees)}</Td>
            <Td align="right">{money(totals.discounts)}</Td>
            <Td align="right">{money(totals.net)}</Td>
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
  const { t } = useLanguage();
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
          placeholder={t("rp_search_orders")}
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
            <SelectValue placeholder={t("rp_all_statuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("rp_all_statuses")}</SelectItem>
            {orderStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {t(STATUS_LABEL_KEY[s as OrderStatus])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {t("rp_orders_count", { shown: filtered.length.toLocaleString(), total: report.orders.length.toLocaleString() })}
        </span>
      </div>

      <TableShell minWidth="min-w-[980px]">
        <thead>
          <tr className="border-b border-border">
            <Th>
              <button className="uppercase" onClick={() => toggleSort("orderCode")}>
                {t("rp_col_order_id")}
              </button>
            </Th>
            <Th>
              <button className="uppercase" onClick={() => toggleSort("createdAt")}>
                {t("rp_col_date")}
              </button>
            </Th>
            <Th>{t("rp_col_customer")}</Th>
            <Th>{t("rp_col_shop")}</Th>
            <Th align="right">
              <button className="uppercase" onClick={() => toggleSort("total")}>
                {t("rp_col_total")}
              </button>
            </Th>
            <Th>{t("rp_col_payment")}</Th>
            <Th>{t("rp_col_order_status")}</Th>
            <Th>{t("rp_col_delivery")}</Th>
            <Th>{t("rp_col_rider")}</Th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
          {pageRows.length === 0 && <NoRows span={9} label={t("rp_no_orders_match")} />}
        </tbody>
      </TableShell>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("rp_page_of", { page: current + 1, pages: pageCount })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              {t("rp_previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              {t("rp_next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: ReportOrderRow }) {
  const { t } = useLanguage();
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
          <span>
            {(() => {
              const key = paymentLabelKey(order.paymentMethodId);
              return key ? t(key) : order.paymentMethod;
            })()}
          </span>
          <span
            className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              PAYMENT_STATUS_TONE[order.paymentStatus] ?? "bg-secondary text-secondary-foreground"
            }`}
          >
            {(() => {
              const key = paymentStatusLabelKey(order.paymentStatus);
              return key ? t(key) : paymentStatusLabel(order.paymentStatus);
            })()}
          </span>
        </div>
      </Td>
      <Td>{t(STATUS_LABEL_KEY[order.status as OrderStatus])}</Td>
      <Td className="text-muted-foreground">{t(deliveryStatusKey(order.deliveryStatus))}</Td>
      <Td>{order.rider}</Td>
    </tr>
  );
}

function PaymentsTab({ report }: { report: ReportPayload }) {
  const { t } = useLanguage();
  const rows = report.payments.filter((p) => p.transactions > 0 || p.amount > 0);
  const total = rows.reduce((s, p) => s + p.amount, 0);
  return (
    <TableShell minWidth="min-w-[720px]">
      <thead>
        <tr className="border-b border-border">
          <Th>{t("rp_col_payment_method")}</Th>
          <Th align="right">{t("rp_col_transactions")}</Th>
          <Th align="right">{t("rp_col_total_amount")}</Th>
          <Th align="right">{t("rp_col_successful")}</Th>
          <Th align="right">{t("rp_col_pending")}</Th>
          <Th align="right">{t("rp_col_failed")}</Th>
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
        {rows.length === 0 && <NoRows span={6} label={t("rp_no_payments")} />}
        {rows.length > 0 && (
          <tr className="border-t-2 border-border bg-secondary/50 font-semibold">
            <Td>{t("rp_total")}</Td>
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
  const { t } = useLanguage();
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
        <Label className="text-xs text-muted-foreground">{t("rp_sort_by")}</Label>
        <Select value={sort} onValueChange={(v) => setSort(v as ShopSort)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">{t("rp_sort_sales")}</SelectItem>
            <SelectItem value="orders">{t("rp_sort_orders")}</SelectItem>
            <SelectItem value="name">{t("rp_sort_name")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <TableShell minWidth="min-w-[760px]">
        <thead>
          <tr className="border-b border-border">
            <Th>{t("rp_col_shop")}</Th>
            <Th align="right">{t("rp_col_orders")}</Th>
            <Th align="right">{t("rp_col_sales")}</Th>
            <Th align="right">{t("rp_col_avg_order_value")}</Th>
            <Th align="right">{t("rp_col_completed")}</Th>
            <Th align="right">{t("rp_col_cancelled")}</Th>
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
          {rows.length === 0 && <NoRows span={6} label={t("rp_no_shops")} />}
        </tbody>
      </TableShell>
    </div>
  );
}

function ProductsTab({ report }: { report: ReportPayload }) {
  const { t } = useLanguage();
  return (
    <TableShell minWidth="min-w-[720px]">
      <thead>
        <tr className="border-b border-border">
          <Th>{t("rp_col_product")}</Th>
          <Th>{t("rp_col_shop")}</Th>
          <Th align="right">{t("rp_col_units_sold")}</Th>
          <Th align="right">{t("rp_col_revenue")}</Th>
          <Th align="right">{t("rp_col_orders")}</Th>
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
          <NoRows span={5} label={t("rp_no_products")} />
        )}
      </tbody>
    </TableShell>
  );
}

function CustomersTab({ report }: { report: ReportPayload }) {
  const { t } = useLanguage();
  const c = report.customers;
  const cards: [string, string][] = [
    [t("rp_cust_total"), c.totalCustomers.toLocaleString()],
    [t("rp_cust_new"), c.newCustomers.toLocaleString()],
    [t("rp_cust_returning"), c.returningCustomers.toLocaleString()],
    [t("rp_cust_orders"), c.totalOrders.toLocaleString()],
    [t("rp_cust_spending"), money(c.totalSpending)],
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
      <p className="text-xs text-muted-foreground">{t("rp_cust_note")}</p>
    </div>
  );
}

function RidersTab({ report }: { report: ReportPayload }) {
  const { t } = useLanguage();
  const rows = report.riders.filter((r) => r.assigned > 0);
  return (
    <TableShell minWidth="min-w-[640px]">
      <thead>
        <tr className="border-b border-border">
          <Th>{t("rp_col_rider")}</Th>
          <Th align="right">{t("rp_col_assigned_orders")}</Th>
          <Th align="right">{t("rp_col_completed")}</Th>
          <Th align="right">{t("rp_col_cancelled")}</Th>
          <Th align="right">{t("rp_col_completion_rate")}</Th>
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
        {rows.length === 0 && <NoRows span={5} label={t("rp_no_riders")} />}
      </tbody>
    </TableShell>
  );
}

// ---------------------------------------------------------------------------
// History + states
// ---------------------------------------------------------------------------

function ReportHistory() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-report-history"],
    queryFn: async () => reportHistoryFn({ data: { limit: 15 } }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">{t("rp_history_title")}</h2>
        <Skeleton className="h-24 w-full" />
      </section>
    );
  }
  if (!data?.available) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold">{t("rp_history_title")}</h2>
      </div>
      {data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t("rp_history_empty")}
        </p>
      ) : (
        <TableShell minWidth="min-w-[720px]">
          <thead>
            <tr className="border-b border-border">
              <Th>{t("rp_col_report")}</Th>
              <Th>{t("rp_col_date_range")}</Th>
              <Th>{t("rp_col_generated")}</Th>
              <Th>{t("rp_col_generated_by")}</Th>
              <Th>{t("rp_col_export")}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <Td className="font-medium">{t("rp_type_business")}</Td>
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
  const { t } = useLanguage();
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
      <h3 className="mt-3 font-display text-lg font-bold">{t("rp_error_title")}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        {t("rp_try_again")}
      </Button>
    </div>
  );
}
