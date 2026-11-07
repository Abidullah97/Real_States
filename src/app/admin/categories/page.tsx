import type { Metadata } from "next";
import CategoriesManager from "@/components/admin/categories-manager";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories", robots: { index: false, follow: false } };

export default async function CategoriesPage() {
  await requireAdminPage("/admin/categories");
  const [categories, all, published] = await Promise.all([
    prisma.propertyCategory.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
    prisma.property.groupBy({ by: ["propertyType"], _count: { _all: true } }),
    prisma.property.groupBy({ by: ["propertyType"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
  ]);
  const count = (rows: typeof all, name: string) => rows.find((r) => r.propertyType === name)?._count._all ?? 0;
  return (
    <>
      <DashboardPageHeader
        title="Categories"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Categories" }]}
        description="Property categories used by listing forms, search filters and the homepage. Renames and deletions keep existing listings intact."
      />
      <CategoriesManager items={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, position: c.position, total: count(all, c.name), published: count(published, c.name) }))} />
    </>
  );
}
