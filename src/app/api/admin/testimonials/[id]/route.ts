import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { testimonialPatchSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRoles(["ADMIN","SUPER_ADMIN"]);
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const parsed = testimonialPatchSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Please check the testimonial details." }, { status: 400 });
    const existing = await prisma.testimonial.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
    await prisma.testimonial.update({ where: { id }, data: parsed.data });
    await prisma.auditLog.create({ data: { actorId: gate.principal!.id, action: "testimonial.update", entity: "Testimonial", entityId: id, metadata: { published: parsed.data.published } } });
    return NextResponse.json({ message: "Testimonial updated." });
  } catch {
    return NextResponse.json({ error: "Testimonial could not be updated." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRoles(["ADMIN","SUPER_ADMIN"]);
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const result = await prisma.testimonial.deleteMany({ where: { id } });
    if (!result.count) return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
    await prisma.auditLog.create({ data: { actorId: gate.principal!.id, action: "testimonial.delete", entity: "Testimonial", entityId: id } });
    return NextResponse.json({ message: "Testimonial deleted." });
  } catch {
    return NextResponse.json({ error: "Testimonial could not be deleted." }, { status: 503 });
  }
}
