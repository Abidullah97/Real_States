import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { requireRoles } from "@/lib/authorization";
import { isValidCategory } from "@/lib/categories";
import { destroyCloudinaryImage } from "@/lib/cloudinary";
import { notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { describePropertyIssues, isAssignableAgent, patchPropertySchema, resolveLocation, statusAction } from "@/lib/property-admin";
import { isAdminRole } from "@/lib/roles";

/** Status changes an owner may make themselves: submit a draft for review, or withdraw it. */
const OWNER_TRANSITIONS: Record<string, string[]> = { DRAFT: ["PENDING"], REJECTED: ["PENDING", "DRAFT"], PENDING: ["DRAFT"] };
const ADMIN_ONLY_FIELDS = ["featured", "featuredOrder", "featuredUntil", "agentId", "rejectionReason"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRoles(["ADMIN", "SUPER_ADMIN", "AGENT", "OWNER", "USER"]);
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const parsed = patchPropertySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: describePropertyIssues(parsed.error, "Invalid property changes.") }, { status: 400 });
    const d = parsed.data;
    const property = await prisma.property.findUnique({ where: { id }, select: { id: true, ownerId: true, status: true, locationId: true, title: true, reference: true, publishedAt: true, featured: true } });
    if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });
    const actor = gate.principal!;
    const admin = isAdminRole(actor.role);

    if (!admin) {
      if (property.ownerId !== actor.id) return NextResponse.json({ error: "You can only edit your own listings." }, { status: 403 });
      if (ADMIN_ONLY_FIELDS.some((f) => d[f] !== undefined)) return NextResponse.json({ error: "Only administrators can feature listings, assign agents or record review decisions." }, { status: 403 });
      if (d.status && !(OWNER_TRANSITIONS[property.status] || []).includes(d.status)) return NextResponse.json({ error: "Only administrators can publish or change this listing's status." }, { status: 403 });
    }
    if (d.status === "REJECTED" && !d.rejectionReason) return NextResponse.json({ error: "Give a reason so the owner knows what to change." }, { status: 400 });
    if (d.propertyType && !(await isValidCategory(d.propertyType))) return NextResponse.json({ error: "Choose a valid property category." }, { status: 400 });
    if (d.agentId && !(await isAssignableAgent(d.agentId))) return NextResponse.json({ error: "Select an active agent." }, { status: 400 });

    const { city, locality, latitude, longitude, features, country, province, locationArea, ...rest } = d;
    const data: Record<string, unknown> = { ...rest };
    if (d.status && d.status !== property.status) {
      if (d.status === "PUBLISHED") data.publishedAt = property.publishedAt ?? new Date();
      else if (!["SOLD", "RENTED"].includes(d.status)) data.publishedAt = null;
      if (d.status !== "REJECTED") data.rejectionReason = null;
    }
    if (d.featured === false) {
      data.featuredUntil = null;
      data.featuredOrder = 0;
    }
    if (city || locality !== undefined || latitude !== undefined || longitude !== undefined || province !== undefined || locationArea !== undefined || country) {
      const prior = await prisma.location.findUnique({ where: { id: property.locationId } });
      const location = await resolveLocation({
        country: country || prior?.country,
        province: province === undefined ? prior?.province : province,
        city: city || prior?.city || "Unknown",
        area: locationArea === undefined ? prior?.area : locationArea,
        locality: locality === undefined ? prior?.locality : locality,
        latitude,
        longitude,
      });
      data.locationId = location.id;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.property.update({ where: { id }, data });
      if (features) {
        await tx.propertyFeature.deleteMany({ where: { propertyId: id } });
        if (features.length) await tx.propertyFeature.createMany({ data: [...new Set(features)].map((name) => ({ propertyId: id, name })) });
      }
      return row;
    });

    const action = d.status && d.status !== property.status ? statusAction(property.status, d.status) : d.featured !== undefined && d.featured !== property.featured ? (d.featured ? "property.feature" : "property.unfeature") : "property.update";
    await logAction(actor.id, action, "Property", id, { from: property.status, to: updated.status, reason: d.rejectionReason, fields: Object.keys(d) });
    if (d.status === "PENDING" && property.status !== "PENDING") await notifyAdmins("approval_request", `Listing awaiting approval: ${property.title}`, property.reference, `/admin/properties/${id}`);

    const verb: Record<string, string> = {
      "property.approve": "approved and published",
      "property.publish": "published",
      "property.reject": "rejected",
      "property.submit_review": "submitted for review",
      "property.mark_sold": "marked as sold",
      "property.mark_rented": "marked as rented",
      "property.archive": "archived",
      "property.unpublish": "moved to drafts",
      "property.restore": "restored as a draft",
      "property.withdraw": "withdrawn to drafts",
      "property.feature": "featured",
      "property.unfeature": "removed from featured",
    };
    return NextResponse.json({ id: updated.id, status: updated.status, message: verb[action] ? `${updated.reference} ${verb[action]}.` : "Property updated." });
  } catch {
    return NextResponse.json({ error: "Property could not be updated." }, { status: 503 });
  }
}

/** Permanently deletes an archived listing and its stored images. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRoles(["ADMIN", "SUPER_ADMIN"]);
  if (gate.response) return gate.response;
  if (new URL(request.url).searchParams.get("confirm") !== "delete") return NextResponse.json({ error: "Explicit delete confirmation is required." }, { status: 400 });
  try {
    const { id } = await params;
    const property = await prisma.property.findUnique({ where: { id }, select: { id: true, status: true, title: true, reference: true, images: { select: { publicId: true } } } });
    if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });
    if (property.status !== "ARCHIVED" && property.status !== "REJECTED") return NextResponse.json({ error: "Archive or reject the listing before deleting it." }, { status: 409 });
    await prisma.property.delete({ where: { id } });
    await logAction(gate.principal!.id, "property.delete", "Property", id, { title: property.title, reference: property.reference });
    // Remove the stored files too, so deleted listings don't leave orphaned media behind.
    await Promise.all(property.images.filter((i) => i.publicId).map((i) => destroyCloudinaryImage(i.publicId!).catch(() => {})));
    return NextResponse.json({ message: "Property deleted." });
  } catch {
    return NextResponse.json({ error: "Property could not be deleted." }, { status: 503 });
  }
}
