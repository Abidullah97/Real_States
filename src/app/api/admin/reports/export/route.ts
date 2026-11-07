import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/permissions";
import { buildReport, parseRange, toCsv } from "@/lib/reports";

const REPORTS = ["monthly", "types", "agents"] as const;

/** Downloads a report as CSV for the selected date range. */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  const url = new URL(request.url);
  const type = url.searchParams.get("report") as (typeof REPORTS)[number];
  if (!REPORTS.includes(type)) return NextResponse.json({ error: "Unknown report." }, { status: 400 });
  try {
    const report = await buildReport(parseRange({ range: url.searchParams.get("range") || undefined, from: url.searchParams.get("from") || undefined, to: url.searchParams.get("to") || undefined }));
    const csv =
      type === "monthly"
        ? toCsv(["Month", "New listings", "Registrations", "Inquiries"], report.monthly.map((m) => [m.month, m.listings, m.registrations, m.inquiries]))
        : type === "types"
          ? toCsv(["Category", "Listings"], [...report.types.map((t) => [t.label, t.count]), ...report.saleVsRent.map((t) => [t.label, t.count])])
          : toCsv(["Agent", "Email", "Listings", "Published", "Inquiries", "Qualified or closed"], report.agents.map((a) => [a.name, a.email, a.listings, a.published, a.inquiries, a.closed]));
    await logAction(gate.principal!.id, "report.export", "Report", type, { range: report.range.label });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="estate-house-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Report could not be generated." }, { status: 503 });
  }
}
