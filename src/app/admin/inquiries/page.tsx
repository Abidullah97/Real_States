import type { Metadata } from "next";
import InquiryDesk from "@/components/admin/inquiry-desk";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import FilterBar from "@/components/dashboard/filter-bar";
import { pageParam, param, type SearchParams } from "@/lib/admin-data";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inquiries", robots: { index: false, follow: false } };

const PAGE_SIZE = 25;
const STATUSES = ["NEW", "READ", "CONTACTED", "QUALIFIED", "CLOSED", "SPAM"] as const;

export default async function Inquiries({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("/admin/inquiries");
  const p = await searchParams;
  const q = param(p, "q");
  const raw = param(p, "status")?.toUpperCase();
  const status = (STATUSES as readonly string[]).includes(raw || "") ? (raw as (typeof STATUSES)[number]) : undefined;
  const assigned = param(p, "assigned");
  const page = pageParam(p);
  const openId = param(p, "open");

  const base = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { message: { contains: q, mode: "insensitive" as const } },
            { property: { is: { title: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    ...(assigned === "yes" ? { assignedToId: { not: null } } : assigned === "no" ? { assignedToId: null } : {}),
  };
  // A deep link to one inquiry must find it regardless of the current filters.
  const where = openId ? { id: openId } : { ...base, ...(status ? { status } : {}) };
  const [items, total, grouped, agents] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: { property: { select: { id: true, title: true, reference: true } }, assignedTo: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: openId ? 0 : (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.inquiry.count({ where }),
    prisma.inquiry.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    prisma.user.findMany({ where: { role: "AGENT", disabledAt: null }, select: { email: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const counts: Record<string, number> = { ALL: grouped.reduce((s, g) => s + g._count._all, 0) };
  for (const g of grouped) counts[g.status] = g._count._all;

  return (
    <>
      <DashboardPageHeader
        title="Inquiries"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Inquiries" }]}
        description="Customer messages from listing pages and the contact form. Opening a new inquiry marks it as read."
      />
      <InquiryDesk
        items={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        status={status || "ALL"}
        counts={counts}
        agents={agents.map((a) => ({ email: a.email, name: a.name || a.email }))}
        openId={openId}
        filters={
          <FilterBar
            action="/admin/inquiries"
            query={q}
            searchPlaceholder="Name, email, message or property"
            hidden={{ status }}
            resetHref="/admin/inquiries"
            selects={[{ name: "assigned", label: "Assignment", value: assigned, options: [{ value: "", label: "Assigned or not" }, { value: "yes", label: "Assigned to an agent" }, { value: "no", label: "Unassigned" }] }]}
          />
        }
      />
    </>
  );
}
