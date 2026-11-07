"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUserActions, type UserSummary } from "@/components/admin/user-actions";
import { DataTable } from "@/components/dashboard/dashboard-ui";
import RowActions, { type RowAction } from "@/components/dashboard/row-actions";
import Pagination from "@/components/property/pagination";
import EmptyState from "@/components/ui/empty-state";
import StatusBadge from "@/components/ui/status-badge";
import { formatDate, initials } from "@/lib/format";
import { isAdminRole, type Role } from "@/lib/roles";

export type UserRow = UserSummary & { image: string | null; createdAt: Date | string; listings: number; verified: boolean };

/** Paginated, server-filtered account list. Profiles hold the detailed editing tools. */
export default function UsersManager({ items, total, page, pageSize, viewer, filters }: { items: UserRow[]; total: number; page: number; pageSize: number; viewer: { id: string; role: Role }; filters: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { suspend, activate, remove } = useUserActions(viewer.id);
  const canManage = (u: UserRow) => viewer.role === "SUPER_ADMIN" || !isAdminRole(u.role) || u.id === viewer.id;

  const hrefFor = (p: number) => {
    const q = new URLSearchParams(searchParams.toString());
    if (p > 1) q.set("page", String(p));
    else q.delete("page");
    return `${pathname}?${q}`;
  };

  function actions(u: UserRow): RowAction[] {
    const list: RowAction[] = [{ label: "View profile", icon: "user", onSelect: () => router.push(`/admin/users/${u.id}`) }];
    if (!canManage(u) || u.id === viewer.id) return list;
    list.push(u.suspended ? { label: "Activate account", icon: "user-check", onSelect: () => activate(u) } : { label: "Suspend account", icon: "user-x", onSelect: () => suspend(u) });
    list.push({ label: "Delete account", icon: "trash", tone: "danger", onSelect: () => remove(u) });
    return list;
  }

  return (
    <>
      <div className="table-toolbar property-toolbar">{filters}</div>
      <DataTable
        caption="User accounts"
        rows={items}
        rowKey={(u) => u.id}
        empty={<EmptyState icon="users" title="No matching accounts" description="Try another name, email, role or status." />}
        columns={[
          {
            key: "user",
            header: "Person",
            cell: (u) => (
              <div className="table-property">
                <span className="avatar">{u.image ? <Image src={u.image} alt="" width={40} height={40} /> : initials(u.name || u.email)}</span>
                <span>
                  <Link href={`/admin/users/${u.id}`} className="table-title">
                    {u.name || "Unnamed user"}
                    {u.id === viewer.id && " (you)"}
                  </Link>
                  <span className="table-sub">{u.email}</span>
                </span>
              </div>
            ),
          },
          { key: "role", header: "Role", cell: (u) => <StatusBadge status={u.role} /> },
          { key: "status", header: "Status", cell: (u) => <StatusBadge status={u.suspended ? "SUSPENDED" : "ACTIVE"} label={u.suspended ? "Suspended" : u.verified ? "Active" : "Unverified"} /> },
          { key: "listings", header: "Listings", className: "num", hideOnMobile: true, cell: (u) => u.listings },
          { key: "joined", header: "Registered", hideOnMobile: true, className: "nowrap", cell: (u) => <span className="table-sub">{formatDate(u.createdAt)}</span> },
          { key: "actions", header: "Actions", className: "table-actions", cell: (u) => <RowActions label={u.name || u.email} actions={actions(u)} /> },
        ]}
      />
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} hrefFor={hrefFor} label="User pages" />
    </>
  );
}
