import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserProfileActions } from "@/components/admin/user-actions";
import { DashboardPageHeader, Panel } from "@/components/dashboard/dashboard-ui";
import { Icon } from "@/components/ui/icon";
import StatusBadge from "@/components/ui/status-badge";
import { formatAmount, formatDate, formatRelative, initials } from "@/lib/format";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { assignableRoles, isAdminRole } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "User profile", robots: { index: false, follow: false } };

export default async function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireAdminPage(`/admin/users/${id}`);
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      agentProfile: { include: { agency: { select: { name: true } } } },
      properties: { orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, title: true, reference: true, status: true, price: true, currency: true, listingType: true } },
      submissions: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, status: true, createdAt: true, payload: true } },
      _count: { select: { favorites: true, inquiries: true, properties: true, agentListings: true } },
    },
  });
  if (!user) notFound();
  const [inquiries, activity, aboutUser] = await Promise.all([
    prisma.inquiry.findMany({ where: { OR: [{ userId: id }, { email: user.email }] }, orderBy: { createdAt: "desc" }, take: 10, include: { property: { select: { title: true } } } }),
    prisma.auditLog.findMany({ where: { actorId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.auditLog.findMany({ where: { entity: "User", entityId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const canManage = viewer.role === "SUPER_ADMIN" || !isAdminRole(user.role) || viewer.id === user.id;
  const summary = { id: user.id, name: user.name, email: user.email, role: user.role, suspended: !!user.disabledAt };

  return (
    <>
      <DashboardPageHeader
        title={user.name || user.email}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: user.name || user.email }]}
        description={
          <span className="table-badges">
            <StatusBadge status={user.role} />
            <StatusBadge status={user.disabledAt ? "SUSPENDED" : "ACTIVE"} label={user.disabledAt ? `Suspended ${formatDate(user.disabledAt)}` : user.emailVerified ? "Active" : "Email not verified"} />
          </span>
        }
      />
      <UserProfileActions user={summary} viewerId={viewer.id} roles={assignableRoles(viewer.role)} canManage={canManage} />

      <div className="dash-grid">
        <div className="dash-grid-main">
          <Panel title={`Properties owned (${user._count.properties})`} action={user._count.properties > 0 ? <Link href={`/admin/properties?q=${encodeURIComponent(user.email)}`} className="text-link">View all <Icon name="arrow-right" size={15} /></Link> : undefined}>
            {user.properties.length ? (
              <ul className="feed">
                {user.properties.map((p) => (
                  <li key={p.id}>
                    <div className="feed-main">
                      <p className="feed-title">
                        <Link href={`/admin/properties/${p.id}`}>{p.title}</Link>
                      </p>
                      <p className="feed-sub num">
                        {p.reference} · {formatAmount(Number(p.price), p.currency)}
                        {p.listingType === "RENT" ? " / mo" : ""}
                      </p>
                    </div>
                    <div className="feed-meta">
                      <StatusBadge status={p.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty">No listings owned by this account.</p>
            )}
          </Panel>
          <Panel title="Submissions from the public form">
            {user.submissions.length ? (
              <ul className="feed">
                {user.submissions.map((s) => {
                  const d = (s.payload || {}) as Record<string, unknown>;
                  return (
                    <li key={s.id}>
                      <div className="feed-main">
                        <p className="feed-title">
                          {String(d.propertyType || "Property")} in {String(d.city || "—")}
                        </p>
                        <p className="feed-sub">{formatDate(s.createdAt)}</p>
                      </div>
                      <div className="feed-meta">
                        <StatusBadge status={s.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="panel-empty">No submissions.</p>
            )}
          </Panel>
          <Panel title="Inquiries sent">
            {inquiries.length ? (
              <ul className="feed">
                {inquiries.map((i) => (
                  <li key={i.id}>
                    <div className="feed-main">
                      <p className="feed-title">
                        <Link href={`/admin/inquiries?open=${i.id}`}>{i.property?.title || "General inquiry"}</Link>
                      </p>
                      <p className="feed-sub table-clamp">{i.message}</p>
                    </div>
                    <div className="feed-meta">
                      <StatusBadge status={i.status} />
                      <span>{formatRelative(i.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty">No inquiries.</p>
            )}
          </Panel>
        </div>
        <div className="dash-grid-side">
          <Panel title="Account">
            <div className="profile-head">
              <span className="avatar avatar-lg">{user.image ? <Image src={user.image} alt="" width={64} height={64} /> : initials(user.name || user.email)}</span>
              <div>
                <p className="feed-title">{user.name || "Unnamed user"}</p>
                <p className="feed-sub">{user.email}</p>
              </div>
            </div>
            <dl className="kv">
              <div>
                <dt>Registered</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt>Email verified</dt>
                <dd>{user.emailVerified ? formatDate(user.emailVerified) : "Not yet"}</dd>
              </div>
              <div>
                <dt>Saved homes</dt>
                <dd className="num">{user._count.favorites}</dd>
              </div>
              <div>
                <dt>Listings as agent</dt>
                <dd className="num">{user._count.agentListings}</dd>
              </div>
            </dl>
          </Panel>
          {user.agentProfile && (
            <Panel title="Agent profile" action={<Link href={`/admin/agents/${user.agentProfile.id}`} className="text-link">Manage <Icon name="arrow-right" size={15} /></Link>}>
              <dl className="kv">
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={user.agentProfile.status} />
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{user.agentProfile.phone || "—"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{user.agentProfile.location || "—"}</dd>
                </div>
                <div>
                  <dt>Agency</dt>
                  <dd>{user.agentProfile.agency?.name || "Independent"}</dd>
                </div>
              </dl>
            </Panel>
          )}
          <Panel title="Activity">
            {[...activity, ...aboutUser].length ? (
              <ul className="activity">
                {[...activity.map((a) => ({ ...a, mine: true })), ...aboutUser.map((a) => ({ ...a, mine: false }))]
                  .sort((a, b) => +b.createdAt - +a.createdAt)
                  .slice(0, 12)
                  .map((a) => (
                    <li key={`${a.mine}-${a.id}`}>
                      <span className="activity-dot" aria-hidden="true" />
                      <p>
                        {a.mine ? "Performed" : "Account change:"} <strong>{a.action.replace(/[._]/g, " ")}</strong>
                        <span>{formatRelative(a.createdAt)}</span>
                      </p>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="panel-empty">No recorded activity. Administrative actions and account changes appear here.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
