import { NextResponse } from "next/server";
import { logAction } from "@/lib/audit";
import { checkAccountChange, requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { userUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const parsed = userUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid account update." }, { status: 400 });
    const d = parsed.data;
    const target = await prisma.user.findUnique({ where: { id }, include: { agentProfile: true } });
    if (!target) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const roleChange = d.role && d.role !== target.role ? d.role : undefined;
    const suspendChange = d.suspended !== undefined && d.suspended !== !!target.disabledAt ? d.suspended : undefined;
    const denied = await checkAccountChange(gate.principal!, target, { role: roleChange, suspend: suspendChange === true });
    if (denied) return NextResponse.json({ error: denied }, { status: denied.startsWith("This is the last") ? 409 : 403 });
    if (d.email && d.email.toLowerCase() !== target.email) {
      const taken = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() }, select: { id: true } });
      if (taken) return NextResponse.json({ error: "Another account already uses that email address." }, { status: 409 });
    }

    const profileFields = ["phone", "bio", "location", "experienceYears", "specialization", "verified"] as const;
    const touchesProfile = profileFields.some((f) => d[f] !== undefined);
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          ...(d.name ? { name: d.name } : {}),
          ...(d.email ? { email: d.email.toLowerCase() } : {}),
          ...(roleChange ? { role: roleChange } : {}),
          ...(suspendChange !== undefined ? { disabledAt: suspendChange ? new Date() : null } : {}),
        },
      });
      const becomesAgent = roleChange === "AGENT";
      if ((becomesAgent || touchesProfile) && (target.agentProfile || becomesAgent)) {
        const profile = {
          ...(d.phone !== undefined ? { phone: d.phone || null } : {}),
          ...(d.bio !== undefined ? { bio: d.bio || null } : {}),
          ...(d.location !== undefined ? { location: d.location || null } : {}),
          ...(d.experienceYears !== undefined ? { experienceYears: d.experienceYears } : {}),
          ...(d.specialization !== undefined ? { specialization: d.specialization || null } : {}),
          ...(d.verified !== undefined ? { verifiedAt: d.verified ? (target.agentProfile?.verifiedAt ?? new Date()) : null } : {}),
        };
        if (target.agentProfile) await tx.agentProfile.update({ where: { userId: id }, data: { ...profile, ...(becomesAgent ? { status: "APPROVED", reviewedAt: new Date() } : {}) } });
        else await tx.agentProfile.create({ data: { userId: id, status: "APPROVED", reviewedAt: new Date(), ...profile } });
      }
      return user;
    });

    const action = suspendChange === true ? "user.suspend" : suspendChange === false ? "user.activate" : roleChange ? "user.role_change" : "user.update";
    await logAction(gate.principal!.id, action, "User", id, { email: updated.email, from: roleChange ? target.role : undefined, to: roleChange, fields: Object.keys(d) });
    const message = action === "user.suspend" ? "Account suspended." : action === "user.activate" ? "Account activated." : "Account updated.";
    return NextResponse.json({ message, role: updated.role });
  } catch {
    return NextResponse.json({ error: "Account could not be updated." }, { status: 503 });
  }
}

/**
 * Deletes an account. Listings the person owned or managed are kept (their owner/agent is cleared),
 * as are their enquiries; saved homes and sessions are removed with the account.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;
  if (new URL(request.url).searchParams.get("confirm") !== "delete") return NextResponse.json({ error: "Explicit delete confirmation is required." }, { status: 400 });
  try {
    const { id } = await params;
    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, disabledAt: true, email: true } });
    if (!target) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const denied = await checkAccountChange(gate.principal!, target, { delete: true });
    if (denied) return NextResponse.json({ error: denied }, { status: denied.startsWith("This is the last") ? 409 : 403 });
    await prisma.user.delete({ where: { id } });
    await logAction(gate.principal!.id, "user.delete", "User", id, { email: target.email, role: target.role });
    return NextResponse.json({ message: "Account deleted." });
  } catch {
    return NextResponse.json({ error: "Account could not be deleted." }, { status: 503 });
  }
}
