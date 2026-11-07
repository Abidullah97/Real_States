import { NextResponse } from "next/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requireRoles } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";

const schema = z.object({
  status: z.enum(["NEW", "READ", "CONTACTED", "QUALIFIED", "CLOSED", "SPAM"]).optional(),
  internalNotes: z.string().max(5000).optional(),
  assignedToEmail: z.email().nullable().optional(),
});

/** Admins manage any inquiry; agents may update inquiries assigned to them or about their own listings. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRoles(["ADMIN", "SUPER_ADMIN", "AGENT"]);
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid inquiry update." }, { status: 400 });
    const actor = gate.principal!;
    const inquiry = await prisma.inquiry.findUnique({ where: { id }, include: { property: { select: { ownerId: true, agentId: true } } } });
    if (!inquiry) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    const admin = isAdminRole(actor.role);
    if (!admin && inquiry.assignedToId !== actor.id && inquiry.property?.ownerId !== actor.id && inquiry.property?.agentId !== actor.id) {
      return NextResponse.json({ error: "This inquiry is not assigned to you." }, { status: 403 });
    }
    let assignedToId: string | null | undefined;
    if (parsed.data.assignedToEmail !== undefined) {
      if (!admin) return NextResponse.json({ error: "Only administrators can assign leads." }, { status: 403 });
      if (parsed.data.assignedToEmail) {
        const agent = await prisma.user.findUnique({ where: { email: parsed.data.assignedToEmail.toLowerCase() }, select: { id: true, role: true, disabledAt: true } });
        if (!agent || agent.role !== "AGENT" || agent.disabledAt) return NextResponse.json({ error: "Select an active agent account." }, { status: 400 });
        assignedToId = agent.id;
      } else assignedToId = null;
    }
    const updated = await prisma.inquiry.update({
      where: { id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.internalNotes !== undefined ? { internalNotes: parsed.data.internalNotes } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
      },
    });
    // Opening an inquiry marks it read automatically; that alone is not worth an audit entry.
    const onlyRead = Object.keys(parsed.data).length === 1 && parsed.data.status === "READ";
    if (!onlyRead) await logAction(actor.id, "inquiry.update", "Inquiry", id, { status: updated.status, assigned: assignedToId !== undefined });
    return NextResponse.json({ message: "Inquiry updated.", status: updated.status });
  } catch {
    return NextResponse.json({ error: "Inquiry could not be updated." }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRoles(["ADMIN", "SUPER_ADMIN"]);
  if (gate.response) return gate.response;
  if (new URL(request.url).searchParams.get("confirm") !== "delete") return NextResponse.json({ error: "Explicit delete confirmation is required." }, { status: 400 });
  try {
    const { id } = await params;
    const inquiry = await prisma.inquiry.findUnique({ where: { id }, select: { email: true, status: true } });
    if (!inquiry) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    await prisma.inquiry.delete({ where: { id } });
    await logAction(gate.principal!.id, "inquiry.delete", "Inquiry", id, { status: inquiry.status });
    return NextResponse.json({ message: "Inquiry deleted." });
  } catch {
    return NextResponse.json({ error: "Inquiry could not be deleted." }, { status: 503 });
  }
}
