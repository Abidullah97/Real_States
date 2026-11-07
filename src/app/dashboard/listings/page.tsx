import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminPropertyManager from "@/components/admin/property-manager";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import FilterBar from "@/components/dashboard/filter-bar";
import { getPropertyFormOptions, param, propertyRowInclude, toPropertyRow, type SearchParams } from "@/lib/admin-data";
import { currentPrincipal } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your property listings", robots: { index: false, follow: false } };

/** Owners manage their own listings: create drafts, edit them and submit them for review. */
export default async function OwnerListings({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await currentPrincipal();
  if (!user) redirect("/signin?callbackUrl=%2Fdashboard%2Flistings");
  const q = param(await searchParams, "q")?.slice(0, 100);
  const [rows, options] = await Promise.all([
    prisma.property.findMany({
      where: {
        ownerId: user.id,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { reference: { contains: q, mode: "insensitive" as const } },
                { location: { is: { city: { contains: q, mode: "insensitive" as const } } } },
              ],
            }
          : {}),
      },
      include: propertyRowInclude,
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    getPropertyFormOptions(),
  ]);
  return (
    <>
      <DashboardPageHeader
        title="My listings"
        breadcrumbs={[{ label: "Account", href: "/dashboard" }, { label: "My listings" }]}
        description="Create listings, add photos and submit them for review. An administrator approves each listing before it is published."
      />
      <AdminPropertyManager
        items={rows.map(toPropertyRow)}
        isAdmin={isAdminRole(user.role)}
        options={options}
        filters={<FilterBar action="/dashboard/listings" query={q} searchPlaceholder="Search title, reference or city" resetHref="/dashboard/listings" />}
      />
    </>
  );
}
