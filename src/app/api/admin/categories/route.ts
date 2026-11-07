import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { slugify } from "@/lib/categories";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const parsed = categorySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Category names need 2–60 characters." }, { status: 400 });
    const { name, description, position } = parsed.data;
    const slug = slugify(name);
    const clash = await prisma.propertyCategory.findFirst({ where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }] }, select: { id: true } });
    if (clash) return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    const created = await prisma.propertyCategory.create({ data: { name, slug, description: description || null, position } });
    await logAction(gate.principal!.id, "category.create", "PropertyCategory", created.id, { name });
    return NextResponse.json({ message: `Category “${name}” created.`, id: created.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Category could not be created." }, { status: 503 });
  }
}
