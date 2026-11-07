import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentProfileActions, UnassignButton } from "@/components/admin/agent-forms";
import { DashboardPageHeader, Panel, StatCard } from "@/components/dashboard/dashboard-ui";
import StatusBadge from "@/components/ui/status-badge";
import { formatAmount, formatDate, initials } from "@/lib/format";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agent", robots: { index: false, follow: false } };

export default async function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPage(`/admin/agents/${id}`);
  const profile = await prisma.agentProfile.findUnique({
    where: { id },
    include: {
      agency: { select: { name: true } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          disabledAt: true,
          createdAt: true,
          properties: { select: { id: true, title: true, reference: true, status: true, price: true, currency: true, listingType: true } },
          agentListings: { orderBy: { updatedAt: "desc" }, select: { id: true, title: true, reference: true, status: true, price: true, currency: true, listingType: true } },
          assignedInquiries: { select: { status: true } },
        },
      },
    },
  });
  if (!profile) notFound();
  const assignable = await prisma.property.findMany({ where: { agentId: null, status: { in: ["PUBLISHED", "DRAFT", "PENDING"] } }, orderBy: { title: "asc" }, select: { id: true, title: true, reference: true }, take: 300 });
  const u = profile.user;
  const leads = u.assignedInquiries;
  const resolved = leads.filter((l) => l.status === "CLOSED" || l.status === "QUALIFIED").length;
  const listings = [...u.agentListings, ...u.properties.filter((p) => !u.agentListings.some((a) => a.id === p.id))];
  const live = listings.filter((l) => l.status === "PUBLISHED").length;

  const agent = {
    profileId: profile.id,
    userId: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    phone: profile.phone,
    location: profile.location,
    bio: profile.bio,
    experienceYears: profile.experienceYears,
    specialization: profile.specialization,
    verified: !!profile.verifiedAt,
    status: profile.status,
    suspended: !!u.disabledAt,
  };

  return (
    <>
      <DashboardPageHeader
        title={u.name || u.email}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Agents", href: `/admin/agents?status=${profile.status}` }, { label: u.name || u.email }]}
        description={
          <span className="table-badges">
            <StatusBadge status={u.disabledAt ? "SUSPENDED" : profile.status} label={u.disabledAt ? "Inactive" : profile.status === "PENDING" ? "Application pending" : undefined} />
            {profile.verifiedAt && <StatusBadge status="APPROVED" label="Verified" />}
          </span>
        }
      />
      <AgentProfileActions agent={agent} assignable={assignable.map((p) => ({ id: p.id, label: `${p.title} (${p.reference})` }))} />

      {profile.status === "REJECTED" && profile.rejectionReason && <p className="alert alert-error detail-alert">Application rejected: {profile.rejectionReason}</p>}

      <div className="stat-grid">
        <StatCard label="Listings" value={listings.length} icon="building" hint="Owned or assigned" />
        <StatCard label="Live listings" value={live} icon="eye" />
        <StatCard label="Assigned leads" value={leads.length} icon="inbox" />
        <StatCard label="Qualified or resolved" value={leads.length ? `${Math.round((resolved / leads.length) * 100)}%` : "—"} icon="check-circle" hint={`${resolved} of ${leads.length} leads`} />
      </div>

      <div className="dash-grid">
        <div className="dash-grid-main">
          <Panel title={`Listings (${listings.length})`}>
            {listings.length ? (
              <ul className="feed">
                {listings.map((p) => {
                  const assigned = u.agentListings.some((a) => a.id === p.id);
                  return (
                    <li key={p.id}>
                      <div className="feed-main">
                        <p className="feed-title">
                          <Link href={`/admin/properties/${p.id}`}>{p.title}</Link>
                        </p>
                        <p className="feed-sub num">
                          {p.reference} · {formatAmount(Number(p.price), p.currency)}
                          {p.listingType === "RENT" ? " / mo" : ""} · {assigned ? "Assigned" : "Owner"}
                        </p>
                      </div>
                      <div className="feed-meta feed-meta-row">
                        <StatusBadge status={p.status} />
                        {assigned && <UnassignButton profileId={profile.id} propertyId={p.id} title={p.title} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="panel-empty">No listings yet. Use “Assign listings” to give this agent properties to manage.</p>
            )}
          </Panel>
          {profile.bio && (
            <Panel title="Biography">
              <p className="prose">{profile.bio}</p>
            </Panel>
          )}
        </div>
        <div className="dash-grid-side">
          <Panel title="Contact details">
            <div className="profile-head">
              <span className="avatar avatar-lg">{u.image ? <Image src={u.image} alt="" width={64} height={64} /> : initials(u.name || u.email)}</span>
              <div>
                <p className="feed-title">{u.name || "Unnamed agent"}</p>
                <p className="feed-sub">{profile.agency?.name || "Independent agent"}</p>
              </div>
            </div>
            <dl className="kv">
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${u.email}`}>{u.email}</a>
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{profile.phone ? <a href={`tel:${profile.phone}`}>{profile.phone}</a> : "—"}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{profile.location || "—"}</dd>
              </div>
              <div>
                <dt>Experience</dt>
                <dd>{profile.experienceYears !== null ? `${profile.experienceYears} years` : "—"}</dd>
              </div>
              <div>
                <dt>Specialization</dt>
                <dd>{profile.specialization || "—"}</dd>
              </div>
              <div>
                <dt>Applied</dt>
                <dd>{formatDate(profile.appliedAt)}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>
                  <Link href={`/admin/users/${u.id}`}>View user account</Link>
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
