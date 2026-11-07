import type { Metadata } from "next";
import AdminPropertyManager from "@/components/admin/property-manager";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import FilterBar from "@/components/dashboard/filter-bar";
import { getPropertyFormOptions, pageParam, param, propertyRowInclude, toPropertyRow, type SearchParams } from "@/lib/admin-data";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUSES, type ListingStatus } from "@/lib/property-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Manage properties", robots: { index: false, follow: false } };

const PAGE_SIZE = 20;
const SORTS = {
  updated: { updatedAt: "desc" as const },
  created: { createdAt: "desc" as const },
  oldest: { createdAt: "asc" as const },
  price_desc: { price: "desc" as const },
  price_asc: { price: "asc" as const },
};

export default async function AdminProperties({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("/admin/properties");
  const p = await searchParams;
  const q = param(p, "q")?.slice(0, 100);
  const rawStatus = param(p, "status")?.toUpperCase();
  const status = (LISTING_STATUSES as readonly string[]).includes(rawStatus || "") ? (rawStatus as ListingStatus) : undefined;
  const listing = param(p, "listing") === "RENT" ? "RENT" : param(p, "listing") === "SALE" ? "SALE" : undefined;
  const type = param(p, "type");
  const city = param(p, "city");
  const featured = param(p, "featured");
  const sortKey = (param(p, "sort") || "updated") as keyof typeof SORTS;
  const page = pageParam(p);

  // Every filter except status, so the status tab counts reflect the other active filters.
  const base = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { reference: { contains: q, mode: "insensitive" as const } },
            { location: { is: { city: { contains: q, mode: "insensitive" as const } } } },
            { owner: { is: { email: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    ...(listing ? { listingType: listing as "SALE" | "RENT" } : {}),
    ...(type ? { propertyType: type } : {}),
    ...(city ? { location: { is: { city } } } : {}),
    ...(featured === "yes" ? { featured: true } : featured === "no" ? { featured: false } : {}),
  };
  const where = { ...base, ...(status ? { status } : {}) };

  const [rows, total, grouped, options, cities] = await Promise.all([
    prisma.property.findMany({ where, include: propertyRowInclude, orderBy: SORTS[sortKey] ?? SORTS.updated, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.property.count({ where }),
    prisma.property.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    getPropertyFormOptions(),
    prisma.location.findMany({ distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]);
  const counts: Record<string, number> = { ALL: grouped.reduce((s, g) => s + g._count._all, 0) };
  for (const g of grouped) counts[g.status] = g._count._all;

  return (
    <>
      <DashboardPageHeader
        title="Properties"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Properties" }]}
        description="Create, edit, approve, publish, feature and archive listings. Every change is recorded in the activity log."
      />
      <AdminPropertyManager
        items={rows.map(toPropertyRow)}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        status={status || "ALL"}
        counts={counts}
        openCreate={param(p, "new") === "1"}
        options={options}
        detailsBase="/admin/properties"
        filters={
          <FilterBar
            action="/admin/properties"
            query={q}
            searchPlaceholder="Title, reference, city or owner email"
            hidden={{ status }}
            resetHref={status ? `/admin/properties?status=${status}` : "/admin/properties"}
            selects={[
              { name: "listing", label: "Listing type", value: listing, options: [{ value: "", label: "Sale & rent" }, { value: "SALE", label: "For sale" }, { value: "RENT", label: "For rent" }] },
              { name: "type", label: "Category", value: type, options: [{ value: "", label: "All categories" }, ...options.categories.map((c) => ({ value: c, label: c }))] },
              { name: "city", label: "City", value: city, options: [{ value: "", label: "All cities" }, ...cities.map((c) => ({ value: c.city, label: c.city }))] },
              { name: "featured", label: "Featured", value: featured, options: [{ value: "", label: "Featured or not" }, { value: "yes", label: "Featured only" }, { value: "no", label: "Not featured" }] },
              {
                name: "sort",
                label: "Sort",
                value: sortKey === "updated" ? "" : sortKey,
                options: [
                  { value: "", label: "Recently updated" },
                  { value: "created", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                  { value: "price_desc", label: "Price: high to low" },
                  { value: "price_asc", label: "Price: low to high" },
                ],
              },
            ]}
          />
        }
      />
    </>
  );
}
