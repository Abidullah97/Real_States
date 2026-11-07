import DashboardShell, { type NavGroup } from "@/components/dashboard/dashboard-shell";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireAdminPage();
  const [pendingSubmissions, pendingProperties, pendingAgents, newInquiries, unread] = await Promise.all([
    prisma.propertySubmission.count({ where: { status: "PENDING" } }),
    prisma.property.count({ where: { status: "PENDING" } }),
    prisma.agentProfile.count({ where: { status: "PENDING" } }),
    prisma.inquiry.count({ where: { status: "NEW" } }),
    prisma.notification.count({ where: { userId: principal.id, readAt: null } }),
  ]);

  const groups: NavGroup[] = [
    { items: [{ label: "Dashboard", href: "/admin", icon: "dashboard", exact: true }] },
    {
      title: "Listings",
      items: [
        { label: "Properties", href: "/admin/properties", icon: "building" },
        { label: "Approvals", href: "/admin/review", icon: "check-circle", count: pendingSubmissions + pendingProperties },
        { label: "Featured", href: "/admin/featured", icon: "star" },
        { label: "Categories", href: "/admin/categories", icon: "tags" },
        { label: "Locations", href: "/admin/locations", icon: "map-pinned" },
        { label: "Media", href: "/admin/media", icon: "images" },
      ],
    },
    {
      title: "People",
      items: [
        { label: "Users", href: "/admin/users", icon: "users" },
        { label: "Agents", href: "/admin/agents", icon: "briefcase", count: pendingAgents },
        { label: "Inquiries", href: "/admin/inquiries", icon: "inbox", count: newInquiries },
      ],
    },
    {
      title: "Insights",
      items: [
        { label: "Reports", href: "/admin/reports", icon: "chart" },
        { label: "Activity log", href: "/admin/activity", icon: "scroll" },
      ],
    },
    {
      title: "Content",
      items: [
        { label: "Testimonials", href: "/admin/testimonials", icon: "message" },
        { label: "Site settings", href: "/admin/settings", icon: "settings" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Notifications", href: "/admin/notifications", icon: "bell", count: unread },
        { label: "Profile & account", href: "/admin/account", icon: "user", exact: true },
        { label: "Public site", href: "/", icon: "globe", exact: true },
      ],
    },
  ];

  return (
    <ToastProvider>
      <ConfirmProvider>
        <DashboardShell
          groups={groups}
          area={principal.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
          user={{ name: principal.name, email: principal.email, role: principal.role }}
          searchAction="/admin/search"
          searchPlaceholder="Search properties, people, inquiries…"
          tone="dark"
          notifications
        >
          {children}
        </DashboardShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
