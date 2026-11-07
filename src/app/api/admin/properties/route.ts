import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { logAction } from "@/lib/audit";
import { requireRoles } from "@/lib/authorization";
import { isValidCategory, slugify } from "@/lib/categories";
import { notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { createPropertySchema, describePropertyIssues, isAssignableAgent, LISTING_STATUSES, resolveLocation, type ListingStatus } from "@/lib/property-admin";
import { isAdminRole } from "@/lib/roles";

const ANY_SIGNED_IN = ["ADMIN", "SUPER_ADMIN", "AGENT", "OWNER", "USER"] as const;

/** Lists properties: everything for administrators, only owned listings for everyone else. */
export async function GET(request: Request) {
  const gate = await requireRoles([...ANY_SIGNED_IN]);
  if (gate.response) return gate.response;
  try {
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status")?.toUpperCase();
    const status = (LISTING_STATUSES as readonly string[]).includes(statusParam || "") ? (statusParam as ListingStatus) : undefined;
    const search = url.searchParams.get("q") || undefined;
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const where = {
      ...(status ? { status } : {}),
      ...(!isAdminRole(gate.principal!.role) ? { ownerId: gate.principal!.id } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" as const } }, { reference: { contains: search, mode: "insensitive" as const } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.property.findMany({ where, include: { location: true, images: { orderBy: { position: "asc" }, take: 1 } }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * 20, take: 20 }),
      prisma.property.count({ where }),
    ]);
    return NextResponse.json({ items, total, page, pageSize: 20 });
  } catch {
    return NextResponse.json({ error: "Properties could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const gate = await requireRoles([...ANY_SIGNED_IN]);
  if (gate.response) return gate.response;
  try {
    const parsed = createPropertySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: describePropertyIssues(parsed.error) }, { status: 400 });
    const d = parsed.data;
    const admin = isAdminRole(gate.principal!.role);
    if (!admin && (d.status === "PUBLISHED" || d.featured || d.ownerEmail || d.agentId)) {
      return NextResponse.json({ error: "Only administrators can publish, feature, assign agents or assign a listing to another account." }, { status: 403 });
    }
    if (!(await isValidCategory(d.propertyType))) return NextResponse.json({ error: "Choose a valid property category." }, { status: 400 });
    if (d.agentId && !(await isAssignableAgent(d.agentId))) return NextResponse.json({ error: "Select an active agent." }, { status: 400 });
    const owner = d.ownerEmail && admin ? await prisma.user.findUnique({ where: { email: d.ownerEmail.toLowerCase() }, select: { id: true } }) : null;
    if (d.ownerEmail && !owner) return NextResponse.json({ error: "The owner account was not found." }, { status: 400 });

    const location = await resolveLocation({ country: d.country, province: d.province, city: d.city, area: d.locationArea, locality: d.locality, latitude: d.latitude, longitude: d.longitude });
    const base = slugify(d.title) || `home-${randomUUID().slice(0, 8)}`;
    const status = d.status;
    const item = await prisma.property.create({
      data: {
        reference: `EH-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
        slug: `${base}-${randomUUID().slice(0, 6)}`,
        title: d.title,
        description: d.description,
        listingType: d.listingType,
        propertyType: d.propertyType,
        price: d.price,
        currency: d.currency,
        area: d.area,
        areaUnit: d.areaUnit,
        bedrooms: d.bedrooms,
        bathrooms: d.bathrooms,
        parking: d.parking,
        address: d.address || null,
        featured: admin && d.featured,
        featuredOrder: admin ? d.featuredOrder : 0,
        featuredUntil: admin ? (d.featuredUntil ?? null) : null,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        ownerId: admin ? owner?.id || null : gate.principal!.id,
        agentId: admin ? d.agentId || null : null,
        locationId: location.id,
        features: { create: [...new Set(d.features)].map((name) => ({ name })) },
      },
    });
    await logAction(gate.principal!.id, "property.create", "Property", item.id, { status: item.status, title: item.title });
    if (status === "PENDING") await notifyAdmins("approval_request", `Listing awaiting approval: ${item.title}`, item.reference, `/admin/properties/${item.id}`);
    return NextResponse.json({ id: item.id, slug: item.slug, message: "Property saved." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Property could not be saved." }, { status: 503 });
  }
}
