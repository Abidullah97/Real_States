import type { Metadata } from "next";
import Link from "next/link";
import { BarList, ColumnChart, monthLabel } from "@/components/dashboard/charts";
import { DashboardPageHeader, DataTable, Panel, StatCard } from "@/components/dashboard/dashboard-ui";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { param, type SearchParams } from "@/lib/admin-data";
import { requireAdminPage } from "@/lib/permissions";
import { buildReport, parseRange } from "@/lib/reports";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reports", robots: { index: false, follow: false } };

const PRESETS = [
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "12m", label: "12 months" },
  { value: "24m", label: "24 months" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("/admin/reports");
  const p = await searchParams;
  const range = param(p, "range");
  const from = param(p, "from");
  const to = param(p, "to");
  const report = await buildReport(parseRange({ range, from, to }));
  const spansYears = report.range.from.getFullYear() !== report.range.to.getFullYear();
  const exportQuery = new URLSearchParams(Object.entries({ range, from, to }).filter((e): e is [string, string] => !!e[1])).toString();
  const series = (field: "listings" | "registrations" | "inquiries") =>
    report.monthly.map((m) => ({ key: m.month, label: monthLabel(m.month, spansYears), value: m[field], detail: monthLabel(m.month, true) }));
  const custom = !!(from && to);

  return (
    <>
      <DashboardPageHeader
        title="Reports"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Reports" }]}
        description={`${report.range.label}. All figures are calculated from database records created within this period.`}
      />

      <div className="report-filters">
        <nav className="status-tabs" aria-label="Report period">
          {PRESETS.map((r) => (
            <Link key={r.value} href={`/admin/reports?range=${r.value}`} aria-current={!custom && (range || "12m") === r.value ? "page" : undefined}>
              {r.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/reports" className="filter-bar report-custom">
          <label className="filter-date">
            <span>From</span>
            <input type="date" name="from" className="input" defaultValue={from} required />
          </label>
          <label className="filter-date">
            <span>To</span>
            <input type="date" name="to" className="input" defaultValue={to} required />
          </label>
          <button type="submit" className="btn btn-secondary">
            Apply range
          </button>
        </form>
      </div>

      <div className="stat-grid">
        <StatCard label="New listings" value={report.totals.listings} icon="building" />
        <StatCard label="New registrations" value={report.totals.registrations} icon="user-plus" />
        <StatCard label="Inquiries received" value={report.totals.inquiries} icon="inbox" />
        <StatCard label="Approval rate" value={report.approval.rate === null ? "—" : `${report.approval.rate}%`} icon="check-circle" hint={`${report.approval.approved} approved · ${report.approval.rejected} rejected`} />
      </div>

      <div className="dash-stack">
        <Panel title="Property listing growth" action={<a className="btn btn-secondary btn-sm" href={`/api/admin/reports/export?report=monthly&${exportQuery}`}><Icon name="download" size={15} /> Monthly CSV</a>}>
          <ColumnChart caption="New listings per month" data={series("listings")} />
        </Panel>
        <div className="dash-grid dash-grid-even">
          <Panel title="User registration growth">
            <ColumnChart caption="New registrations per month" data={series("registrations")} />
          </Panel>
          <Panel title="Monthly inquiries">
            <ColumnChart caption="Inquiries per month" data={series("inquiries")} />
          </Panel>
        </div>
        <div className="dash-grid dash-grid-even">
          <Panel title="Property type distribution" action={<a className="btn btn-secondary btn-sm" href={`/api/admin/reports/export?report=types&${exportQuery}`}><Icon name="download" size={15} /> CSV</a>}>
            <BarList caption="New listings by category" data={report.types.map((t) => ({ label: t.label, count: t.count }))} />
          </Panel>
          <Panel title="Sale vs rental listings">
            <BarList caption="New listings by listing type" data={report.saleVsRent} />
            <div className="approval-block">
              <h3 className="form-section-title">Property approval rates</h3>
              <BarList
                caption="Approval decisions"
                data={[
                  { label: "Approved", count: report.approval.approved },
                  { label: "Rejected", count: report.approval.rejected },
                  { label: "Waiting for review now", count: report.approval.pending },
                ]}
              />
            </div>
          </Panel>
        </div>
        <Panel title="Agent performance" action={<a className="btn btn-secondary btn-sm" href={`/api/admin/reports/export?report=agents&${exportQuery}`}><Icon name="download" size={15} /> CSV</a>}>
          <DataTable
            caption="Agent performance"
            rows={report.agents}
            rowKey={(a) => a.id}
            empty={<EmptyState icon="briefcase" headingLevel={3} title="No agents yet" description="Agent figures appear once agents are added." />}
            columns={[
              { key: "agent", header: "Agent", cell: (a) => <Link href={`/admin/users/${a.id}`} className="table-title">{a.name}</Link> },
              { key: "listings", header: "Listings", className: "num", cell: (a) => a.listings },
              { key: "published", header: "Live", className: "num", cell: (a) => a.published },
              { key: "inquiries", header: "Leads in period", className: "num", cell: (a) => a.inquiries },
              { key: "closed", header: "Qualified / resolved", className: "num", cell: (a) => (a.inquiries ? `${a.closed} (${Math.round((a.closed / a.inquiries) * 100)}%)` : "—") },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
