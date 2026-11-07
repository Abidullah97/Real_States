import { isAdminRole } from "@/lib/roles";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TestimonialsManager from "@/components/admin/testimonials-manager";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-ui";
import { currentPrincipal } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Testimonials", robots: { index: false, follow: false } };

export default async function TestimonialsPage() {
  const principal = await currentPrincipal();
  if (!principal) redirect("/signin");
  if (!isAdminRole(principal.role)) redirect("/dashboard");
  const items = await prisma.testimonial.findMany({ orderBy: [{ position: "asc" }, { createdAt: "desc" }] });
  return (
    <>
      <DashboardPageHeader
        title="Testimonials"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Testimonials" }]}
        description="Curate customer feedback for the homepage. Only published testimonials are shown publicly."
      />
      <TestimonialsManager items={items} />
    </>
  );
}
