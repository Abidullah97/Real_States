import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { locationRenameSchema, locationSchema } from "@/lib/validation";

/** Creates a location (country › province › city › area › neighbourhood) for future listings. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const parsed = locationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "A location needs at least a country and city." }, { status: 400 });
    const d = parsed.data;
    const locality = d.locality || null;
    const exists = await prisma.location.findFirst({ where: { country: d.country, city: d.city, locality }, select: { id: true } });
    if (exists) return NextResponse.json({ error: "That location already exists." }, { status: 409 });
    const created = await prisma.location.create({
      data: { country: d.country, province: d.province || null, city: d.city, area: d.area || null, locality, latitude: d.latitude ?? null, longitude: d.longitude ?? null },
    });
    await logAction(gate.principal!.id, "location.create", "Location", created.id, { city: d.city, locality });
    return NextResponse.json({ message: "Location created.", id: created.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Location could not be created." }, { status: 503 });
  }
}

/** Renames one level of the hierarchy everywhere it appears (e.g. a city spelling), without touching listings. */
export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const parsed = locationRenameSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter the new name (at least 2 characters)." }, { status: 400 });
    const { level, from, to } = parsed.data;
    const result = await prisma.location.updateMany({ where: { [level]: from }, data: { [level]: to } });
    if (!result.count) return NextResponse.json({ error: "No locations matched that name." }, { status: 404 });
    await logAction(gate.principal!.id, "location.rename", "Location", `${level}:${from}`, { level, from, to, count: result.count });
    return NextResponse.json({ message: `Renamed ${level} “${from}” to “${to}” in ${result.count} location${result.count === 1 ? "" : "s"}.` });
  } catch {
    return NextResponse.json({ error: "Locations could not be renamed." }, { status: 503 });
  }
}
