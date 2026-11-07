import type { Metadata } from "next";
import UsersManager from "@/components/admin/users-manager";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import FilterBar from "@/components/dashboard/filter-bar";
import { pageParam, param, type SearchParams } from "@/lib/admin-data";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ALL_ROLES, ROLE_LABELS, type Role } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Users", robots: { index: false, follow: false } };

const PAGE_SIZE = 25;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const viewer = await requireAdminPage("/admin/users");
  const p = await searchParams;
  const q = param(p, "q");
  const roleParam = param(p, "role") as Role | undefined;
  const role = roleParam && ALL_ROLES.includes(roleParam) ? roleParam : undefined;
  const status = param(p, "status");
  const sort = param(p, "sort");
  const page = pageParam(p);
  const where = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(role ? { role } : {}),
    ...(status === "suspended" ? { disabledAt: { not: null } } : status === "active" ? { disabledAt: null, emailVerified: { not: null } } : status === "unverified" ? { emailVerified: null } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, image: true, disabledAt: true, emailVerified: true, createdAt: true, _count: { select: { properties: true } } },
      orderBy: sort === "oldest" ? { createdAt: "asc" } : sort === "name" ? { name: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);
  return (
    <>
      <DashboardPageHeader
        title="Users"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users" }]}
        description={`${total.toLocaleString("en-US")} account${total === 1 ? "" : "s"}. Open a profile to edit details, change roles, suspend or delete. Only a Super Admin can manage administrators.`}
      />
      <UsersManager
        viewer={{ id: viewer.id, role: viewer.role }}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        items={rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, image: u.image, suspended: !!u.disabledAt, verified: !!u.emailVerified, createdAt: u.createdAt, listings: u._count.properties }))}
        filters={
          <FilterBar
            action="/admin/users"
            query={q}
            searchPlaceholder="Name or email"
            resetHref="/admin/users"
            selects={[
              { name: "role", label: "Role", value: role, options: [{ value: "", label: "All roles" }, ...ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))] },
              { name: "status", label: "Status", value: status, options: [{ value: "", label: "Any status" }, { value: "active", label: "Active" }, { value: "unverified", label: "Email not verified" }, { value: "suspended", label: "Suspended" }] },
              { name: "sort", label: "Sort", value: sort, options: [{ value: "", label: "Newest first" }, { value: "oldest", label: "Oldest first" }, { value: "name", label: "Name A–Z" }] },
            ]}
          />
        }
      />
    </>
  );
}
