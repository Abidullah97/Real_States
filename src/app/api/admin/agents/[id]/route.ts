import { NextResponse } from "next/server";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";

const reviewSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(5).max(500) }),
  z.object({ action: z.literal("assign"), propertyIds: z.array(z.string().max(60)).min(1).max(100) }),
  z.object({ action: z.literal("unassign"), propertyId: z.string().max(60) }),
]);

/** Reviews agent applications and manages which listings an agent is responsible for. `id` is the agent profile id. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid agent action." }, { status: 400 });
    const profile = await prisma.agentProfile.findUnique({ where: { id }, include: { user: { select: { id: true, name: true, role: true, disabledAt: true } } } });
    if (!profile) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    const d = parsed.data;
    const actor = gate.principal!.id;

    if (d.action === "approve") {
      await prisma.$transaction([
        prisma.agentProfile.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date(), rejectionReason: null } }),
        // Approval grants the Agent role, but never demotes an administrator.
        ...(isAdminRole(profile.user.role) ? [] : [prisma.user.update({ where: { id: profile.userId }, data: { role: "AGENT" } })]),
      ]);
      await logAction(actor, "agent.approve", "User", profile.userId);
      return NextResponse.json({ message: `${profile.user.name || "Agent"} approved.` });
    }
    if (d.action === "reject") {
      await prisma.$transaction([
        prisma.agentProfile.update({ where: { id }, data: { status: "REJECTED", reviewedAt: new Date(), rejectionReason: d.reason } }),
        ...(profile.user.role === "AGENT" ? [prisma.user.update({ where: { id: profile.userId }, data: { role: "USER" } })] : []),
      ]);
      await logAction(actor, "agent.reject", "User", profile.userId, { reason: d.reason });
      return NextResponse.json({ message: "Application rejected." });
    }
    if (profile.user.role !== "AGENT" || profile.user.disabledAt) return NextResponse.json({ error: "Only active, approved agents can be assigned listings." }, { status: 409 });
    if (d.action === "assign") {
      const result = await prisma.property.updateMany({ where: { id: { in: d.propertyIds } }, data: { agentId: profile.userId } });
      await logAction(actor, "agent.assign_properties", "User", profile.userId, { count: result.count });
      return NextResponse.json({ message: `${result.count} listing${result.count === 1 ? "" : "s"} assigned.` });
    }
    const result = await prisma.property.updateMany({ where: { id: d.propertyId, agentId: profile.userId }, data: { agentId: null } });
    await logAction(actor, "agent.unassign_property", "Property", d.propertyId);
    return NextResponse.json({ message: result.count ? "Listing unassigned." : "That listing was not assigned to this agent." });
  } catch {
    return NextResponse.json({ error: "Agent could not be updated." }, { status: 503 });
  }
}
