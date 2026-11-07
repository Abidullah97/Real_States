import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PropertyDetailActions from "@/components/admin/property-detail-actions";
import { DashboardPageHeader, Panel } from "@/components/dashboard/dashboard-ui";
import { Icon } from "@/components/ui/icon";
import StatusBadge from "@/components/ui/status-badge";
import { getPropertyFormOptions, propertyRowInclude, toPropertyRow } from "@/lib/admin-data";
import { formatArea, formatDate, formatExactAmount, formatRelative } from "@/lib/format";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Property details", robots: { index: false, follow: false } };

export default async function AdminPropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPage(`/admin/properties/${id}`);
  const property = await prisma.property.findUnique({
    where: { id },
    include: { ...propertyRowInclude, owner: { select: { id: true, name: true, email: true } }, agent: { select: { id: true, name: true, email: true } }, _count: { select: { favorites: true } } },
  });
  if (!property) notFound();
  const [inquiries, history, options] = await Promise.all([
    prisma.inquiry.findMany({ where: { propertyId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.auditLog.findMany({ where: { entity: "Property", entityId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
    getPropertyFormOptions(),
  ]);
  const actors = await prisma.user.findMany({ where: { id: { in: [...new Set(history.map((h) => h.actorId))] } }, select: { id: true, name: true, email: true } });
  const row = toPropertyRow(property);
  const l = property.location;
  const facts: [string, string][] = [
    ["Reference", property.reference],
    ["Category", property.propertyType],
    ["Listing type", property.listingType === "RENT" ? "For rent" : "For sale"],
    ["Price", `${formatExactAmount(Number(property.price), property.currency)}${property.listingType === "RENT" ? " / month" : ""}`],
    ["Area", formatArea(Number(property.area), property.areaUnit)],
    ["Bedrooms", String(property.bedrooms)],
    ["Bathrooms", String(property.bathrooms)],
    ["Parking", String(property.parking)],
    ["Location", [l.locality, l.area, l.city, l.province, l.country].filter(Boolean).join(", ")],
    ["Street address", property.address || "—"],
    ["Saved by", `${property._count.favorites} visitor${property._count.favorites === 1 ? "" : "s"}`],
    ["Created", formatDate(property.createdAt)],
    ["Last updated", formatDate(property.updatedAt)],
    ["Published", property.publishedAt ? formatDate(property.publishedAt) : "Not published"],
  ];

  return (
    <>
      <DashboardPageHeader
        title={property.title}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Properties", href: "/admin/properties" }, { label: property.reference }]}
        description={
          <span className="table-badges">
            <StatusBadge status={property.status} />
            {property.featured && <StatusBadge status="FEATURED" label={property.featuredUntil ? `Featured until ${formatDate(property.featuredUntil)}` : "Featured"} />}
          </span>
        }
      />
      <PropertyDetailActions row={row} options={options} />

      {property.status === "REJECTED" && property.rejectionReason && (
        <p className="alert alert-error detail-alert">
          <Icon name="ban" size={18} /> <span><strong>Rejection reason:</strong> {property.rejectionReason}</span>
        </p>
      )}

      <div className="dash-grid">
        <div className="dash-grid-main">
          <Panel title={`Photos (${property.images.length})`}>
            {property.images.length ? (
              <ul className="admin-gallery">
                {property.images.map((img, i) => (
                  <li key={img.id}>
                    <Image src={img.url} alt={img.alt} fill sizes="(max-width: 768px) 50vw, 240px" />
                    {i === 0 && <span className="badge badge-overlay">Cover</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="panel-empty">No photos yet. Use “Edit details & photos” to upload some.</p>
            )}
          </Panel>
          <Panel title="Description">
            <p className="prose">{property.description}</p>
            {property.features.length > 0 && (
              <ul className="feature-list admin-features">
                {property.features.map((f) => (
                  <li key={f.id}>
                    <Icon name="check" size={16} />
                    {f.name}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Inquiries about this property" action={<Link href={`/admin/inquiries?q=${encodeURIComponent(property.title)}`} className="text-link">Inbox <Icon name="arrow-right" size={15} /></Link>}>
            {inquiries.length ? (
              <ul className="feed">
                {inquiries.map((i) => (
                  <li key={i.id}>
                    <div className="feed-main">
                      <p className="feed-title">
                        <Link href={`/admin/inquiries?open=${i.id}`}>{i.name}</Link>
                      </p>
                      <p className="feed-sub">{i.email}</p>
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
          <Panel title="Details">
            <dl className="kv">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd className="num">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="People">
            <dl className="kv">
              <div>
                <dt>Owner</dt>
                <dd>{property.owner ? <Link href={`/admin/users/${property.owner.id}`}>{property.owner.name || property.owner.email}</Link> : "No owner account"}</dd>
              </div>
              <div>
                <dt>Agent</dt>
                <dd>{property.agent ? <Link href={`/admin/users/${property.agent.id}`}>{property.agent.name || property.agent.email}</Link> : "Not assigned"}</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="History">
            {history.length ? (
              <ul className="activity">
                {history.map((h) => {
                  const actor = actors.find((a) => a.id === h.actorId);
                  return (
                    <li key={h.id}>
                      <span className="activity-dot" aria-hidden="true" />
                      <p>
                        <strong>{actor?.name || actor?.email || "Unknown user"}</strong> {h.action.replace("property.", "").replace(/_/g, " ")}
                        <span>{formatRelative(h.createdAt)}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="panel-empty">No recorded changes yet.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
