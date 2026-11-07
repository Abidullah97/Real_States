import { isAdminRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import DashboardShell, { type NavGroup } from "@/components/dashboard/dashboard-shell";
import { FavoritesProvider } from "@/components/property/favorites-provider";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { currentPrincipal } from "@/lib/authorization";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const principal = await currentPrincipal();
  if (!principal) redirect("/signin?callbackUrl=%2Fdashboard");

  const groups: NavGroup[] = [
    {
      items: [
        { label: "Overview", href: "/dashboard", icon: "dashboard", exact: true },
        { label: "Saved homes", href: "/dashboard#saved", icon: "heart" },
        { label: "Enquiries", href: "/dashboard#inquiries", icon: "message" },
        { label: "Submissions", href: "/dashboard#submissions", icon: "clipboard" },
        { label: "My listings", href: "/dashboard/listings", icon: "building" },
        { label: "Agent profile", href: "/dashboard#agent", icon: "briefcase" },
        { label: "Settings", href: "/dashboard#settings", icon: "settings" },
      ],
    },
    {
      title: "Explore",
      items: [
        { label: "Browse properties", href: "/properties", icon: "search", exact: true },
        { label: "List a property", href: "/sell", icon: "plus", exact: true },
        ...(isAdminRole(principal.role) ? [{ label: "Administration", href: "/admin", icon: "shield", exact: true }] : []),
      ],
    },
  ];

  return (
    <ToastProvider>
      <ConfirmProvider>
        <FavoritesProvider signedIn>
          <DashboardShell groups={groups} area="Account" user={{ name: principal.name, email: principal.email, role: principal.role }}>
            {children}
          </DashboardShell>
        </FavoritesProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
