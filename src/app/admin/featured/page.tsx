import type { Metadata } from "next";
import FeaturedManager from "@/components/admin/featured-manager";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Featured listings", robots: { index: false, follow: false } };

/** A featured end date in the past means the listing is no longer highlighted publicly. */
function isExpired(until: Date | null) {
  return !!until && until.getTime() < Date.now();
}

export default async function FeaturedPage() {
  await requireAdminPage("/admin/featured");
  const [featured, candidates, settings] = await Promise.all([
    prisma.property.findMany({
      where: { featured: true },
      orderBy: [{ featuredOrder: "asc" }, { publishedAt: "desc" }],
      select: { id: true, title: true, reference: true, featuredOrder: true, featuredUntil: true, location: { select: { city: true } }, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
    }),
    prisma.property.findMany({ where: { featured: false, status: "PUBLISHED" }, orderBy: { title: "asc" }, select: { id: true, title: true, reference: true }, take: 500 }),
    getSiteSettings(),
  ]);
  return (
    <>
      <DashboardPageHeader
        title="Featured listings"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Featured" }]}
        description="Choose which published listings are highlighted on the homepage and at the top of search, set their order and optional end dates."
      />
      <FeaturedManager
        limit={settings.featuredLimit}
        candidates={candidates.map((c) => ({ id: c.id, label: `${c.title} (${c.reference})` }))}
        items={featured.map((f) => ({
          id: f.id,
          title: f.title,
          reference: f.reference,
          city: f.location.city,
          image: f.images[0]?.url ?? null,
          featuredOrder: f.featuredOrder,
          featuredUntil: f.featuredUntil?.toISOString() ?? null,
          expired: isExpired(f.featuredUntil),
        }))}
      />
    </>
  );
}
