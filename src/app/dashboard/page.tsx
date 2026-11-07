import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardPageHeader, Panel, StatCard } from "@/components/dashboard/dashboard-ui";
import AgentApplicationForm from "@/components/forms/agent-application-form";
import ProfileForm from "@/components/forms/profile-form";
import SavedHomeList from "@/components/property/saved-home-list";
import { Icon } from "@/components/ui/icon";
import StatusBadge from "@/components/ui/status-badge";
import { currentPrincipal } from "@/lib/authorization";
import { formatAmount, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const principal = await currentPrincipal();
  if (!principal) redirect("/signin");
  const [favorites, inquiries, submissions, listingCount, agentProfile] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: principal.id },
      include: {
        property: {
          select: {
            slug: true,
            title: true,
            status: true,
            price: true,
            currency: true,
            listingType: true,
            location: { select: { city: true, locality: true } },
            images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.inquiry.findMany({ where: { email: principal.email }, include: { property: { select: { title: true, slug: true, status: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.propertySubmission.findMany({ where: { submitterId: principal.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.property.count({ where: { ownerId: principal.id } }),
    prisma.agentProfile.findUnique({ where: { userId: principal.id }, select: { id: true, status: true, rejectionReason: true, appliedAt: true } }),
  ]);
  const firstName = principal.name?.split(" ")[0];

  return (
    <>
      <DashboardPageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Your dashboard"}
        description="Your saved homes, enquiries and property submissions in one place."
        actions={
          <Link href="/properties" className="btn">
            <Icon name="search" size={17} /> Browse properties
          </Link>
        }
      />

      <div className="stat-grid">
        <StatCard label="Saved homes" value={favorites.length} icon="heart" href="#saved" />
        <StatCard label="Enquiries sent" value={inquiries.length} icon="message" href="#inquiries" />
        <StatCard label="Submissions" value={submissions.length} icon="clipboard" href="#submissions" />
        <StatCard label="My listings" value={listingCount} icon="building" href="/dashboard/listings" />
      </div>

      <div className="dash-stack">
        <Panel id="saved" title="Saved homes">
          <SavedHomeList items={favorites} />
        </Panel>

        <div className="dash-grid dash-grid-even">
          <Panel id="inquiries" title="Your enquiries">
            {inquiries.length ? (
              <ul className="feed">
                {inquiries.map((i) => (
                  <li key={i.id}>
                    <div className="feed-main">
                      <p className="feed-title">
                        {i.property && i.property.status === "PUBLISHED" ? <Link href={`/properties/${i.property.slug}`}>{i.property.title}</Link> : i.property?.title || "General enquiry"}
                      </p>
                      <p className="feed-sub table-clamp">{i.message}</p>
                    </div>
                    <div className="feed-meta">
                      <StatusBadge status={i.status} />
                      <span>{formatDate(i.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty">
                Enquiries you send from listing pages will appear here. <Link href="/properties">Find a property</Link>
              </p>
            )}
          </Panel>

          <Panel
            id="submissions"
            title="Property submissions"
            action={
              <Link href="/sell" className="text-link">
                Submit a property <Icon name="arrow-right" size={15} />
              </Link>
            }
          >
            {submissions.length ? (
              <ul className="feed">
                {submissions.map((s) => {
                  const p = (s.payload || {}) as Record<string, unknown>;
                  return (
                    <li key={s.id}>
                      <div className="feed-main">
                        <p className="feed-title">
                          {String(p.propertyType || "Property")} in {String(p.city || "—")}
                        </p>
                        <p className="feed-sub num">
                          {formatAmount(Number(p.price || 0), String(p.currency || "PKR"))} · submitted {formatDate(s.createdAt)}
                        </p>
                      </div>
                      <div className="feed-meta">
                        <StatusBadge status={s.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="panel-empty">You haven’t submitted a property while signed in. Submissions are reviewed before they’re published.</p>
            )}
          </Panel>
        </div>

        {principal.role === "AGENT" && agentProfile?.status === "APPROVED" ? (
          <Panel id="agent" title="Your agent profile" action={<Link href={`/agents/${agentProfile.id}`} className="text-link">View public profile <Icon name="arrow-right" size={15} /></Link>}>
            <p className="panel-empty">You are an approved agent. Listings assigned to you and their inquiries appear in your listings and inbox.</p>
          </Panel>
        ) : principal.role !== "ADMIN" && principal.role !== "SUPER_ADMIN" ? (
          <Panel id="agent" title="Become an agent">
            {agentProfile?.status === "PENDING" ? (
              <p className="alert alert-info">
                <Icon name="clock" size={18} /> Your application was submitted on {formatDate(agentProfile.appliedAt)} and is being reviewed.
              </p>
            ) : (
              <>
                {agentProfile?.status === "REJECTED" && (
                  <p className="alert alert-error">
                    <Icon name="alert" size={18} /> Your previous application was not approved{agentProfile.rejectionReason ? `: ${agentProfile.rejectionReason}` : "."} You can apply again below.
                  </p>
                )}
                <p className="panel-empty">Agents get a public profile, can be assigned listings and receive enquiries directly. Every application is reviewed.</p>
                <AgentApplicationForm />
              </>
            )}
          </Panel>
        ) : null}

        <Panel id="settings" title="Account settings">
          <ProfileForm name={principal.name || ""} email={principal.email} />
        </Panel>
      </div>
    </>
  );
}
