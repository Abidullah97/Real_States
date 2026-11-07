import type { Metadata } from "next";
import Link from "next/link";
import { DashboardPageHeader, Panel } from "@/components/dashboard/dashboard-ui";
import StatusBadge from "@/components/ui/status-badge";
import { param, type SearchParams } from "@/lib/admin-data";
import { formatRelative } from "@/lib/format";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: false } };

/** Global admin search across listings, people and inquiries (the top-bar search box). */
export default async function AdminSearch({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("/admin/search");
  const q = param(await searchParams, "q")?.slice(0, 100) || "";
  const contains = { contains: q, mode: "insensitive" as const };
  const [properties, users, inquiries] = q
    ? await Promise.all([
        prisma.property.findMany({ where: { OR: [{ title: contains }, { reference: contains }, { location: { is: { city: contains } } }] }, take: 10, select: { id: true, title: true, reference: true, status: true } }),
        prisma.user.findMany({ where: { OR: [{ name: contains }, { email: contains }] }, take: 10, select: { id: true, name: true, email: true, role: true } }),
        prisma.inquiry.findMany({ where: { OR: [{ name: contains }, { email: contains }, { message: contains }] }, take: 10, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, status: true, createdAt: true } }),
      ])
    : [[], [], []];
  const total = properties.length + users.length + inquiries.length;

  return (
    <>
      <DashboardPageHeader title={q ? `Results for “${q}”` : "Search"} breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Search" }]} description={q ? `${total} result${total === 1 ? "" : "s"} (top 10 per section).` : "Use the search box above to find listings, people and inquiries."} />
      {q && (
        <div className="dash-stack search-results">
          <Panel title={`Properties (${properties.length})`} action={<Link href={`/admin/properties?q=${encodeURIComponent(q)}`} className="text-link">All matches</Link>}>
            {properties.length ? (
              <ul className="feed">
                {properties.map((p) => (
                  <li key={p.id}>
                    <div className="feed-main">
                      <p className="feed-title">
                        <Link href={`/admin/properties/${p.id}`}>{p.title}</Link>
                      </p>
                      <p className="feed-sub">{p.reference}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty">No properties match.</p>
            )}
          </Panel>
          <Panel title={`People (${users.length})`} action={<Link href={`/admin/users?q=${encodeURIComponent(q)}`} className="text-link">All matches</Link>}>
            {users.length ? (
              <ul className="feed">
                {users.map((u) => (
                  <li key={u.id}>
                    <div className="feed-main">
                      <p className="feed-title">
                        <Link href={`/admin/users/${u.id}`}>{u.name || u.email}</Link>
                      </p>
                      <p className="feed-sub">{u.email}</p>
                    </div>
                    <StatusBadge status={u.role} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty">No people match.</p>
            )}
          </Panel>
          <Panel title={`Inquiries (${inquiries.length})`} action={<Link href={`/admin/inquiries?q=${encodeURIComponent(q)}`} className="text-link">All matches</Link>}>
            {inquiries.length ? (
              <ul className="feed">
                {inquiries.map((i) => (
                  <li key={i.id}>
                    <div className="feed-main">
                      <p className="feed-title">
                        <Link href={`/admin/inquiries?open=${i.id}`}>{i.name}</Link>
                      </p>
                      <p className="feed-sub">
                        {i.email} · {formatRelative(i.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={i.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty">No inquiries match.</p>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
