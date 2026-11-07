import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { slugify } from "@/lib/categories";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation";

/** Renames update every listing that uses the category in the same transaction, so no record is orphaned. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const parsed = categorySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Category names need 2–60 characters." }, { status: 400 });
    const current = await prisma.propertyCategory.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    const { name, description, position } = parsed.data;
    const slug = slugify(name);
    const clash = await prisma.propertyCategory.findFirst({ where: { id: { not: id }, OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }] }, select: { id: true } });
    if (clash) return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    const [, moved] = await prisma.$transaction([
      prisma.propertyCategory.update({ where: { id }, data: { name, slug, description: description || null, position } }),
      prisma.property.updateMany({ where: { propertyType: current.name }, data: { propertyType: name } }),
    ]);
    await logAction(gate.principal!.id, "category.update", "PropertyCategory", id, { from: current.name, to: name, listingsUpdated: moved.count });
    return NextResponse.json({ message: current.name === name ? "Category updated." : `Renamed to “${name}”; ${moved.count} listing${moved.count === 1 ? "" : "s"} updated.` });
  } catch {
    return NextResponse.json({ error: "Category could not be updated." }, { status: 503 });
  }
}

/** A category in use can only be deleted by moving its listings to another category first. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const moveTo = new URL(request.url).searchParams.get("moveTo");
    const current = await prisma.propertyCategory.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    const inUse = await prisma.property.count({ where: { propertyType: current.name } });
    let target: { name: string } | null = null;
    if (inUse) {
      if (!moveTo) return NextResponse.json({ error: `${inUse} listing${inUse === 1 ? " uses" : "s use"} this category. Choose a category to move them to.`, inUse }, { status: 409 });
      target = await prisma.propertyCategory.findUnique({ where: { id: moveTo }, select: { name: true } });
      if (!target || moveTo === id) return NextResponse.json({ error: "Choose a different, existing category." }, { status: 400 });
    }
    await prisma.$transaction([
      ...(target ? [prisma.property.updateMany({ where: { propertyType: current.name }, data: { propertyType: target.name } })] : []),
      prisma.propertyCategory.delete({ where: { id } }),
    ]);
    await logAction(gate.principal!.id, "category.delete", "PropertyCategory", id, { name: current.name, movedTo: target?.name, listingsMoved: inUse });
    return NextResponse.json({ message: target ? `Deleted; ${inUse} listing${inUse === 1 ? "" : "s"} moved to “${target.name}”.` : "Category deleted." });
  } catch {
    return NextResponse.json({ error: "Category could not be deleted." }, { status: 503 });
  }
}
