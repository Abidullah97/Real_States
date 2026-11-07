import type { Metadata } from "next";
import PendingListings from "@/components/admin/pending-listings";
import { SubmissionQueue } from "@/components/admin/workflow-manager";
import { DashboardPageHeader, Panel } from "@/components/dashboard/dashboard-ui";
import { pluralize } from "@/lib/format";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Approvals", robots: { index: false, follow: false } };

export default async function Approvals() {
  await requireAdminPage("/admin/review");
  const [pending, submissions] = await Promise.all([
    prisma.property.findMany({
      where: { status: "PENDING" },
      orderBy: { updatedAt: "asc" },
      include: { owner: { select: { name: true, email: true } }, location: { select: { city: true } }, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
    }),
    prisma.propertySubmission.findMany({ where: { status: "PENDING" }, include: { submitter: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" }, take: 100 }),
  ]);
  const rows = pending.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    reference: p.reference,
    status: p.status,
    featured: p.featured,
    image: p.images[0]?.url ?? null,
    owner: p.owner?.name || p.owner?.email || "No owner",
    price: Number(p.price),
    currency: p.currency,
    listingType: p.listingType,
    city: p.location.city,
    updatedAt: p.updatedAt,
  }));
  return (
    <>
      <DashboardPageHeader
        title="Approvals"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Approvals" }]}
        description={`${pluralize(rows.length + submissions.length, "item")} waiting for a decision, oldest first. Approving publishes immediately; rejecting requires a reason the owner can see.`}
      />
      <div className="dash-stack approvals">
        <Panel title={`Listings submitted for review (${rows.length})`}>
          <PendingListings items={rows} />
        </Panel>
        <section aria-labelledby="owner-subs">
          <h2 id="owner-subs" className="section-label">
            Owner submissions from the public form ({submissions.length})
          </h2>
          <SubmissionQueue items={submissions} />
        </section>
      </div>
    </>
  );
}
