import type { Metadata } from "next";
import Link from "next/link";
import { DashboardPageHeader, DataTable } from "@/components/dashboard/dashboard-ui";
import Pagination from "@/components/property/pagination";
import EmptyState from "@/components/ui/empty-state";
import { pageParam, param, type SearchParams } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Activity log", robots: { index: false, follow: false } };

const PAGE_SIZE = 40;
const GROUPS: Record<string, string> = { auth: "Sign in / out", property: "Properties", submission: "Submissions", user: "Users", agent: "Agents", inquiry: "Inquiries", category: "Categories", location: "Locations", settings: "Settings", testimonial: "Testimonials", media: "Media", report: "Reports" };

/** Where an audited record can be opened, when it still exists in a viewable place. */
function recordLink(entity: string, id: string) {
  if (entity === "Property") return `/admin/properties/${id}`;
  if (entity === "User") return `/admin/users/${id}`;
  if (entity === "Inquiry") return `/admin/inquiries?open=${id}`;
  if (entity === "PropertySubmission") return "/admin/review";
  if (entity === "SiteSettings") return "/admin/settings";
  return null;
}

/** Metadata is shown as readable key/value text. Secrets are never written to the log in the first place. */
function details(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "";
  return Object.entries(metadata as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
    .join(" · ");
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("/admin/activity");
  const p = await searchParams;
  const group = param(p, "group");
  const actor = param(p, "actor");
  const from = param(p, "from");
  const to = param(p, "to");
  const page = pageParam(p);
  const where = {
    ...(group && GROUPS[group] ? { action: { startsWith: `${group}.` } } : {}),
    ...(actor ? { actorId: actor } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } } : {}),
  };
  const [rows, total, admins] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);
  const actorIds = [...new Set(rows.map((r) => r.actorId))];
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } });
  const nameOf = (id: string) => {
    const a = actors.find((x) => x.id === id);
    return a ? a.name || a.email : "Deleted user";
  };
  const hrefFor = (n: number) => {
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries({ group, actor, from, to })) if (v) s.set(k, v);
    if (n > 1) s.set("page", String(n));
    return `/admin/activity?${s}`;
  };

  return (
    <>
      <DashboardPageHeader
        title="Activity log"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Activity log" }]}
        description="An append-only record of administrative actions: sign-ins, listing changes and approvals, account changes, settings and more. Passwords and tokens are never recorded."
      />
      <form action="/admin/activity" className="filter-bar">
        <label className="filter-select">
          <span className="visually-hidden">Action type</span>
          <select name="group" className="select" defaultValue={group || ""} aria-label="Action type">
            <option value="">All actions</option>
            {Object.entries(GROUPS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select">
          <span className="visually-hidden">Administrator</span>
          <select name="actor" className="select" defaultValue={actor || ""} aria-label="Administrator">
            <option value="">All administrators</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || a.email}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-date">
          <span>From</span>
          <input type="date" name="from" className="input" defaultValue={from} />
        </label>
        <label className="filter-date">
          <span>To</span>
          <input type="date" name="to" className="input" defaultValue={to} />
        </label>
        <button type="submit" className="btn btn-secondary">
          Apply
        </button>
        {(group || actor || from || to) && (
          <Link href="/admin/activity" className="text-link filter-reset">
            Reset
          </Link>
        )}
      </form>
      <p className="table-count table-count-start activity-count">{total.toLocaleString("en-US")} entries</p>
      <DataTable
        caption="Administrative activity"
        rows={rows}
        rowKey={(r) => r.id}
        empty={<EmptyState icon="scroll" title="No activity recorded" description="Administrative actions appear here as they happen." />}
        columns={[
          { key: "when", header: "Date and time", className: "nowrap", cell: (r) => <span className="table-sub num">{formatDate(r.createdAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span> },
          { key: "who", header: "Administrator", cell: (r) => <Link href={`/admin/users/${r.actorId}`}>{nameOf(r.actorId)}</Link> },
          { key: "action", header: "Action", cell: (r) => <code className="action-code">{r.action}</code> },
          {
            key: "record",
            header: "Related record",
            cell: (r) => {
              const href = recordLink(r.entity, r.entityId);
              const label = `${r.entity} ${r.entityId.length > 14 ? `…${r.entityId.slice(-8)}` : r.entityId}`;
              return href ? <Link href={href}>{label}</Link> : <span className="table-sub">{label}</span>;
            },
          },
          { key: "details", header: "Details", hideOnMobile: true, cell: (r) => <span className="table-sub table-clamp">{details(r.metadata) || "—"}</span> },
        ]}
      />
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefFor={hrefFor} label="Activity pages" />
    </>
  );
}
