import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { testimonialSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const gate = await requireRoles(["ADMIN","SUPER_ADMIN"]);
  if (gate.response) return gate.response;
  try {
    const parsed = testimonialSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Please check the testimonial details." }, { status: 400 });
    const created = await prisma.testimonial.create({ data: parsed.data });
    await prisma.auditLog.create({ data: { actorId: gate.principal!.id, action: "testimonial.create", entity: "Testimonial", entityId: created.id } });
    return NextResponse.json({ message: "Testimonial saved.", id: created.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Testimonial could not be saved." }, { status: 503 });
  }
}
