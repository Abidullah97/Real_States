import type { Metadata } from "next";
import LocationsManager from "@/components/admin/locations-manager";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import FilterBar from "@/components/dashboard/filter-bar";
import { pageParam, param, type SearchParams } from "@/lib/admin-data";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Locations", robots: { index: false, follow: false } };

const PAGE_SIZE = 25;

export default async function LocationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("/admin/locations");
  const p = await searchParams;
  const q = param(p, "q");
  const province = param(p, "province");
  const city = param(p, "city");
  const usage = param(p, "usage");
  const page = pageParam(p);
  const where = {
    ...(q
      ? {
          OR: [
            { city: { contains: q, mode: "insensitive" as const } },
            { locality: { contains: q, mode: "insensitive" as const } },
            { area: { contains: q, mode: "insensitive" as const } },
            { province: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(province ? { province } : {}),
    ...(city ? { city } : {}),
    ...(usage === "unused" ? { properties: { none: {} } } : usage === "used" ? { properties: { some: {} } } : {}),
  };
  const [rows, total, all] = await Promise.all([
    prisma.location.findMany({ where, include: { _count: { select: { properties: true } } }, orderBy: [{ country: "asc" }, { province: "asc" }, { city: "asc" }, { area: "asc" }, { locality: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.location.count({ where }),
    prisma.location.findMany({ select: { country: true, province: true, city: true, area: true, locality: true } }),
  ]);
  const distinct = (key: keyof (typeof all)[number]) => [...new Set(all.map((l) => l[key]).filter((v): v is string => !!v))].sort();
  const values = { country: distinct("country"), province: distinct("province"), city: distinct("city"), area: distinct("area"), locality: distinct("locality") };

  return (
    <>
      <DashboardPageHeader
        title="Locations"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Locations" }]}
        description="Countries, provinces, cities, areas and neighbourhoods used by listings. Listings reference locations by ID, so edits never break existing records."
      />
      <LocationsManager
        items={rows.map((l) => ({ id: l.id, country: l.country, province: l.province, city: l.city, area: l.area, locality: l.locality, latitude: l.latitude, longitude: l.longitude, listings: l._count.properties }))}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        values={values}
        filters={
          <FilterBar
            action="/admin/locations"
            query={q}
            searchPlaceholder="Search any place name"
            resetHref="/admin/locations"
            selects={[
              { name: "province", label: "Province", value: province, options: [{ value: "", label: "All provinces" }, ...values.province.map((v) => ({ value: v, label: v }))] },
              { name: "city", label: "City", value: city, options: [{ value: "", label: "All cities" }, ...values.city.map((v) => ({ value: v, label: v }))] },
              { name: "usage", label: "Usage", value: usage, options: [{ value: "", label: "Used or unused" }, { value: "used", label: "With listings" }, { value: "unused", label: "Unused" }] },
            ]}
          />
        }
      />
    </>
  );
}
