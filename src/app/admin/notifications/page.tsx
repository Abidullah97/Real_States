import type { Metadata } from "next";
import NotificationList from "@/components/admin/notification-list";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import Pagination from "@/components/property/pagination";
import { pageParam, type SearchParams } from "@/lib/admin-data";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

const PAGE_SIZE = 30;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const viewer = await requireAdminPage("/admin/notifications");
  const page = pageParam(await searchParams);
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: viewer.id }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.notification.count({ where: { userId: viewer.id } }),
    prisma.notification.count({ where: { userId: viewer.id, readAt: null } }),
  ]);
  return (
    <>
      <DashboardPageHeader
        title="Notifications"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Notifications" }]}
        description="New submissions, registrations, agent applications, inquiries and approval requests. Each administrator has their own read state."
      />
      <NotificationList unread={unread} items={items.map((n) => ({ ...n, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }))} />
      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefFor={(n) => `/admin/notifications${n > 1 ? `?page=${n}` : ""}`} label="Notification pages" />
    </>
  );
}
