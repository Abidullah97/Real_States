import type { Metadata } from "next";
import Link from "next/link";
import { BarList, ColumnChart, monthLabel } from "@/components/dashboard/charts";
import { DashboardPageHeader, Panel, StatCard } from "@/components/dashboard/dashboard-ui";
import { Icon } from "@/components/ui/icon";
import StatusBadge from "@/components/ui/status-badge";
import { formatRelative } from "@/lib/format";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildReport, parseRange } from "@/lib/reports";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { label: "Add property", href: "/admin/properties?new=1", icon: "plus" },
  { label: "Review approvals", href: "/admin/review", icon: "check-circle" },
  { label: "Add agent", href: "/admin/agents?new=1", icon: "user-plus" },
  { label: "Manage featured", href: "/admin/featured", icon: "star" },
  { label: "View reports", href: "/admin/reports", icon: "chart" },
  { label: "Site settings", href: "/admin/settings", icon: "settings" },
];

export default async function AdminOverview() {
  const principal = await requireAdminPage();
  const [byStatus, rentals, rented, pendingSubs, rejectedSubs, users, agents, inquiries, newInquiries, report, pendingProps, recentSubs, recentUsers, recentInquiries] = await Promise.all([
    prisma.property.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.property.count({ where: { listingType: "RENT" } }),
    prisma.property.count({ where: { status: "RENTED" } }),
    prisma.propertySubmission.count({ where: { status: "PENDING" } }),
    prisma.propertySubmission.count({ where: { status: "REJECTED" } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "AGENT" } }),
    prisma.inquiry.count(),
    prisma.inquiry.count({ where: { status: "NEW" } }),
    buildReport(parseRange({ range: "6m" })),
    prisma.property.findMany({ where: { status: "PENDING" }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true, reference: true, updatedAt: true, owner: { select: { name: true, email: true } } } }),
    prisma.propertySubmission.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, createdAt: true, payload: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { property: { select: { title: true } } } }),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const total = byStatus.reduce((sum, b) => sum + b._count._all, 0);
  const pending = count("PENDING") + pendingSubs;
  const rejected = count("REJECTED") + rejectedSubs;

  const submissions = [
    ...pendingProps.map((p) => ({ id: p.id, title: p.title, sub: `${p.reference} · ${p.owner?.name || p.owner?.email || "No owner"}`, at: p.updatedAt, href: `/admin/properties/${p.id}`, kind: "Listing" })),
    ...recentSubs.map((s) => {
      const d = (s.payload || {}) as Record<string, unknown>;
      return { id: s.id, title: `${String(d.propertyType || "Property")} in ${String(d.city || "—")}`, sub: `Owner submission · ${String(d.name || "")}`, at: s.createdAt, href: "/admin/review", kind: "Submission" };
    }),
  ]
    .sort((a, b) => +b.at - +a.at)
    .slice(0, 6);
  const monthly = (field: "listings" | "registrations") => report.monthly.map((m) => ({ key: m.month, label: monthLabel(m.month), value: m[field], detail: monthLabel(m.month, true) }));

  return (
    <>
      <DashboardPageHeader
        title="Dashboard"
        description={`Welcome back${principal.name ? `, ${principal.name.split(" ")[0]}` : ""}. Every figure here comes directly from the database.`}
        actions={
          <Link href="/admin/properties?new=1" className="btn">
            <Icon name="plus" size={17} /> Add property
          </Link>
        }
      />

      <div className="stat-grid stat-grid-10">
        <StatCard label="Total properties" value={total} icon="building" href="/admin/properties" />
        <StatCard label="Active" value={count("PUBLISHED")} icon="eye" href="/admin/properties?status=PUBLISHED" hint="Live on the website" />
        <StatCard label="Pending" value={pending} icon="clock" href="/admin/review" hint={`${count("PENDING")} listings · ${pendingSubs} submissions`} />
        <StatCard label="Rejected" value={rejected} icon="ban" href="/admin/properties?status=REJECTED" />
        <StatCard label="Sold" value={count("SOLD")} icon="key" href="/admin/properties?status=SOLD" />
        <StatCard label="Rental properties" value={rentals} icon="home" href="/admin/properties?listing=RENT" hint={`${rented} currently rented`} />
        <StatCard label="Registered users" value={users} icon="users" href="/admin/users" />
        <StatCard label="Agents" value={agents} icon="briefcase" href="/admin/agents" />
        <StatCard label="Inquiries" value={inquiries} icon="inbox" href="/admin/inquiries" />
        <StatCard label="New inquiries" value={newInquiries} icon="bell-ring" href="/admin/inquiries?status=NEW" hint={newInquiries ? "Awaiting a first response" : "All caught up"} />
      </div>

      <section className="quick-actions" aria-label="Quick actions">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="quick-action">
            <Icon name={a.icon} size={18} />
            {a.label}
          </Link>
        ))}
      </section>

      <div className="dash-grid dash-grid-even">
        <Panel title="New listings per month" action={<Link href="/admin/reports" className="text-link">Reports <Icon name="arrow-right" size={15} /></Link>}>
          <ColumnChart caption="New listings per month, last 6 months" data={monthly("listings")} />
        </Panel>
        <Panel title="New registrations per month" action={<span className="panel-meta">Last 6 months</span>}>
          <ColumnChart caption="User registrations per month, last 6 months" data={monthly("registrations")} />
        </Panel>
      </div>

      <div className="dash-grid">
        <div className="dash-grid-main">
          <Panel title="Recent property submissions" action={<Link href="/admin/review" className="text-link">Approvals <Icon name="arrow-right" size={15} /></Link>}>
            {submissions.length ? (
              <ul className="feed">
                {submissions.map((s) => (
                  <li key={`${s.kind}-${s.id}`}>
                    <div className="feed-main">
                      <p className="feed-title">
                        <Link href={s.href}>{s.title}</Link>
                      </p>
                      <p className="feed-sub">{s.sub}</p>
                    </div>
                    <div className="feed-meta">
                      <StatusBadge status="PENDING" label={s.kind} />
                      <span>{formatRelative(s.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty">Nothing is waiting for approval.</p>
            )}
          </Panel>
          <Panel title="Recent inquiries" action={<Link href="/admin/inquiries" className="text-link">Inbox <Icon name="arrow-right" size={15} /></Link>}>
            {recentInquiries.length ? (
              <ul className="feed">
                {recentInquiries.map((i) => (
                  <li key={i.id}>
                    <div className="feed-main">
                      <p className="feed-title">
                        <Link href={`/admin/inquiries?open=${i.id}`}>{i.name}</Link>
                      </p>
                      <p className="feed-sub">{i.property?.title || "General inquiry"}</p>
                    </div>
                    <div className="feed-meta">
                      <StatusBadge status={i.status} />
                      <span>{formatRelative(i.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty">No inquiries yet.</p>
            )}
          </Panel>
        </div>
        <div className="dash-grid-side">
          <Panel title="Approval statistics" action={<span className="panel-meta">Last 6 months</span>}>
            <div className="approval-stats">
              <p className="approval-rate num">{report.approval.rate === null ? "—" : `${report.approval.rate}%`}</p>
              <p className="panel-empty">Approval rate of reviewed listings and submissions</p>
            </div>
            <BarList
              caption="Approval decisions"
              data={[
                { label: "Approved", count: report.approval.approved },
                { label: "Rejected", count: report.approval.rejected },
                { label: "Waiting now", count: report.approval.pending },
              ]}
            />
          </Panel>
          <Panel title="Recent registrations" action={<Link href="/admin/users" className="text-link">Users <Icon name="arrow-right" size={15} /></Link>}>
            <ul className="feed">
              {recentUsers.map((u) => (
                <li key={u.id}>
                  <div className="feed-main">
                    <p className="feed-title">
                      <Link href={`/admin/users/${u.id}`}>{u.name || u.email}</Link>
                    </p>
                    <p className="feed-sub">{ROLE_LABELS[u.role as Role]}</p>
                  </div>
                  <div className="feed-meta">
                    <span>{formatRelative(u.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
