import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { locationSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const parsed = locationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the location details and coordinates." }, { status: 400 });
    const existing = await prisma.location.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Location not found." }, { status: 404 });
    const d = parsed.data;
    await prisma.location.update({
      where: { id },
      data: { country: d.country, province: d.province || null, city: d.city, area: d.area || null, locality: d.locality || null, latitude: d.latitude ?? null, longitude: d.longitude ?? null },
    });
    await prisma.auditLog.create({ data: { actorId: gate.principal!.id, action: "location.update", entity: "Location", entityId: id } });
    return NextResponse.json({ message: "Location updated." });
  } catch {
    return NextResponse.json({ error: "Location could not be updated." }, { status: 503 });
  }
}

/** Only locations with no linked properties can be removed, so no listing loses its address. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const location = await prisma.location.findUnique({ where: { id }, select: { _count: { select: { properties: true } } } });
    if (!location) return NextResponse.json({ error: "Location not found." }, { status: 404 });
    if (location._count.properties > 0) return NextResponse.json({ error: "This location is still used by listings. Move or delete those listings first." }, { status: 409 });
    await prisma.location.delete({ where: { id } });
    await prisma.auditLog.create({ data: { actorId: gate.principal!.id, action: "location.delete", entity: "Location", entityId: id } });
    return NextResponse.json({ message: "Location removed." });
  } catch {
    return NextResponse.json({ error: "Location could not be removed." }, { status: 503 });
  }
}
