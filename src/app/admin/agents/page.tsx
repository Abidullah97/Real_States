import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AddAgentButton } from "@/components/admin/agent-forms";
import { DashboardPageHeader, DataTable } from "@/components/dashboard/dashboard-ui";
import FilterBar from "@/components/dashboard/filter-bar";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import StatusBadge from "@/components/ui/status-badge";
import { param, type SearchParams } from "@/lib/admin-data";
import { formatDate, initials } from "@/lib/format";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agents", robots: { index: false, follow: false } };

const TABS = [
  { value: "APPROVED", label: "Agents" },
  { value: "PENDING", label: "Applications" },
  { value: "REJECTED", label: "Rejected" },
] as const;

export default async function AdminAgents({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdminPage("/admin/agents");
  const p = await searchParams;
  const status = TABS.find((t) => t.value === param(p, "status")?.toUpperCase())?.value ?? "APPROVED";
  const q = param(p, "q");
  const search = q
    ? { OR: [{ user: { is: { name: { contains: q, mode: "insensitive" as const } } } }, { user: { is: { email: { contains: q, mode: "insensitive" as const } } } }, { location: { contains: q, mode: "insensitive" as const } }, { specialization: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const [rows, grouped] = await Promise.all([
    prisma.agentProfile.findMany({
      where: { status, ...search },
      orderBy: status === "PENDING" ? { appliedAt: "asc" } : { appliedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            disabledAt: true,
            _count: { select: { properties: { where: { status: "PUBLISHED" } }, agentListings: { where: { status: "PUBLISHED" } }, assignedInquiries: true } },
          },
        },
      },
    }),
    prisma.agentProfile.groupBy({ by: ["status"], where: search, _count: { _all: true } }),
  ]);
  const count = (s: string) => grouped.find((g) => g.status === s)?._count._all ?? 0;

  return (
    <>
      <DashboardPageHeader
        title="Agents"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Agents" }]}
        description="Add agents, review applications, verify credentials and track listings and leads per agent."
        actions={<AddAgentButton startOpen={param(p, "new") === "1"} />}
      />
      <nav className="status-tabs" aria-label="Agent status">
        {TABS.map((t) => (
          <Link key={t.value} href={`/admin/agents?status=${t.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={status === t.value ? "page" : undefined}>
            {t.label} <span className="num">{count(t.value)}</span>
          </Link>
        ))}
      </nav>
      <div className="table-toolbar property-toolbar">
        <FilterBar action="/admin/agents" query={q} searchPlaceholder="Name, email, location or specialization" hidden={{ status }} resetHref={`/admin/agents?status=${status}`} />
      </div>
      <DataTable
        caption="Agents"
        rows={rows}
        rowKey={(a) => a.id}
        empty={
          <EmptyState
            icon="briefcase"
            title={status === "PENDING" ? "No pending applications" : status === "REJECTED" ? "No rejected applications" : "No agents yet"}
            description={status === "PENDING" ? "Members can apply to become agents from their dashboard." : "Add an agent or approve an application to get started."}
          />
        }
        columns={[
          {
            key: "agent",
            header: "Agent",
            cell: (a) => (
              <div className="table-property">
                <span className="avatar">{a.user.image ? <Image src={a.user.image} alt="" width={40} height={40} /> : initials(a.user.name || a.user.email)}</span>
                <span>
                  <Link href={`/admin/agents/${a.id}`} className="table-title">
                    {a.user.name || a.user.email}
                  </Link>
                  <span className="table-sub">{a.user.email}</span>
                </span>
              </div>
            ),
          },
          { key: "location", header: "Location", hideOnMobile: true, cell: (a) => <span className="table-sub">{a.location || "—"}</span> },
          { key: "spec", header: "Specialization", hideOnMobile: true, cell: (a) => <span className="table-sub table-clamp">{a.specialization || "—"}</span> },
          { key: "exp", header: "Experience", className: "num", hideOnMobile: true, cell: (a) => (a.experienceYears !== null ? `${a.experienceYears} yrs` : "—") },
          { key: "listings", header: "Live listings", className: "num", cell: (a) => a.user._count.properties + a.user._count.agentListings },
          { key: "leads", header: "Leads", className: "num", hideOnMobile: true, cell: (a) => a.user._count.assignedInquiries },
          {
            key: "status",
            header: status === "PENDING" ? "Applied" : "Status",
            cell: (a) =>
              status === "PENDING" ? (
                <span className="table-sub">{formatDate(a.appliedAt)}</span>
              ) : (
                <span className="table-badges">
                  <StatusBadge status={a.user.disabledAt ? "SUSPENDED" : a.status} label={a.user.disabledAt ? "Inactive" : undefined} />
                  {a.verifiedAt && (
                    <span className="badge badge-accent">
                      <Icon name="shield" size={12} /> Verified
                    </span>
                  )}
                </span>
              ),
          },
          {
            key: "actions",
            header: "Actions",
            className: "table-actions",
            cell: (a) => (
              <Link href={`/admin/agents/${a.id}`} className="btn btn-secondary btn-sm">
                {status === "PENDING" ? "Review" : "Manage"}
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}
