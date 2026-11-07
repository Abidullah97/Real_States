import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import MediaLibrary from "@/components/admin/media-library";
import { DashboardPageHeader, Panel } from "@/components/dashboard/dashboard-ui";
import FilterBar from "@/components/dashboard/filter-bar";
import Pagination from "@/components/property/pagination";
import { pageParam, param, type SearchParams } from "@/lib/admin-data";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Media", robots: { index: false, follow: false } };

const PAGE_SIZE = 36;

export default async function MediaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("/admin/media");
  const p = await searchParams;
  const q = param(p, "q");
  const scope = param(p, "scope");
  const page = pageParam(p);
  const where = {
    ...(q ? { OR: [{ alt: { contains: q, mode: "insensitive" as const } }, { property: { is: { title: { contains: q, mode: "insensitive" as const } } } }] } : {}),
    ...(scope === "live" ? { property: { is: { status: "PUBLISHED" as const } } } : scope === "unused" ? { property: { is: { status: { in: ["ARCHIVED" as const, "REJECTED" as const] } } } } : scope === "draft" ? { property: { is: { status: { in: ["DRAFT" as const, "PENDING" as const] } } } } : {}),
  };
  const [images, total, properties, avatars] = await Promise.all([
    prisma.propertyImage.findMany({
      where,
      orderBy: [{ propertyId: "asc" }, { position: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { property: { select: { id: true, title: true, status: true, _count: { select: { images: true } } } } },
    }),
    prisma.propertyImage.count({ where }),
    prisma.property.findMany({ where: { status: { notIn: ["ARCHIVED"] } }, orderBy: { title: "asc" }, select: { id: true, title: true, reference: true }, take: 500 }),
    prisma.user.findMany({ where: { image: { not: null } }, select: { id: true, name: true, email: true, image: true, agentProfile: { select: { id: true } } }, take: 48 }),
  ]);
  const query = (n: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (scope) s.set("scope", scope);
    if (n > 1) s.set("page", String(n));
    return `/admin/media?${s}`;
  };

  return (
    <>
      <DashboardPageHeader
        title="Media"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Media" }]}
        description={`${total.toLocaleString("en-US")} listing image${total === 1 ? "" : "s"}. Images on archived or rejected listings can be cleaned up; the only photo of a published listing is protected.`}
      />
      <div className="table-toolbar property-toolbar">
        <FilterBar
          action="/admin/media"
          query={q}
          searchPlaceholder="Listing name or image description"
          resetHref="/admin/media"
          selects={[
            {
              name: "scope",
              label: "Listing status",
              value: scope,
              options: [
                { value: "", label: "All images" },
                { value: "live", label: "Published listings" },
                { value: "draft", label: "Drafts & pending" },
                { value: "unused", label: "Archived or rejected (cleanup)" },
              ],
            },
          ]}
        />
      </div>
      <MediaLibrary
        properties={properties.map((x) => ({ id: x.id, label: `${x.title} (${x.reference})` }))}
        items={images.map((i) => ({
          id: i.id,
          url: i.url,
          alt: i.alt,
          position: i.position,
          publicId: i.publicId,
          propertyId: i.property.id,
          propertyTitle: i.property.title,
          propertyStatus: i.property.status,
          protectedImage: i.property.status === "PUBLISHED" && i.property._count.images <= 1,
        }))}
      />
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefFor={query} label="Media pages" />

      <Panel title={`Profile pictures (${avatars.length})`} className="media-avatars">
        {avatars.length ? (
          <ul className="avatar-grid">
            {avatars.map((a) => (
              <li key={a.id}>
                <Link href={a.agentProfile ? `/admin/agents/${a.agentProfile.id}` : `/admin/users/${a.id}`}>
                  <span className="avatar avatar-lg">
                    <Image src={a.image!} alt="" width={64} height={64} />
                  </span>
                  <span className="table-sub">{a.name || a.email}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel-empty">No profile pictures yet. Upload agent photos from an agent’s profile page.</p>
        )}
      </Panel>
    </>
  );
}
