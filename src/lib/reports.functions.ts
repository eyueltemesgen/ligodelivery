/**
 * Protected report server functions.
 *
 * Every entry point verifies the caller's Supabase session and admin role
 * server-side, so the report data and export endpoints cannot be reached by
 * customers, riders or merchants even if they discover the URL. The queries
 * themselves run through the admin's own RLS-enforced session, so the database
 * also enforces admin-only access (defence in depth).
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { resolvePeriod, type ReportRequest } from "@/lib/reports";
import type { ReportPayload } from "@/lib/reports";

type ReportInput = ReportRequest & { record?: boolean };

/** The context injected by `requireSupabaseAuth`. */
type ReportContext = { supabase: SupabaseClient<Database>; userId: string };

/** Reject anyone who is not an admin. `is_admin()` is SECURITY DEFINER. */
async function assertAdmin(context: ReportContext) {
  const { data, error } = await context.supabase.rpc("is_admin");
  if (error || data !== true) {
    throw new Error("Admins only. You do not have access to business reports.");
  }
}

function resolveOrThrow(input: ReportInput) {
  const resolved = resolvePeriod(input);
  if ("error" in resolved) throw new Error(resolved.error);
  return resolved.period;
}

async function loadGeneratedBy(context: ReportContext): Promise<string | null> {
  const { data } = await context.supabase
    .from("profiles")
    .select("full_name")
    .eq("id", context.userId)
    .maybeSingle();
  return data?.full_name ?? null;
}

type HistoryEntry = {
  reportType: string;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  exportType: string;
};

/**
 * Record a generated/exported report. Best-effort: the optional `report_history`
 * table may not be applied yet, and history must never break the report itself.
 */
async function recordHistory(context: ReportContext, entry: HistoryEntry) {
  try {
    await context.supabase.from("report_history").insert({
      report_type: entry.reportType,
      range_label: entry.rangeLabel,
      start_date: entry.startDate,
      end_date: entry.endDate,
      generated_by: context.userId,
      export_type: entry.exportType,
    });
  } catch (err) {
    console.warn("[reports] could not record history", err);
  }
}

/**
 * Build the full report payload for the selected period. `record` writes a
 * lightweight entry to report history (used for explicit generations, not the
 * automatic first load).
 */
export const generateReportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: ReportInput) => input)
  .handler(async ({ data, context }): Promise<ReportPayload> => {
    const ctx = context as ReportContext;
    await assertAdmin(ctx);
    const period = resolveOrThrow(data);
    const { generateReport } = await import("@/lib/reports.server");
    const generatedBy = await loadGeneratedBy(ctx);

    const payload = await generateReport(ctx.supabase, { period, generatedBy });

    if (data.record) {
      await recordHistory(ctx, {
        reportType: "Business Report",
        rangeLabel: period.label,
        startDate: period.startDate,
        endDate: period.endDateInclusive,
        exportType: "view",
      });
    }
    return payload;
  });

/** Recent report generations for the "Generated Reports" panel. */
export const reportHistoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { limit?: number }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as ReportContext;
    await assertAdmin(ctx);
    try {
      const { data: rows, error } = await ctx.supabase
        .from("report_history")
        .select(
          "id,report_type,range_label,start_date,end_date,export_type,created_at,generated_by",
        )
        .order("created_at", { ascending: false })
        .limit(Math.min(Math.max(data.limit ?? 20, 1), 100));
      if (error) throw error;
      const list = rows ?? [];
      const ids = [...new Set(list.map((r) => r.generated_by).filter(Boolean))] as string[];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profiles } = await ctx.supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", ids);
        for (const p of profiles ?? []) names.set(p.id, p.full_name);
      }
      return {
        available: true,
        items: list.map((r) => ({
          id: r.id,
          reportType: r.report_type,
          rangeLabel: r.range_label,
          startDate: r.start_date,
          endDate: r.end_date,
          exportType: r.export_type,
          createdAt: r.created_at,
          generatedBy: r.generated_by ? (names.get(r.generated_by) ?? null) : null,
        })),
      };
    } catch (err) {
      // History is optional; a missing table must never break Reports.
      console.warn("[reports] history unavailable", err);
      return { available: false, items: [] };
    }
  });

export type ExportResult = {
  filename: string;
  mime: string;
  base64: string;
};

/** Generate a report and render it as an .xlsx or .pdf, recording history. */
export const exportReportFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: ReportRequest & { kind: "excel" | "pdf" }) => input)
  .handler(async ({ data, context }): Promise<ExportResult> => {
    const ctx = context as ReportContext;
    await assertAdmin(ctx);
    const period = resolveOrThrow(data);
    const { generateReport } = await import("@/lib/reports.server");
    const generatedBy = await loadGeneratedBy(ctx);

    const payload = await generateReport(ctx.supabase, { period, generatedBy });

    try {
      if (data.kind === "excel") {
        const { buildReportWorkbook } = await import("@/lib/report-excel");
        return await buildReportWorkbook(payload);
      }
      const { buildReportPdf } = await import("@/lib/report-pdf");
      return await buildReportPdf(payload, ctx.supabase);
    } catch (err) {
      console.error("[reports] export failed", err);
      throw new Error("Could not build the export file. Please try again.");
    } finally {
      await recordHistory(ctx, {
        reportType: "Business Report",
        rangeLabel: period.label,
        startDate: period.startDate,
        endDate: period.endDateInclusive,
        exportType: data.kind,
      });
    }
  });
