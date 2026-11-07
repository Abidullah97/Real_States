import { NextResponse } from "next/server";
import { currentPrincipal } from "@/lib/authorization";
import { notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { overLimit } from "@/lib/rate-limit";
import { agentApplicationSchema } from "@/lib/validation";

/** A signed-in member applies to become an agent. An administrator approves or rejects the application. */
export async function POST(request: Request) {
  try {
    const user = await currentPrincipal();
    if (!user) return NextResponse.json({ error: "Sign in to apply." }, { status: 401 });
    if (user.role === "AGENT" || user.role === "ADMIN" || user.role === "SUPER_ADMIN") return NextResponse.json({ error: "Your account already has agent or administrator access." }, { status: 409 });
    if (await overLimit(`agent-application:${user.id}`, 3, 24 * 60 * 60_000)) return NextResponse.json({ error: "Please wait before applying again." }, { status: 429 });
    const parsed = agentApplicationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Please complete every field. Your bio needs at least 30 characters." }, { status: 400 });
    const existing = await prisma.agentProfile.findUnique({ where: { userId: user.id }, select: { status: true } });
    if (existing?.status === "PENDING") return NextResponse.json({ error: "Your application is already being reviewed." }, { status: 409 });
    const data = { ...parsed.data, status: "PENDING" as const, appliedAt: new Date(), reviewedAt: null, rejectionReason: null };
    await prisma.agentProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
    await notifyAdmins("agent_application", `Agent application: ${user.name || user.email}`, `${parsed.data.specialization} · ${parsed.data.location}`, "/admin/agents?status=PENDING");
    return NextResponse.json({ message: "Application submitted. We’ll review it and let you know." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Your application could not be submitted." }, { status: 503 });
  }
}
