import type { Metadata } from "next";
import SiteSettingsForm from "@/components/admin/site-settings-form";
import { DashboardPageHeader, Panel } from "@/components/dashboard/dashboard-ui";
import { requireAdminPage } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Site settings", robots: { index: false, follow: false } };

export default async function SettingsPage() {
  await requireAdminPage("/admin/settings");
  // Read the stored row directly so environment fallbacks are not mistaken for saved values.
  const [settings, stored] = await Promise.all([getSiteSettings(), prisma.siteSettings.findUnique({ where: { id: "site" } })]);
  return (
    <>
      <DashboardPageHeader
        title="Site settings"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Site settings" }]}
        description="Branding, homepage content, SEO and contact details. Saved to the database and applied to the website immediately."
      />
      <Panel title="Website configuration">
        <SiteSettingsForm settings={{ ...settings, instagramUrl: stored?.instagramUrl ?? "", facebookUrl: stored?.facebookUrl ?? "", linkedinUrl: stored?.linkedinUrl ?? "" }} />
      </Panel>
    </>
  );
}
