import { isAdminRole } from "@/lib/roles";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardPageHeader, Panel } from "@/components/dashboard/dashboard-ui";
import ProfileForm from "@/components/forms/profile-form";
import { currentPrincipal } from "@/lib/authorization";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AdminAccountPage() {
  const principal = await currentPrincipal();
  if (!principal) redirect("/signin");
  if (!isAdminRole(principal.role)) redirect("/dashboard");
  return (
    <>
      <DashboardPageHeader title="Profile & account" breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Profile & account" }]} description="Update your display name and password." />
      <Panel title="Account settings">
        <ProfileForm name={principal.name || ""} email={principal.email} />
      </Panel>
    </>
  );
}
